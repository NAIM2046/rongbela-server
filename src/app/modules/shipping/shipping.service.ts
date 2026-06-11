
import httpStatus from "http-status";
import { prisma } from "../../../shared/prisma";
import { ShippingConfiguration } from "@prisma/client";
import ApiError from "../../error/ApiError";


/**
 * সব শিপিং কনফিগারেশন ফেস করা
 */
const getAllShippingConfigs = async (): Promise<ShippingConfiguration[]> => {
  try {
    const result = await prisma.shippingConfiguration.findMany({
      orderBy: {
        baseCharge: "asc", // কম চার্জের জোনগুলো আগে দেখাবে
      },
    });
    return result;
  } catch (error: any) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Failed to fetch shipping configurations"
    );
  }
};

/**
 * নির্দিষ্ট একটি কনফিগারेशन আপডেট করা
 */
const updateShippingConfig = async (
  id: string,
  payload: Partial<ShippingConfiguration>
): Promise<ShippingConfiguration> => {
  try {
    // ১. ডাটাবেজে কনফিগারেশনটি আছে কি না চেক করা
    const isExist = await prisma.shippingConfiguration.findUnique({
      where: { id },
    });

    if (!isExist) {
      throw new ApiError(httpStatus.NOT_FOUND, "Shipping configuration not found");
    }

    // ২. ডেটা আপডেট করা
    const result = await prisma.shippingConfiguration.update({
      where: { id },
      data: payload,
    });

    return result;
  } catch (error: any) {
    // যদি আমাদের কাস্টম ৪MD/৪0৪ এরর হয়, সেটাকে সরাসরি পাস করে দেওয়া
    if (error instanceof ApiError) throw error;

    // Prisma P2002: ইউনিক কনস্ট্রেইন্ট ফেল করলে (যদি এমন জোনটাইপ দেওয়া হয় যা অলরেডি ডাটাবেজে আছে)
    if (error.code === "P2002") {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "A shipping configuration for this zone already exists"
      );
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Failed to update shipping configuration"
    );
  }
};

/**
 * নতুন শিপিং কনফিগারেশন ক্রিয়েট করা
 */
const createInitialShippingConfig = async (
  payload: ShippingConfiguration
): Promise<ShippingConfiguration> => {
  try {
    const result = await prisma.shippingConfiguration.create({
      data: payload,
    });
    return result;
  } catch (error: any) {
    // জোন ডুপ্লিকেট এন্ট্রি ঠেকাতে চেক
    if (error.code === "P2002") {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "A shipping configuration for this zone already exists"
      );
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Failed to create shipping configuration"
    );
  }
};


export const ShippingService = {
  getAllShippingConfigs,
  updateShippingConfig,
  createInitialShippingConfig,
};