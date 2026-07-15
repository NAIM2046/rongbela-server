import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { CouponService } from "./coupon.service";
import httpStatus from "http-status";

const createCoupon = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponService.createCoupon(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Coupon created successfully",
    data: result,
  });
});

const getAllCoupons = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponService.getAllCoupons();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Coupons list retrieved successfully",
    data: result,
  });
});

const deleteCoupon = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await CouponService.deleteCoupon(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Coupon deleted successfully",
    data: result,
  });
});

const validateCoupon = catchAsync(async (req: Request, res: Response) => {
  const code = req.params.code as string;
  const result = await CouponService.validateCoupon(code);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Coupon validated successfully",
    data: result,
  });
});

export const CouponController = {
  createCoupon,
  getAllCoupons,
  deleteCoupon,
  validateCoupon,
};
