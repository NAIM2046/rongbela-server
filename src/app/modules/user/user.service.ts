

import { IUser } from "./user.interface";
import bcrypt from "bcryptjs";
import XLSX from "xlsx";

import { nanoid } from "nanoid";
import ApiError from "../../error/ApiError";



// CREATE USER
const RegStudentIntoDB = async (payload: Partial<IUser>) => {
  try {
    const { name, email, regId, phone, role  , department , batch} = payload;

    
    if (!name || !email || !role || !regId || !department || !batch) {
      throw new ApiError(400, "Name, Email, Registration ID, Department, Batch, and Role are required");
    }
    
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Internal Server Error: " + error.message);
  }
};

/* =====================================================
   GET ALL USERS (PAGINATION + SEARCH)
===================================================== */
const getAllUsersFromDB = async (
  hallId: string,
  page: number,
  limit: number,
  search: string,
) => {
  try {
    const skip = (page - 1) * limit;
    let whereCondition: Prisma.UserWhereInput = {
      allottedHallId: hallId,
      isActive: IsActive.ACTIVE,
    };
    if (search) {
      whereCondition.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    const total = await prisma.user.count({ where: whereCondition });

 const users = await prisma.user.findMany({
  where: whereCondition,
  skip,
  take: limit,
  orderBy: { createdAt: "desc" },
  
  select: {
    id: true,
    name: true,
    email: true,
    phone: true,
    role: true,
    
    isActive: true,
    createdAt: true,
    
    allottedHall: { 
      select: { id: true, name: true } 
    },
    temporaryHall: { 
      select: { id: true, name: true } 
    },
    wallet: { 
      select: { id: true, balance: true } 
    },
  },
});

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error: any) {
    throw new ApiError(500, "Failed to fetch users: " + error.message);
  }
};

const getUserByIdFromDB = async (id: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        allottedHallId: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) throw new ApiError(404, "User not found");

    return user;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Database error: " + error.message);
  }
};

export const updateUserIntoDB = async (
  id: string,
  payload: {
    name?: string;
    email?: string;
    phone?: string;
  },
) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiError(404, "User not found");

    const updateData: Prisma.UserUpdateInput = {};

    if (payload.name && payload.name !== user.name) {
      updateData.name = payload.name;
    }
    if (payload.phone && payload.phone !== user.phone) {
      const isPhoneTaken = await prisma.user.findUnique({
        where: { phone: payload.phone },
      });
      if (isPhoneTaken) {
        throw new ApiError(
          400,
          "This phone number is already in use by another account",
        );
      }
    }

    if (payload.email && payload.email !== user.email) {
      const isEmailTaken = await prisma.user.findUnique({
        where: { email: payload.email },
      });

      if (isEmailTaken) {
        throw new ApiError(
          400,
          "This email is already in use by another account",
        );
      }

      updateData.email = payload.email;
    }

    if (Object.keys(updateData).length === 0) {
      return user;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        allottedHallId: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;

    throw new ApiError(500, "Failed to update user: " + error.message);
  }
};

export const deleteUserFromDB = async (id: string) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiError(404, "User not found");

    if (!user.isActive) {
      throw new ApiError(400, "User is already deleted or inactive");
    }

    const deletedUser = await prisma.user.update({
      where: { id },
      data: {
        isActive: IsActive.INACTIVE,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
    });

    return deletedUser;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Failed to delete user: " + error.message);
  }
};

