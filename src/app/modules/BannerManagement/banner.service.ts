

import httpStatus from "http-status";
import { prisma } from "../../../shared/prisma";
import ApiError from "../../error/ApiError";


const createBanner = async (payload: { title?: string; imageUrl: string; link?: string; displayOrder?: number }) => {
  try {
    const result = await prisma.banner.create({
      data: payload,
    });
    return result;
  } catch (error) {
    console.error("createBanner Service Error:", error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to create banner");
  }
};


const getAllBanners = async () => {
  try {
    const result = await prisma.banner.findMany({
      where: {
        isActive: true, 
      },
      orderBy: {
        displayOrder: "asc", 
      },
      select: {
        id: true,
        title: true,
        imageUrl: true,
          link: true,
        displayOrder:true
      },
    });
    return result;
  } catch (error) {
    console.error("getAllBanners Service Error:", error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch banners");
  }
};


const deleteBanner = async (id: string) => {
  try {
    await prisma.banner.delete({
      where: { id },
    });
    return { message: "Banner deleted successfully" };
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to delete banner");
  }
};
const updateBanner = async (id: string, payload: { title?: string; imageUrl?: string; link?: string; displayOrder?: number }) => {
  try {
    const result = await prisma.banner.update({
      where: { id },
      data: payload,
    });
    return result;
  } catch (error) {
    console.error("updateBanner Service Error:", error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to update banner");
  }
};


export const BannerService = {
  createBanner,
  getAllBanners,
  deleteBanner,
  updateBanner,
};