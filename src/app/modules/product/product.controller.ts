import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import ApiError from "../../error/ApiError";
import {
  createProductService,
  deleteProduct,
  getProductBySlug,
  getProducts,
  ProductServices,
  updateProduct,
} from "./product.service";
import sendResponse from "../../../shared/sendResponse";

export const createProduct = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  if (!userId) {
    throw new ApiError(404, "User not authenticated");
  }

  const result = await createProductService(userId, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product created successfully!",
    data: result,
  });
});

export const getAllProducts = catchAsync(
  async (req: Request, res: Response) => {
    // Query প্যারামিটারগুলো রিসিভ করা (যেমন: ?page=1&limit=10&searchTerm=art)
    const filters = {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      searchTerm: req.query.searchTerm as string | undefined,
      categoryId: req.query.categoryId as string | undefined,
    };

    const result = await getProducts(filters);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Products fetched successfully!",
      meta: result.meta, // পেজিনেশনের মেটা ডেটা
      data: result.data, // প্রোডাক্টের লিস্ট
    });
  },
);

// ==========================================
// 2. UPDATE PRODUCT CONTROLLER
// ==========================================
export const updateSingleProduct = catchAsync(
  async (req: Request, res: Response) => {
    const { productId } = req.params; // URL থেকে ID নেওয়া (যেমন: /api/products/:productId)

    if (!productId) {
      throw new ApiError(400, "Product ID is required");
    }

    const result = await updateProduct(productId as string, req.body);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Product updated successfully!",
      data: result,
    });
  },
);

export const deleteSingleProduct = catchAsync(
  async (req: Request, res: Response) => {
    const { productId } = req.params; // URL থেকে ID নেওয়া

    if (!productId) {
      throw new ApiError(400, "Product ID is required");
    }

    const result = await deleteProduct(productId as string);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Product deleted successfully!",
      data: result,
    });
  },
);

const getCategoryWiseProducts = catchAsync(
  async (req: Request, res: Response) => {
    const { categorySlug } = req.params;
    if (!categorySlug) {
      throw new ApiError(400, "Product ID is required");
    }

    const result = await ProductServices.getCategoryWiseProducts(
      categorySlug as string,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Product deleted successfully!",
      data: result,
    });
  },
);

const getSingleProductBySlug = catchAsync(
  async (req: Request, res: Response) => {
    const { slug } = req.params;

    if (!slug) {
      throw new ApiError(400, "Product Slug is required");
    }
    const result = await getProductBySlug(slug as string);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Product fetched successfully!",
      data: result,
    });
  },
);

export const ProductControllers = {
  getSingleProductBySlug,
  getCategoryWiseProducts,
};
