import { Prisma } from "@prisma/client";
import { prisma } from "../../../shared/prisma";
import ApiError from "../../error/ApiError";
export interface ICreateProductPayload {
  title: string;
  description?: string;
  categoryId: string;
  specifications?: Record<string, any>;
  price?: Number;
  images: string[];
}

const generateSlug = (name: string): string => {
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const uniqueSuffix =
    Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
  return `${baseSlug}-${uniqueSuffix}`;
};

export const createProductService = async (
  userId: string,
  payload: ICreateProductPayload,
) => {
  try {
    const slug = generateSlug(payload.title);

    const product = await prisma.product.create({
      data: {
        title: payload.title,
        slug: slug,
        description: payload.description,
        categoryId: payload.categoryId,
        specifications: payload.specifications || {},
        artistId: userId,
        isActive: true,
        price: Number(payload.price) || 0,

        images: {
          create: payload.images.map((url, index) => ({
            url: url,
            displayOrder: index,
            isPrimary: index === 0,
          })),
        },
      },
      include: {
        images: true,
      },
    });

    return product;
  } catch (error: any) {
    if (error.code === "P2002")
      throw new ApiError(409, "Product name already exists!");
    if (error.code === "P2003") throw new ApiError(400, "Invalid Category ID.");
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
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const { searchTerm, categoryId } = filters;

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

export const updateProduct = async (
  productId: string,
  payload: IUpdateProductPayload,
) => {
  try {
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      throw new ApiError(404, "Product not found!");
    }

    const updateData: Prisma.ProductUpdateInput = {
      description: payload.description,
      specifications: payload.specifications || undefined,
      sellType: payload.sellType,
      price: payload.price,
      isActive: payload.isActive,
    };

    if (payload.title) {
      updateData.title = payload.title;
      updateData.slug = generateSlug(payload.title);
    }

    if (payload.categoryId) {
      updateData.category = {
        connect: { id: payload.categoryId },
      };
    }

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
    if (error.code === "P2002")
      throw new ApiError(409, "Product name/slug already exists!");
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
        isActive: false,
      },
    });

    return deletedProduct;
  } catch (error: any) {
    throw new ApiError(500, error.message || "Failed to delete product");
  }
};

export const getCategoryWiseProducts = async (categorySlug: string) => {
  console.log({ categorySlug });
  try {
    const result = await prisma.product.findMany({
      where: {
        category: {
          slug: categorySlug,
        },
      },
      select: {
        id: true,
        category: {
          select: {
            slug: true,
          },
        },
        images: true,
        title: true,
        price: true,
        description: true,
        slug: true
      },
    });

    return result;
  } catch (error: any) {
    throw new ApiError(500, error.message || "Failed to delete product");
  }
};

export const getProductBySlug = async (slug: string) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: slug },
      include: {
        category: true,
        images: {
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    if (!product) {
      throw new ApiError(404, "Product not found!");
    }

    return product;
  } catch (error: any) {
    if (error instanceof ApiError || error.statusCode) {
      throw error;
    }
    throw new ApiError(500, error.message || "Failed to fetch product by slug");
  }
};

export const ProductServices = {
  getCategoryWiseProducts,
};
