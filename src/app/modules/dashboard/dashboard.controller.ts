import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { DashboardServices } from "./dashboard.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardServices.getDashboardStats();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dashboard statistics retrieved successfully.",
    data: result,
  });
});

export const DashboardControllers = {
  getDashboardStats,
};
