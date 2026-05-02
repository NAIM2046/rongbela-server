import { Prisma } from "@prisma/client";
import { prisma } from "../../../shared/prisma";
import ApiError from "../../error/ApiError";

// ১. পেলোড ইন্টারফেস যেখানে images এর array থাকবে
export interface ICreateProductPayload {
  title: string;
  description?: string;
  categoryId: string;
  specifications?: Record<string, any>;
  price?: Number
  images: string[]; // ইমেজ URL-গুলোর array (e.g., ["url1.jpg", "url2.jpg"])
}

const generateSlug = (name: string): string => {
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
  return `${baseSlug}-${uniqueSuffix}`;
};

export const createProductService = async (userId: string, payload: ICreateProductPayload) => {
  try {
    const slug = generateSlug(payload.title);

    // [A] Create Product and Images together using Nested Write
    const product = await prisma.product.create({
      data: {
        title: payload.title,
        slug: slug,
        description: payload.description,
        categoryId: payload.categoryId,
        specifications: payload.specifications || {},
        artistId: userId,
        isActive: true, 
        price: Number( payload.price )||0 ,

        // ২. ইমেজগুলো একসাথে ক্রিয়েট করা হচ্ছে
        images: {
          create: payload.images.map((url, index) => ({
            url: url,
            displayOrder: index, // ০, ১, ২ এভাবে সিরিয়াল হবে
            isPrimary: index === 0, // প্রথম ইমেজটিকে অটোমেটিক Primary সেট করা হচ্ছে
          })),
        },
      },
      // যদি চান আউটপুটে ইমেজগুলোও দেখাবে, তবে include ব্যবহার করুন
      include: {
        images: true,
      },
    });

    return product;
    
  } catch (error: any) {
    if (error.code === 'P2002') throw new ApiError(409, "Product name already exists!");
    if (error.code === 'P2003') throw new ApiError(400, "Invalid Category ID.");
    throw new ApiError(500, error.message || "Failed to create product");
  }
};

export interface IProductFilters {
  page?: number;
  limit?: number;
  searchTerm?: string;
  categoryId?: string;
}

export const getProducts = async (filters: IProductFilters) => {
  try {
    // ১. ডিফল্ট ভ্যালু সেট করা
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const { searchTerm, categoryId } = filters;

    // ২. ডাইনামিক Where কন্ডিশন তৈরি করা
    const whereConditions: Prisma.ProductWhereInput = {};

    if (searchTerm) {
      whereConditions.OR = [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      whereConditions.categoryId = categoryId;
    }

    // ৩. ডাটাবেস থেকে ডাটা এবং টোটাল কাউন্ট একসাথে ফেচ করা (Promise.all ব্যবহার করে)
    // 💡 এখানে prisma.$transaction এর বদলে Promise.all দেওয়া হয়েছে
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereConditions,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc", 
        },
        include: {
          category: {
            select: {
              name: true, 
            },
          },
          images: {
            orderBy: {
              displayOrder: "asc", 
            },
          },
        },
      }),
      prisma.product.count({
        where: whereConditions, 
      }),
    ]);

    // ৪. রেসপন্স রিটার্ন করা (Pagination Meta Data সহ)
    const totalPages = Math.ceil(total / limit);

    return {
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
      data: products,
    };
  } catch (error: any) {
    throw new ApiError(500, error.message || "Failed to fetch products");
  }
};

export interface IUpdateProductPayload {
  title?: string;
  description?: string;
  categoryId?: string;
  specifications?: Record<string, any>;
  sellType?: "FIXED_PRICE" | "COLLECTIVE";
  price?: number;
  isActive?: boolean;
  images?: string[]; // নতুন ইমেজের লিস্ট
}




// ==========================================
// 1. UPDATE PRODUCT FUNCTION
// ==========================================
export const updateProduct = async (productId: string, payload: IUpdateProductPayload) => {
  try {
    // ১. প্রোডাক্টটি আগে ডাটাবেসে আছে কি না তা চেক করা
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      throw new ApiError(404, "Product not found!");
    }

    // ২. Prisma Update ডাটা অবজেক্ট তৈরি করা
    const updateData: Prisma.ProductUpdateInput = {
      description: payload.description,
      specifications: payload.specifications || undefined, // undefined দিলে Prisma ফিল্ডটি ইগনোর করবে
      sellType: payload.sellType,
      price: payload.price,
      isActive: payload.isActive,
    };

    // ৩. যদি Title আপডেট হয়, তবে নতুন Slug জেনারেট করা (SEO এর জন্য চাইলে স্কিপও করতে পারেন)
    if (payload.title) {
      updateData.title = payload.title;
      updateData.slug = generateSlug(payload.title);
    }

    // ৪. যদি Category আপডেট হয়
    if (payload.categoryId) {
      updateData.category = {
        connect: { id: payload.categoryId },
      };
    }

    // ৫. Image Update Logic (Replace All Approach)
    if (payload.images && payload.images.length > 0) {
      updateData.images = {
        deleteMany: {}, // আগের সব ইমেজ ডিলিট করে দিবে
        create: payload.images.map((url, index) => ({
          url: url,
          displayOrder: index,
          isPrimary: index === 0,
        })), // নতুন ইমেজগুলো তৈরি করবে
      };
    }

    // ৬. ডাটাবেসে আপডেট রান করা
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        images: {
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    return updatedProduct;

  } catch (error: any) {
    if (error.code === 'P2002') throw new ApiError(409, "Product name/slug already exists!");
    throw new ApiError(500, error.message || "Failed to update product");
  }
};


// ==========================================
// 2. DELETE PRODUCT FUNCTION
// ==========================================
export const deleteProduct = async (productId: string) => {
  try {
  
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      throw new ApiError(404, "Product not found!");
    }

   
    const deletedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        isActive:false
      }
    });

    return deletedProduct;

  } catch (error: any) {
    throw new ApiError(500, error.message || "Failed to delete product");
  }
};

// ==========================================
// 3. GET PRODUCT BY SLUG FUNCTION
// ==========================================
export const getProductBySlug = async (slug: string) => {
  try {
    // ১. ডাটাবেস থেকে Slug দিয়ে প্রোডাক্ট খোঁজা
    const product = await prisma.product.findUnique({
      where: { slug: slug },
      include: {
        category: true, // ক্যাটাগরির বিস্তারিত তথ্য নিয়ে আসার জন্য
        images: {
          orderBy: { displayOrder: "asc" }, // ছবিগুলো ক্রমানুসারে সাজিয়ে আনার জন্য
        },
      },
    });

    // ২. প্রোডাক্ট না পাওয়া গেলে 404 এরর থ্রো করা
    if (!product) {
      throw new ApiError(404, "Product not found!");
    }

    // ৩. প্রোডাক্ট পাওয়া গেলে তা রিটার্ন করা
    return product;

  } catch (error: any) {
    // যদি কাস্টম ApiError হয় (যেমন উপরের 404), তাহলে সেটাকেই থ্রো করবে
    if (error instanceof ApiError || error.statusCode) {
      throw error;
    }
    // অন্যথায় 500 ইন্টারনাল সার্ভার এরর থ্রো করবে
    throw new ApiError(500, error.message || "Failed to fetch product by slug");
  }
};