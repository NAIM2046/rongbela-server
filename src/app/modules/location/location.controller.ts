import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { LocationService } from "./location.service";

const getAllLocations = catchAsync(async (req: Request, res: Response) => {
  const result = await LocationService.getAllLocationsHierarchy();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Location hierarchy data retrieved successfully!",
    data: result,
  });
});

export const LocationController = {
  getAllLocations,
};