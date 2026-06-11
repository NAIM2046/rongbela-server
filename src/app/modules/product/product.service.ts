import { Prisma } from "@prisma/client";
import { prisma } from "../../../shared/prisma";
import ApiError from "../../error/ApiError";


const generateSlug = (title: string) => {
  if (!title) return "";

  return title
    .trim()
    // ১. শুধুমাত্র ইংরেজি বড় হাতের অক্ষরগুলোকে ছোট হাতের বানানো
    .replace(/[A-Z]/g, (match) => match.toLowerCase())
    
    // ২. 💡 ম্যাজিক ফিক্স: বাংলা বর্ণমালার রেঞ্জ (\u0980-\u09FF) সহ কার-চিহ্ন ও যুক্তাক্ষরকে সুরক্ষিত করা
    // এখানে আমরা ইংরেজি (a-z, 0-9) এবং সম্পূর্ণ বাংলা ব্লক একসাথে অ্যালাউ করছি
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, "-")
    
    // ৩. পাশাপাশি একাধিক ড্যাশ থাকলে একটি ড্যাশে রূপান্তর করা
    .replace(/-+/g, "-")
    
    // ৪. শুরুতে বা শেষে ড্যাশ থাকলে তা কেটে ফেলা
    .replace(/^-+|-+$/g, "");
};

// =================================================
// HELPER: UNIQUE SLUG GENERATOR
// =================================================
const generateUniqueSlug = async (title: string) => {
  let slug = generateSlug(title);
  const existingProduct = await prisma.product.findUnique({ where: { slug } });
  if (existingProduct) {
    slug = `${slug}-${Date.now()}`;
  }
  return slug;
};
interface ICreateProductPayload {
  title: string;
  description?: string;
  categoryId: string;
  specifications?: Record<string, any>;
  sellType?: "FIXED_PRICE" | "COLLECTIVE";
  
}


// =================================================
// 1. CREATE PRODUCT (DRAFT)
// =================================================
const createProduct = async (payload: ICreateProductPayload) => {
  try {
    const slug = await generateUniqueSlug(payload.title);

    const draftProduct = await prisma.product.create({
      data: {
        title: payload.title,
        slug: slug,
        description: payload.description,
        categoryId: payload.categoryId,
        specifications: payload.specifications || {},
        sellType: payload.sellType || "FIXED_PRICE",
       
        isActive: false, // ডিফল্ট ড্রাফট হিসেবে ইন-অ্যাক্টিভ থাকবে
      },
    });
    return draftProduct;
  } catch (error: any) {
    if (error.code === "P2002") throw new ApiError(409, "Product slug already exists!");
    if (error.code === "P2003") throw new ApiError(400, "Invalid Category ID.");
    throw new ApiError(500, error.message || "Failed to create draft product");
  }
};

