import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ShippingService } from "./shipping.service";

const getAllConfigs = catchAsync(async (req: Request, res: Response) => {
  const result = await ShippingService.getAllShippingConfigs();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Shipping configurations retrieved successfully",
    data: result,
  });
});

const updateConfig = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const payload = req.body;

  const result = await ShippingService.updateShippingConfig(id as string, payload);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Shipping configuration updated successfully",
    data: result,
  });
});

const createConfig = catchAsync(async (req: Request, res: Response) => {
  const result = await ShippingService.createInitialShippingConfig(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Shipping configuration created successfully",
    data: result,
  });
});

export const ShippingController = {
  getAllConfigs,
  updateConfig,
  createConfig,
};