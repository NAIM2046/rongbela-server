// src/app/auth/auth.controller.ts
import { Request, Response } from "express";
import {
  
  AuthServices,
  getMeService,
  
  logoutService,
  refreshTokenService,
} from "./auth.service";
import { EnvVars } from "../../config/env";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import ApiError from "../../error/ApiError";
import { LoginUserDto } from "./login.dto";
import httpStatus from 'http-status';

const isProd = process.env.NODE_ENV === "production";
export const login = catchAsync(async (req: Request, res: Response) => {
  // -----------------------------
  // Validate Request Body
  // -----------------------------
  const Zvalidation = await LoginUserDto.safeParseAsync(req.body);

  if (!Zvalidation.success) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Validation Error: " +
        Zvalidation.error.issues
          .map((i) => `${String(i.path[0])} - ${i.message}`)
          .join(", "),
    );
  }

  // -----------------------------
  // Business Logic: Login User
  // -----------------------------
  const result = await AuthServices.loginServices(Zvalidation.data);

  // CASE 1: Service requests a Next Step (OTP or PASSWORD)
  // We do NOT set cookies yet. just return the instruction to frontend.
  if ("nextStep" in result) {
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Please proceed to ${result.nextStep}`,
      data: result, // { nextStep: "OTP" }
    });
  }

  // CASE 2: Login Complete (We have tokens)
  // FIX: result does NOT have .data. The result IS the data.
  const { accessToken, refreshToken, user } = result as any;

  const isProd = EnvVars.NODE_ENV === "production";

  // Set Cookies
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 30 * 60 * 1000, // 30 mins
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Send Response (Tokens are hidden in cookies)
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Login successful",
    data: { user },
  });
});


export const refreshToken = catchAsync(async (req: Request, res: Response) => {
  // READ FROM COOKIE — NOT BODY
  const oldrefreshToken = req.cookies.refreshToken;

  if (!oldrefreshToken) {
    throw new ApiError(401, "Refresh token missing");
  }

  const { accessToken, refreshToken: newRefreshToken } =
    await refreshTokenService(oldrefreshToken);

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProd, // HTTPS only in production
    sameSite: isProd ? "none" : "lax",
    maxAge: 1000 * 60 * 15,
  });

  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: isProd, // HTTPS only in production
    sameSite: isProd ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Token refreshed successfully",
    data: null,
  });
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  await logoutService();

  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: isProd, // HTTPS only in production
    sameSite: isProd ? "none" : "lax",
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: isProd, // HTTPS only in production
    sameSite: isProd ? "none" : "lax",
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Logout successful",
    data: null,
  });
});

export const getMe = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;

  if (!user) {
    throw new ApiError(401, "Unauthorized access");
  }

  const foundUser = await getMeService(user.userId);

  if (!foundUser) {
    throw new ApiError(404, "User not found");
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User fetched successfully",
    data: foundUser,
  });
});

// export const changePassword = catchAsync(
//   async (req: Request, res: Response) => {
//     const userId = req.user?.userId;

//     if (!userId) {
//       throw new ApiError(401, "Unauthorized access! User ID not found.");
//     }

//     const result = await AuthServices.changePassword(userId, req.body);

//     sendResponse(res, {
//       statusCode: 200,
//       success: true,
//       message: "Password changed successfully ✅",
//       data: result,
//     });
//   },
// );

// export const forgotPassword = catchAsync(
//   async (req: Request, res: Response) => {
//     const { email } = req.body;
//     const result = await AuthServices.forgotPassword(email);

//     sendResponse(res, {
//       statusCode: 200,
//       success: true,
//       message: result.message,
//       data: null,
//     });
//   },
// );

// export const resetPassword = catchAsync(async (req: Request, res: Response) => {
//   // ফ্রন্টএন্ড থেকে email, otp এবং newPassword পাঠাতে হবে
//   const result = await AuthServices.resetPassword(req.body);

//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: result.message,
//     data: null,
//   });
// });

export const AuthController = {
  login,
  refreshToken,
  logout,
  getMe,
  
};
