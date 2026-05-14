import bcrypt from "bcryptjs";

import { IUser } from "./user.interface";

import ApiError from "../../error/ApiError";
import { prisma } from "../../../shared/prisma";

// CREATE USER
const CreateAdminIntoDB = async (payload: Partial<IUser>) => {
  try {
    const { name, email, role, password } = payload;

    if (!name || !email || !role || !password) {
      throw new ApiError(400, "Name, Email, Role, and Password are required");
    }
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ApiError(400, "A user with this email already exists");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role,
        password: hashedPassword,
      },
    });
    return user;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Internal Server Error: " + error.message);
  }
};

export const UserServices = {
  CreateAdminIntoDB,
};
