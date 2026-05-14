// src/app/modules/customer/user/user.controller.ts
import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { UserServices } from "./user.service";
import sendResponse from "../../../shared/sendResponse";

// CREATE USER
export const createUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.CreateAdminIntoDB(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "admin created successfully",
    data: result,
  });
});

export const UserController = {
  createUser,
};