const bulkUploadStudentProvidedCredentials = async (
  fileBuffer: Buffer,
  userId: string,
) => {
  try {
    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        allottedHallId: true,
        allottedHall: { select: { gender: true } },
      },
    });

    if (!admin || !admin.allottedHallId) {
      throw new ApiError(400, "Admin is not associated with any hall");
    }

    const allHalls = await prisma.hall.findMany({
      select: { id: true, name: true },
    });

    const hallMap = new Map(allHalls.map((h) => [h.name.toLowerCase(), h.id]));

    const hallId = admin.allottedHallId;
    const hallGender = admin.allottedHall?.gender || Gender.MALE;

    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    const failed: { identifier?: string; reason: string }[] = [];

    const getHallIdFromExcel = (hallName: string) => {
      let hallIdExcel = hallMap.get(hallName.toLowerCase());
      if (hallId == hallIdExcel) {
        hallIdExcel = allHalls.find((h) => h.id !== hallId)?.id;
      }
      return hallIdExcel;
    };

    for (const row of rows) {
      const email = String(row.email || "")
        .trim()
        .toLowerCase();
      const regId = String(row.regId || "").trim();
      const phone = String(row.phone || "").trim();
      const hallName = String(row.hallName || "").trim();
      const name = String(row.name || "").trim();

      const identifier = email || regId || phone || "Unknown";

      try {
        if (!regId && !phone && !email) {
          throw new ApiError(400, "Name,  RegId, and Phone are all required");
        }

        const existing = await prisma.user.findFirst({
          where: {
            regId,
          },
        });

        const password = nanoid(8);
        const hashed = await bcrypt.hash(password, 10);

        if (existing) {
          if (
            existing.allottedHallId === hallId &&
            existing.phone === "dummy1Pho1N1"
          ) {
            await prisma.user.update({
              where: { id: existing.id },
              data: {
                name,
                email,
                phone,
                password: hashed,
              },
            });
            await sendSMS(
              phone,
              `Welcome ${name}! Password: ${password}. Login to Ju-Hall-Coupon using your phone number ${phone}. https://amarcoupon.com/login`,
            ).catch((err) =>
              console.log(`Failed to send SMS to ${phone}:`, err.message),
            );
          }
        } else {
          await prisma.user.create({
            data: {
              name,
              email,
              regId,
              phone,
              gender: hallGender,
              password: hashed,
              role: Role.STUDENT,
              hallId: getHallIdFromExcel(hallName),
              allowedHallID: hallId,
              isActive: IsActive.ACTIVE,
            },
          });

          await sendSMS(
            phone,
            `Welcome ${name}! Password: ${password}. Login to Ju-Hall-Coupon using your phone number ${phone}. https://amarcoupon.com/login`,
          ).catch((err) =>
            console.log(`Failed to send SMS to ${phone}:`, err.message),
          );
        }
      } catch (err: any) {
        failed.push({ identifier, reason: err.message });
      }
    }

    return { created: [], failed };
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Bulk upload failed: " + error.message);
  }
};

const bulkUploadAuthorityProvidedCredentials = async (
  fileBuffer: Buffer,
  userId: string,
) => {
  try {
    const admin = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        allottedHallId: true,
        allottedHall: { select: { gender: true } },
      },
    });

    if (!admin || !admin.allottedHallId) {
      throw new ApiError(400, "Admin is not associated with any hall");
    }

    const hallId = admin.allottedHallId;
    const hallGender = admin.allottedHall?.gender || Gender.MALE;

    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);
    const failed: { identifier?: string; reason: string }[] = [];

    for (const row of rows) {
      const name = String(row.name || "").trim();
      const regId = String(row.regId || "").trim();
      const identifier = name || regId || "Unknown";

      try {
        if (!regId) {
          throw new ApiError(400, "Name,  RegId, and Phone are all required");
        }

        const existing = await prisma.user.findFirst({
          where: {
            regId,
          },
        });

        if (existing) {
          if (existing.allottedHallId !== hallId) {
            await prisma.user.update({
              where: { id: existing.id },
              data: { allottedHallId: hallId, allowedHallID: hallId },
            });
          }
        } else {
          await prisma.user.create({
            data: {
              name,
              regId,
              gender: hallGender,
              role: Role.STUDENT,
              allottedHallId: hallId,
              temporaryHallId: hallId,
              isActive: IsActive.ACTIVE,
              phone: "dummy1Pho1N1", // Dummy phone for authority-provided users
              password: "dummy1Pass1Word",
            },
          });
        }
      } catch (err: any) {
        failed.push({ identifier, reason: err.message });
      }
    }

    return { created: [], failed };
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Bulk upload failed: " + error.message);
  }
};

// SEARCH STUDENT BY EMAIL
const searchStudentFromDB = async (searchTerm: string, hallId: string) => {
  try {
    if (!searchTerm) {
      throw new ApiError(400, "Search term is required");
    }

    const students = await prisma.user.findMany({
      where: {
        role: Role.STUDENT,
        allottedHallId: hallId,
        OR: [
          {
            name: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        ],
      },
      take: 10,
      // select
      select: {
        id: true,
        name: true,
        email: true,
        allottedHallId: true,
        isActive: true,
        createdAt: true,

        wallet: {
          select: {
            id: true,
            balance: true,
          },
        },
        allottedHall: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return students;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Database error: " + error.message);
  }
};

export const UserServices = {
  createUserIntoDB,
  getAllUsersFromDB,
  getUserByIdFromDB,
  updateUserIntoDB,
  deleteUserFromDB,
  bulkUploadAuthorityProvidedCredentials,
  bulkUploadStudentProvidedCredentials,
  searchStudentFromDB,
};
