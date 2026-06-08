import type { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import ApiError from "../../error/ApiError";
import { UserServices } from "./user.service";
import sendResponse from "../../../shared/sendResponse";


export const getProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }

  const profile = await UserServices.getUserProfile(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User profile retrieved successfully",
    data: profile
  });
});

export const updateBasicInfo = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }
  
  // ১. বডি থেকে প্রয়োজনীয় ডেটা নেওয়া হলো
  const { firstName, lastName, name } = req.body;

  // ২. আপনার নতুন প্রিজমা স্কিমা অনুযায়ী ডাটা অবজেক্ট তৈরি (যেহেতু profileImage টেবিলে নেই)
  const profileData = {
    firstName,
    lastName,
    name
  };

  // ৩. সার্ভিসে ক্লিন ডাটা পাস
  const result = await UserServices.updateBasicProfile(userId, profileData);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile information updated successfully",
    data: result
  });
});

export const requestUpdateContact = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }

  const { type, value } = req.body;
  
  if (type !== "email" && type !== "phone") {
    throw new ApiError(400, "Invalid contact type. Must be 'email' or 'phone'");
  }
  
  if (!value || value.trim() === "") {
    throw new ApiError(400, "Contact value cannot be empty");
  }

  console.log("Request Body:", req.body); // Debug log
  const result = await UserServices.requestUpdateContact(userId, type, value.trim());

  sendResponse(res, { 
    statusCode: 200,
    success: true,
    message: "OTP sent successfully",
    data: result 
  });
});

export const verifyUpdateContact = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }

  const { type, value, otp } = req.body;
  console.log("Request Body:", req.body); // Debug log
  
  if (type !== "email" && type !== "phone") {
    throw new ApiError(400, "Invalid contact type. Must be 'email' or 'phone'");
  }
  
  if (!value || value.trim() === "") {
    throw new ApiError(400, "Contact value cannot be empty");
  }

  if (!otp || otp.trim() === "") {
    throw new ApiError(400, "OTP cannot be empty");
  }

  const result = await UserServices.verifyUpdateContact(userId, type, value.trim(), otp.trim());
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `${type} updated successfully`,
    data: result
  });
});

export const setPassword = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }

  const { password } = req.body;
  if (!password || password.trim() === "") {
    throw new ApiError(400, "Password cannot be empty");
  }

  await UserServices.setPassword(userId, password);
  
  sendResponse(res, {
    statusCode: 200,
    success: true,  
    message: "Password updated successfully",
    data: null
  });
});

export const changePassword = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }

  const { oldPassword, newPassword } = req.body; 
  if (!oldPassword || oldPassword.trim() === "" || !newPassword || newPassword.trim() === "") {
    throw new ApiError(400, "Old and new passwords cannot be empty");
  }
   
  await UserServices.changePassword(userId, oldPassword, newPassword);
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Password changed successfully",
    data: null
  });
});