// =================================================
// 2. PRODUCT PUBLISH
// =================================================
const publishProduct = async (draftProductId: string, finalPayload: any) => {
  try {
    const { images = [], variants = [] } = finalPayload;

    const existingDraft = await prisma.product.findUnique({
      where: { id: draftProductId },
    });

    if (!existingDraft) {
      throw new ApiError(404, "Draft product not found.");
    }

    // Database Transaction শুরু
    const result = await prisma.$transaction(async (tx) => {
      // ১. প্রোডাক্ট অ্যাক্টিভ করা এবং নতুন ইমেজ যোগ করা
      const updatedProduct = await tx.product.update({
        where: { id: draftProductId },
        data: {
          isActive: true, // Product Published!
          images: {
            deleteMany: {},
            create: images.map((url: string, index: number) => ({
              url: url,
              isPrimary: index === 0,
              displayOrder: index,
            })),
          },
        },
        include: { images: true },
      });

      // ২. ভ্যারিয়েন্ট তৈরি করা
      if (variants && variants.length > 0) {
        await tx.productVariant.deleteMany({
          where: { productId: draftProductId },
        });

        await Promise.all(
          variants.map(async (variant: any) => {
            let variantImageId: string | null = null;
            const { imageIndex, ...variantData } = variant;
             

            // ইমেজ ইনডেক্স থেকে আইডি ম্যাচ করা
            if (typeof imageIndex === "number" && updatedProduct.images[imageIndex]) {
              variantImageId = updatedProduct.images[imageIndex].id;
            }

            return tx.productVariant.create({
              data: {
                sku: variantData.sku,
                price: new Prisma.Decimal(variantData.price),
                discountPrice: variantData.discountPrice ? new Prisma.Decimal(variantData.discountPrice) : null,
                stock: variantData.stock || 0,
                attributes: variantData.attributes || {},
                weight: variantData.weight || 0.5,
                length: variantData.length || 10,
                width: variantData.width || 10,
                height: variantData.height || 5,
                productId: updatedProduct.id,
                imageId: variantImageId,
                isActive: true,
              },
            });
          }),
        );
      }

      return await tx.product.findUnique({
        where: { id: updatedProduct.id },
        include: { productVariants: true, images: true },
      });
    });

    return result;
  } catch (error: any) {
    if (error.code === "P2002") throw new ApiError(409, "SKU already exists!");
    throw new ApiError(500, error.message || "Failed to publish product");
  }
};
// =================================================
// 3. GET all products for admin with filters, pagination and search
// =================================================
export const getAllProductsForAdmin = async (query: any) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      categoryId,
      status,
      sortBy = "newest",
    } = query;

    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    // ডায়নামিক হোয়্যার কন্ডিশন তৈরি
    const whereConditions: Prisma.ProductWhereInput = {
      ...(status && { isActive: status === "active" }),
      ...(search && {
        OR: [
          { title: { contains: search as string, mode: "insensitive" } },
          { slug: { contains: search as string, mode: "insensitive" } },
        ],
      }),
      ...(categoryId && { categoryId: categoryId as string }),
    };

    // শর্টিং লজিক
    let orderBy: Prisma.ProductOrderByWithRelationInput = {};
    switch (sortBy) {
      case "title_asc":
        orderBy = { title: "asc" };
        break;
      case "newest":
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    // ডাটাবেজ থেকে ডাটা এবং টোটাল কাউন্ট এক সাথে আনা
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereConditions,
        skip: skip,
        take: limitNumber,
        orderBy: orderBy,
        include: {
          category: { select: { name: true } },
          images: { where: { isPrimary: true }, take: 1 }, // মেইন থাম্বনেইল ইমেজ
          productVariants: true, // 💡 স্কিমা অনুযায়ী ভ্যারিয়েন্ট ডাটা আনা হলো (স্টক ও প্রাইসের জন্য)
        },
      }),
      prisma.product.count({ where: whereConditions }),
    ]);

    return {
      products,
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
        hasNextPage: pageNumber * limitNumber < total,
        hasPrevPage: pageNumber > 1,
      },
    };
  } catch (error: any) {
    throw new Error(error.message || "Failed to fetch products for admin.");
  }
};

// =================================================
// 3. GET PRODUCT BY ID
// =================================================
const getProductById = async (productId: string) => {
  try {
    const result = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: {
          select: { id: true, name: true, slug: true, parentId: true },
        },
        images: {
          orderBy: { displayOrder: "asc" },
        },
        productVariants: {
          where: { isActive: true },
          include: {
            image: { select: { url: true } },
          },
        },
      },
    });

    if (!result) {
      throw new ApiError(404, "Product not found");
    }

    return result;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    if (error.code === "P2023") throw new ApiError(400, "Invalid Product ID format");
    throw new ApiError(500, "Error fetching product details");
  }
};

// =================================================
// 4. UPDATE BASIC INFO
// =================================================
const updateProductInfo = async (id: string, payload: any) => {
  try {
    const { title, description, specifications, categoryId, sellType } = payload;

    // ১. ডাইনামিক ডাটা অবজেক্ট তৈরি করা যাতে undefined বা ফালতু ডাটা ক্লীন করা যায়
    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (specifications !== undefined) updateData.specifications = specifications;
    
    // 🟢 sellType যদি পাঠানো হয় (এবং undefined না হয়) তবেই অ্যাড হবে
    if (sellType !== undefined) updateData.sellType = sellType;

    // 🟢 ক্যাটাগরি আইডি সরাসরি পাস না করে প্রিজমা রিলেশন দিয়ে কানেক্ট করা
    if (categoryId) {
      updateData.category = {
        connect: { id: categoryId },
      };
    }

    // ২. প্রিজমা কুয়েরি রান করা
    const result = await prisma.product.update({
      where: { id },
      data: updateData, // 👈 ফিক্সড এবং ফিল্টার্ড ডাটা অবজেক্ট
    });

    return {
      success: true,
      message: "Product info updated successfully",
      data: result,
    };
  } catch (error: any) {
    console.error("Prisma Update Error:", error);
    
    // প্রিজমা ফরেন-কী বা রিলেশন এরর হ্যান্ডলিং
    if (error.code === "P2025") throw new ApiError(404, "Product not found");
    if (error.code === "P2002") throw new ApiError(400, "Unique constraint failed");
    if (error.code === "P2003") throw new ApiError(400, "Invalid Category ID or relation restriction");
    
    throw new ApiError(500, error.message || "Failed to update product info");
  }
};

