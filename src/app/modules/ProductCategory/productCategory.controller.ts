import { Request, Response } from "express";

import { productCategoryService } from "./productCategory.services";


import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import { CategoryValidation } from "./productCategory.validation";
import sendResponse from "../../../shared/sendResponse";


export const createCategory = catchAsync(async (req: Request, res: Response) => {
    await CategoryValidation.createCategoryZodSchema.parseAsync({
        body: req.body
    });
    //console.log(req.body)
    const result = await productCategoryService.createCategory(req.body)
    sendResponse(res, {
        statusCode: httpStatus.OK, // অথবা 200
        success: true,
        message: "Category created successfully",
        data: result,
    })
})

export const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await productCategoryService.getAllCategories();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Categories fetched successfully",
    data: result,
  });
});

// --- Get Single ---
export const getCategoryById = catchAsync(async (req: Request, res: Response) => {
  const result = await productCategoryService.getCategoryById(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category fetched successfully",
    data: result,
  });
});

// --- Update ---
export const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await productCategoryService.updateCategory(id as string, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category updated successfully",
    data: result,
  });
});

// --- Delete ---
export const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await productCategoryService.deleteCategory(id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category deleted successfully",
    data: result,
  });
});