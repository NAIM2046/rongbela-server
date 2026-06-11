import { PrismaClient } from "@prisma/client";

import httpStatus from "http-status";
import { prisma } from "../../../shared/prisma";
import ApiError from "../../error/ApiError";



/**
 * পুরো বাংলাদেশের লোকেশন ডেটা (Division -> District -> Area) হায়ারার্কি আকারে গেট করা
 */
const getAllLocationsHierarchy = async () => {
  try {
    const locations = await prisma.division.findMany({
      select: {
        id: true,
        name: true,
        districts: {
          select: {
            id: true,
            name: true,
            isDhaka: true,
            areas: {
              select: {
                id: true,
                name: true,
              },
              orderBy: {
                name: "asc", // থানা বর্ণানুক্রমিকভাবে সাজানো
              },
            },
          },
          orderBy: {
            name: "asc", // জেলা বর্ণানুক্রমিকভাবে সাজানো
          },
        },
      },
      orderBy: {
        name: "asc", // বিভাগ বর্ণানুক্রমিকভাবে সাজানো
      },
    });

    return locations;
  } catch (error: any) {
    // যেকোনো ডাটাবেজ বা ইন্টারনাল এররকে ApiError-এ পাঠানো
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Failed to fetch structured location data"
    );
  }
};

export const LocationService = {
  getAllLocationsHierarchy,
};