// =================================================
// 5. MANAGE VARIANTS
// =================================================
export const manageVariants = async (productId: string, payload: any) => {
  const { added, updated, deletedIds } = payload;

  try {
    const result = await prisma.$transaction(
      async (tx: any) => {
        // --- A. DELETE ---
        if (deletedIds && deletedIds.length > 0) {
          await tx.productVariant.deleteMany({
            where: {
              id: { in: deletedIds },
              productId: productId,
            },
          });
        }

        // --- B. UPDATE ---
        if (updated && updated.length > 0) {
          await Promise.all(
            updated.map((variant: any) => {
              return tx.productVariant.update({
                where: { id: variant.id },
                data: {
                  sku: variant.sku,
                  price: variant.price ? new Prisma.Decimal(variant.price) : undefined,
                  discountPrice: variant.discountPrice ? new Prisma.Decimal(variant.discountPrice) : null,
                  stock: variant.stock,
                  weight: variant.weight,
                  length: variant.length,
                  width: variant.width,
                  height: variant.height,
                  attributes: variant.attributes,
                  imageId: variant.imageId || null,
                  isActive: variant.isActive,
                },
              });
            }),
          );
        }

        // --- C. CREATE ---
        if (added && added.length > 0) {
          const newVariants = added.map((v: any) => ({
            productId: productId,
            sku: v.sku,
            price: new Prisma.Decimal(v.price),
            discountPrice: v.discountPrice ? new Prisma.Decimal(v.discountPrice) : null,
            stock: v.stock || 0,
            weight: v.weight || 0.5,
            length: v.length || 10,
            width: v.width || 10,
            height: v.height || 5,
            attributes: v.attributes || {},
            imageId: v.imageId || null,
            isActive: true,
          }));

          await tx.productVariant.createMany({
            data: newVariants,
          });
        }

        return {
          success: true,
          message: "Variants synced successfully",
        };
      },
      { maxWait: 5000, timeout: 10000 },
    );

    return result;
  } catch (error: any) {
    if (error.code === "P2002") throw new ApiError(409, "SKU already exists!");
    if (error.code === "P2003") throw new ApiError(400, "Invalid references provided.");
    throw new ApiError(500, error.message || "Failed to sync variants");
  }
};

// =================================================
// 6. IMAGE MANAGEMENT
// =================================================
const addProductImageIntoDB = async (productId: string, payload: { url: string }) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });

    if (!product) throw new ApiError(404, "Product not found");

    const lastImage = await prisma.productImage.findFirst({
      where: { productId },
      orderBy: { displayOrder: "desc" },
    });

    const newDisplayOrder = lastImage ? lastImage.displayOrder + 1 : 0;
    const isPrimary = product.images.length === 0;

    return await prisma.productImage.create({
      data: {
        productId,
        url: payload.url,
        displayOrder: newDisplayOrder,
        isPrimary: isPrimary,
      },
    });
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Failed to add image");
  }
};

const removeImagesFromDB = async (productId: string, payload: { imageIds: string[] }) => {
  try {
    const result = await prisma.productImage.deleteMany({
      where: {
        id: { in: payload.imageIds },
        productId: productId,
      },
    });

    if (result.count === 0) throw new ApiError(400, "No images found to delete");
    return result;
  } catch (error: any) {
    throw new ApiError(500, "Failed to delete images");
  }
};

const reorderImagesInDB = async (productId: string, payload: { imageIds: string[] }) => {
  try {
    const { imageIds } = payload;
    await prisma.$transaction(
      imageIds.map((id, index) =>
        prisma.productImage.update({
          where: { id: id, productId: productId },
          data: {
            displayOrder: index,
            isPrimary: index === 0,
          },
        }),
      ),
    );
    return { success: true, message: "Reordered successfully" };
  } catch (error: any) {
    if (error.code === "P2025") throw new ApiError(400, "Invalid image reference.");
    throw new ApiError(500, "Failed to reorder images");
  }
};

// =================================================
// 7. STATUS & HARD DELETE
// =================================================
const updateStatus = async (id: string, isActive: boolean) => {
  try {
    return await prisma.product.update({
      where: { id },
      data: { isActive },
    });
  } catch (error: any) {
    if (error.code === "P2025") throw new ApiError(404, "Product not found");
    throw new ApiError(500, "Failed to update status");
  }
};

