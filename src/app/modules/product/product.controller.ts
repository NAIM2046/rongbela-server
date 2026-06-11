import { Request, Response } from "express";
import { productService } from "./product.service";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import ApiError from "../../error/ApiError";


// 1. Create Product (Draft)
export const createProduct = catchAsync(async (req: Request, res: Response) => {
  // সার্ভিস লেয়ার স্কিমা অনুযায়ী এখন সরাসরি বডি পাস করলেই হবে
  const result = await productService.createProduct(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product draft created successfully!",
    data: result,
  });
});

// 2. Product Publish
export const publishProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await productService.publishProduct(
    id as string,
    req.body
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product published successfully!",
    data: result,
  });
});

// 3. Get Product By ID
export const getProductById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await productService.getProductById(id as string);

  if (!result) {
    throw new ApiError(404, "Product not found");
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product retrieved successfully!",
    data: result,
  });
});

// 4. Update Basic Info (Title, Description, Price etc.)
export const updateProductInfo = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await productService.updateProductInfo(
    id as string,
    req.body
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product basic info updated successfully!",
    data: result,
  });
});

// 5. Manage Variants (Price, Stock, Add/Remove Variants)
export const manageVariants = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await productService.manageVariants(id as string, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product variants updated successfully!",
    data: result,
  });
});

// 6. Add Image
export const addProductImage = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { url } = req.body;

  const result = await productService.addProductImageIntoDB(id as string, {
    url,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Image added successfully",
    data: result,
  });
});

// 7. Remove Images
export const removeImages = catchAsync(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { imageIds } = req.body;

  const result = await productService.removeImagesFromDB(productId as string, {
    imageIds,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Images removed successfully",
    data: result,
  });
});

// 8. Reorder Images
export const reorderImages = catchAsync(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { imageIds } = req.body;

  const result = await productService.reorderImagesInDB(productId as string, {
    imageIds,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Images reordered successfully",
    data: result,
  });
});

// 9. Update Status (Active / Inactive)
export const updateStatus = catchAsync(async (req: Request, res: Response) => {
 

  const { id } = req.params;
  // সার্ভিস মেথড থেকে সাবস্ক্রিপশন এবং ইউজার ভ্যালিডেশন বাদ দেওয়া হয়েছে
  const result = await productService.updateStatus(
    id as string,
    req.body.isActive
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product status updated successfully!",
    data: result,
  });
});

// 10. Delete Product (Hard Delete according to schema)
export const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await productService.deleteProduct(id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product deleted successfully!",
    data: result,
  });
});

export const getAllProductsForAdmin = catchAsync(async (req: Request, res: Response) => {
  const query = req.query;

  const result = await productService.getAllProductsForAdmin(query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Admin products retrieved successfully!",
    data: result.products,
    meta: result.meta,
  });
});

export const getHomeProducts = catchAsync(async (req: Request, res: Response) => {
  // ফ্রন্টএন্ড থেকে আসা কুয়েরি প্যারামিটার রিসিভ করা হচ্ছে
  const query = req.query;
  
  // সার্ভিস লেয়ারে কুয়েরি পাস করা হলো
  const result = await productService.getHomeProducts(query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Products retrieved successfully!",
    data: result.products,
    meta: result.meta,
  });
});

export const getProductBySlug = catchAsync(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const result = await productService.getProductBySlug(slug as string);

  if (!result) {
    throw new ApiError(404, "Product not found");
  }
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product retrieved successfully!",
    data: result,
  });
}
);
