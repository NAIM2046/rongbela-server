import { Request, Response } from "express";
import httpStatus from "http-status";
import { BannerService } from "./banner.service";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";



// Create Banner Controller
const createBanner = catchAsync(async (req: Request, res: Response) => {
  // বডি থেকে ডাটা নেওয়া হচ্ছে
  const result = await BannerService.createBanner(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Banner created successfully",
    data: result,
  });
});

// Get All Banners Controller
const getAllBanners = catchAsync(async (req: Request, res: Response) => {
  const result = await BannerService.getAllBanners();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Banners retrieved successfully",
    data: result,
  });
});

// Delete Banner Controller
const deleteBanner = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await BannerService.deleteBanner(id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Banner deleted successfully",
    data: result,
  });
});

// Update Banner Controller
const updateBanner = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await BannerService.updateBanner(id as string, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Banner updated successfully",
    data: result,
  });
});


export const BannerController = {
  createBanner,
  getAllBanners,
  deleteBanner,
  updateBanner,
};