// src/app/auth/auth.service.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import ApiError from "../../error/ApiError";
import { prisma } from "../../../shared/prisma";
import { generateAccessToken, generateRefreshToken } from "./auth.utils";

import { sendEmail } from "../../../shared/mail";
export const loginService = async (payload: {
  email: string;
  password: string;
}) => {
  try {
    const { email, password } = payload;
   

    if (!email) {
      throw new ApiError(400, "Email is required for login");
    }

    const user = await prisma.user.findUnique({
      where: {
        email: email,
        isActive: true,
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new ApiError(401, "Invalid password");
    }

    const accessToken = generateAccessToken
      (
      user.id,
      user.role,
     
    );
    const refreshToken = generateRefreshToken(
      user.id,
      user.role,
     
    );

    return { accessToken, refreshToken, role: user.role };
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Login failed: " + error.message);
  }
};

export const getMeService = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        
        role: true,
       
        isActive: true,
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return user;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Failed to fetch user data: " + error.message);
  }
};

export const logoutService = async () => true;

export const refreshTokenService = async (oldRefreshToken: string) => {
  try {
    const decoded = jwt.verify(
      oldRefreshToken,
      process.env.REFRESH_TOKEN_SECRET as string,
    ) as jwt.JwtPayload & {
      userId: string;
      role: string;
     
    };

    const { userId, role } = decoded;

    const accessToken = generateAccessToken(userId, role);
    const refreshToken = generateRefreshToken(userId, role);

    return { accessToken, refreshToken };
  } catch (error: any) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }
};

// CHANGE PASSWORD (SECURE)
const changePassword = async (userId: string, payload: any) => {
  try {
    const { currentPassword, newPassword } = payload;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ApiError(404, "User not found!");
    }

    const isPasswordMatched = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isPasswordMatched) {
      throw new ApiError(401, "Current password is incorrect!");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: "Password updated successfully" };
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Failed to change password: " + error.message);
  }
};

// ১. Forgot Password Service (OTP জেনারেট ও সেন্ড)
const forgotPassword = async (email: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email, isActive: true },
    });

    if (!user) {
      throw new ApiError(
        404,
        "No user found with this email or you're expired!",
      );
    }

    // ৬ ডিজিটের র‍্যান্ডম OTP তৈরি করা
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // OTP এর মেয়াদ ৫ মিনিট (বর্তমান সময়ের সাথে ৫ মিনিট যোগ করা হলো)
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    // ডাটাবেসে OTP এবং Expiry সেভ করা
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtp: otp,
        resetOtpExpiry: otpExpiry,
      },
    });

    // SMS-এ শুধু OTP পাঠানো
    const smsText = `Your Ju-Hall-Token password reset OTP is: ${otp}. It is valid for 5 minutes.`;
    await sendEmail(user.email, "Password Reset OTP", `<p>${smsText}</p>`);

    return { message: "A 6-digit OTP has been sent to your email!" };
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      500,
      "Failed to process forgot password request: " + error.message,
    );
  }
};

// ২. Reset Password Service (OTP ভেরিফাই এবং পাসওয়ার্ড চেঞ্জ)
const resetPassword = async (payload: any) => {
  try {
    const { email, otp, newPassword } = payload;

    if (!email || !otp || !newPassword) {
      throw new ApiError(400, "Email, OTP, and new password are required!");
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new ApiError(404, "User not found!");
    }

    // OTP ঠিক আছে কি না এবং মেয়াদ আছে কি না চেক করা
    if (user.resetOtp !== otp) {
      throw new ApiError(401, "Invalid OTP!");
    }

    if (!user.resetOtpExpiry || user.resetOtpExpiry < new Date()) {
      throw new ApiError(401, "OTP has expired! Please request a new one.");
    }

    // নতুন পাসওয়ার্ড হ্যাশ করা
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // ডাটাবেসে নতুন পাসওয়ার্ড আপডেট করা এবং OTP মুছে ফেলা (যাতে ২য় বার ইউজ না হয়)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetOtp: null, 
        resetOtpExpiry: null, 
      },
    });

    return { message: "Password reset successfully! You can now login." };
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Failed to reset password: " + error.message);
  }
};

export const AuthServices = {
  loginService,
  getMeService,
  changePassword,
  forgotPassword,
  resetPassword,
};
