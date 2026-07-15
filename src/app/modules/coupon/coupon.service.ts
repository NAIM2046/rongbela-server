import { prisma } from "../../../shared/prisma";
import ApiError from "../../error/ApiError";
import httpStatus from "http-status";

const createCoupon = async (payload: { code: string; discountPercent: number }) => {
  try {
    const codeUpper = payload.code.trim().toUpperCase();

    const existing = await prisma.coupon.findUnique({
      where: { code: codeUpper },
    });

    if (existing) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Coupon code already exists");
    }

    return await prisma.coupon.create({
      data: {
        code: codeUpper,
        discountPercent: payload.discountPercent,
        isActive: true,
      },
    });
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Failed to create new coupon"
    );
  }
};

const getAllCoupons = async () => {
  try {
    return await prisma.coupon.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (error: any) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Failed to retrieve coupons list"
    );
  }
};

const deleteCoupon = async (id: string) => {
  try {
    const existing = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ApiError(httpStatus.NOT_FOUND, "Coupon not found");
    }

    await prisma.coupon.delete({
      where: { id },
    });

    return { success: true };
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Failed to delete coupon"
    );
  }
};

const validateCoupon = async (code: string) => {
  try {
    const codeUpper = code.trim().toUpperCase();

    const coupon = await prisma.coupon.findUnique({
      where: { code: codeUpper },
    });

    if (!coupon) {
      throw new ApiError(httpStatus.NOT_FOUND, "Invalid coupon code");
    }

    if (!coupon.isActive) {
      throw new ApiError(httpStatus.BAD_REQUEST, "This coupon code is inactive");
    }

    return {
      valid: true,
      code: coupon.code,
      discountPercent: coupon.discountPercent,
    };
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Failed to validate coupon code"
    );
  }
};

export const CouponService = {
  createCoupon,
  getAllCoupons,
  deleteCoupon,
  validateCoupon,
};