const deleteProduct = async (id: string) => {
  try {
    const isExist = await prisma.product.findUnique({ where: { id } });
    if (!isExist) throw new ApiError(404, "Product not found!");

    return await prisma.product.delete({
      where: { id },
    });
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Failed to delete product");
  }
};

export const getHomeProducts = async (query: any = {}) => {
  try {
    const {
      page = 1,
      limit = 8,
      search = "",
      categoryId,
    } = query;

    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 8;
    const skip = (pageNumber - 1) * limitNumber;

    // ১. হোয়্যার কন্ডিশন (শুধু একটিভ প্রোডাক্ট দেখাবে)
    const whereConditions: Prisma.ProductWhereInput = {
      isActive: true,
      ...(search && {
        OR: [
          { title: { contains: search as string, mode: "insensitive" } },
          { slug: { contains: search as string, mode: "insensitive" } },
        ],
      }),
      ...(categoryId && { categoryId: categoryId as string }),
    };

    // ২. ডাটাবেজ কোয়েরি এবং টোটাল কাউন্ট এক সাথে রান করা
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereConditions,
        skip: skip,
        take: limitNumber,
        // 🟢 সর্টিং: প্রথমে ফিচার্ড প্রোডাক্ট, তারপর একদম নতুন প্রোডাক্টগুলো দেখাবে
        orderBy: [
          { isFeatured: "desc" },
          { createdAt: "desc" }
        ],
        // আপনার স্কিমা রিলেশন অনুযায়ী ডাটা ইনক্লুড করা হলো
        include: {
          category: {
            select: {
              name: true,
              slug: true,
            },
          },
          images: {
            where: { isPrimary: true }, // মেইন থাম্বনেইল ছবি
            take: 1,
            select: {
              url: true,
            },
          },
          productVariants: {
            where: { isActive: true },
            select: {
              price: true,
              discountPrice: true,
              stock: true,
              attributes: true,
            },
          },
        },
      }),
      prisma.product.count({ where: whereConditions }),
    ]);

    // ৩. ডাটা ফরম্যাটিং (ফ্রন্টএন্ডের সুবিধার জন্য সর্বনিম্ন দাম এবং ডিসকাউন্ট ক্যালকুলেট করে পাঠানো)
    const formattedProducts = products.map((product) => {
      const variants = product.productVariants;
      
      // ভ্যারিয়েন্টগুলোর মধ্য থেকে সর্বনিম্ন রেগুলার প্রাইস বের করা
      const basePrice = variants.length > 0 
        ? Math.min(...variants.map(v => Number(v.price))) 
        : 0;

      // ভ্যারিয়েন্টগুলোর মধ্য থেকে সর্বনিম্ন ডিসকাউন্ট প্রাইস বের করা (যদি থাকে)
      const validDiscountPrices = variants
        .map(v => (v.discountPrice ? Number(v.discountPrice) : null))
        .filter((p): p is number => p !== null && p > 0);

      const lowestDiscountPrice = validDiscountPrices.length > 0 
        ? Math.min(...validDiscountPrices) 
        : null;

      // টোটাল স্টক হিসাব করা (সব ভ্যারিয়েন্ট মিলিয়ে মোট কয়টা আছে)
      const totalStock = variants.reduce((acc, curr) => acc + curr.stock, 0);

      return {
        id: product.id,
        title: product.title,
        slug: product.slug,
        sellType: product.sellType,
        isFeatured: product.isFeatured,
        category: product.category,
        // প্রিলিমিনারি ইমেজের প্রথম ইউআরএল, না থাকলে নাল বা প্লেসহোল্ডার
        image: product.images[0]?.url || null, 
        price: lowestDiscountPrice || basePrice, // ডিসকাউন্ট থাকলে সেটা মেইন প্রাইস হবে
        oldPrice: lowestDiscountPrice ? basePrice : null, // ডিসকাউন্ট থাকলে আগের দাম ওল্ড প্রাইস হবে
        stock: totalStock,
        hasVariants: variants.length > 1,
      };
    });

    return {
      products: formattedProducts,
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
        hasNextPage: pageNumber * limitNumber < total,
        hasPrevPage: pageNumber > 1,
      },
    };
  } catch (error: any) {
    throw new ApiError(500, error.message || "Failed to fetch home products");
  }
};
export const getProductBySlug = async (slug: string) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug, isActive: true }, // লাইভ কাস্টমারদের জন্য শুধুমাত্র একটিভ প্রোডাক্ট দেখাবে
      include: {
        category: {
          select: { id: true, name: true, slug: true, parentId: true },
        },
        images: {
          orderBy: { displayOrder: "asc" },
          select: { id: true, url: true, isPrimary: true },
        },
        productVariants: {
          where: { isActive: true },
          include: {
            image: { select: { id: true, url: true } },
          },
        },
      },
    });

    if (!product) {
      throw new ApiError(404, "Product not found");
    }

    // 🟢 ফ্রন্টএন্ডের সুবিধার জন্য ভ্যারিয়েন্ট এবং অ্যাট্রিবিউট রি-ফরম্যাটিং লজিক
    const variants = product.productVariants;

    // ১. মিনিমাম এবং ম্যাক্সিমাম প্রাইজ রেঞ্জ বের করা (যেমন: ৳৩০০ - ৳৫০০ দেখানোর জন্য)
    const prices = variants.map((v) => Number(v.price));
    const discountPrices = variants
      .map((v) => (v.discountPrice ? Number(v.discountPrice) : null))
      .filter((p): p is number => p !== null && p > 0);

    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    
    const minDiscountPrice = discountPrices.length > 0 ? Math.min(...discountPrices) : null;

    // ২. ইউনিক অ্যাট্রিবিউট অপশনগুলো আলাদা করা (যাতে ফ্রন্টএন্ডে ডাইনামিক ফিল্টার/ড্রপডাউন বানানো যায়)
    // উদাহরণ রেসপন্স: { color: ["Red", "Blue"], size: ["XL", "XXL"] }
    const availableAttributes: Record<string, string[]> = {};
    
    variants.forEach((variant) => {
      if (variant.attributes && typeof variant.attributes === "object") {
        Object.entries(variant.attributes as Record<string, string>).forEach(([key, value]) => {
          if (!availableAttributes[key]) {
            availableAttributes[key] = [];
          }
          if (!availableAttributes[key].includes(value)) {
            availableAttributes[key].push(value);
          }
        });
      }
    });

    // ৩. টোটাল স্টক ক্যালকুলেশন
    const totalStock = variants.reduce((acc, curr) => acc + curr.stock, 0);

    // ৪. ফাইনাল প্রফেশনাল রেসপন্স ফরম্যাট
    return {
      id: product.id,
      title: product.title,
      slug: product.slug,
      description: product.description,
      specifications: product.specifications,
      sellType: product.sellType,
      isFeatured: product.isFeatured,
      category: product.category,
      
      // ইমেজ গ্যালারি
      images: product.images, 
      
      // ফ্রন্টএন্ড ডিসপ্লে প্রাইস লজিক
      priceInfo: {
        hasVariants: variants.length > 1,
        minPrice,
        maxPrice,
        minDiscountPrice,
        // যদি একটিই ভ্যারিয়েন্ট থাকে তবে ডিরেক্ট দেখানোর জন্য শর্টকাট
        displayPrice: minDiscountPrice || minPrice,
        displayOldPrice: minDiscountPrice ? minPrice : null,
      },
      
      // স্টক স্ট্যাটাস
      stockInfo: {
        totalStock,
        inStock: totalStock > 0,
      },

      // ডাইনামিক ফিল্টার/ড্রপডাউন অপশন (কালার, সাইজ ইত্যাদি সিলেক্ট করার জন্য)
      availableAttributes,

      // একচুয়াল ভ্যারিয়েন্ট লিস্ট (ইউজার যখন সাইজ/কালার সিলেক্ট করবে, ফ্রন্টএন্ড এটার সাথে ম্যাচ করবে)
      variants: variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        price: Number(v.price),
        discountPrice: v.discountPrice ? Number(v.discountPrice) : null,
        stock: v.stock,
        attributes: v.attributes,
        variantImage: v.image?.url || null,
      })),
    };

  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    if (error.code === "P2023") throw new ApiError(400, "Invalid Product Slug format");
    throw new ApiError(500, "Error fetching product details");
  }
};
// =================================================
// EXPORTS
// =================================================
export const productService = {
  createProduct,
  publishProduct,
  updateProductInfo,
  manageVariants,
  addProductImageIntoDB,
  reorderImagesInDB,
  removeImagesFromDB,
  updateStatus,
  deleteProduct,
  getProductById,
  getAllProductsForAdmin,
  getHomeProducts,
  getProductBySlug,
};