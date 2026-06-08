// src/app/auth/auth.service.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import ApiError from "../../error/ApiError";
import { prisma } from "../../../shared/prisma";
import { generateAccessToken, generateRefreshToken } from "./auth.utils";

import { sendEmail } from "../../../shared/mail";
import { ILoginUser } from "./login.dto";
import { OtpService } from "../otp/otp.service";
import { sendMessageByEmail } from "../../lib/otp/sendMessageByEmail";
import { sendMessageBySms } from "../../lib/otp/sendMessageBySms";
const loginSuccess = (user: any) => {
  // আপনার নতুন স্কিমা অনুযায়ী রোল একটি Single Enum, তাই এটিকে Array তে রূপান্তর করা হয়েছে
  const role = user.role ;

  const accessToken = generateAccessToken(user.id, role);
  const refreshToken = generateRefreshToken(user.id, role);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: role,
    },
  };
};

// ------------------------------------
// MAIN SERVICES
// ------------------------------------

const loginServices = async (payload: ILoginUser) => {
  const { step, password, otp } = payload;

  // ১. ডাটা নরমালাইজেশন
  const identifier = payload.identifier.trim().toLowerCase();
  const isEmailInput = identifier.includes("@");

  // =========================================================
  // STEP 1: IDENTIFIER (ইউজার খোঁজা অথবা নতুন ইউজার তৈরি করা)
  // =========================================================
  if (step === "IDENTIFIER") {
    let user = await prisma.user.findUnique({
      where: isEmailInput ? { email: identifier } : { phone: identifier },
    });

    // যদি ইউজার না থাকে তবে নতুন ইউজার তৈরি হবে
    if (!user) {
      try {
        user = await prisma.user.create({
          data: {
            // স্কিমা অনুযায়ী name এবং password রিকোয়ার্ড (Required), তাই ডিফল্ট ভ্যালু দেওয়া হয়েছে
            name: isEmailInput ? identifier.split("@")[0] : "Customer",
            email: isEmailInput ? identifier : null,
            phone: !isEmailInput ? identifier : null,
            password: "", // খালি স্ট্রিং মানে এখনও পাসওয়ার্ড সেট করা হয়নি (OTP দিয়ে লগইন করবে)
            role: "CUSTOMER",
          },
        });
      } catch (error: any) {
        // রেস কন্ডিশন (Race Condition) হ্যান্ডেল করার জন্য কনফ্লিক্ট প্রটেকশন
        if (error.code === "P2002") {
          user = await prisma.user.findUnique({
            where: isEmailInput ? { email: identifier } : { phone: identifier },
          });
        } else throw error;
      }
    }

    // ২. পরবর্তী স্টেপ নির্ধারণ করা
    // যদি ইউজারের পাসওয়ার্ড সেট করা থাকে (খালি স্ট্রিং না হয়), তবে PASSWORD স্টেপে যাবে
    if (user && user.password !== "") {
      return { nextStep: "PASSWORD" };
    }

    // ৩. ওটিপি (OTP) লজিক
    const type = isEmailInput ? "email" : "phone";
    const generatedOtp = await OtpService.createOtp(type, identifier);
    console.log(`[Sending OTP to ${identifier}]:`, generatedOtp);

    if (isEmailInput) {
      const emailSubject = "Elumpu - Your Login OTP";
      const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
                <h2 style="color: #333; text-align: center;">Welcome to Elumpu!</h2>
                <p style="color: #555; font-size: 16px;">Hello,</p>
                <p style="color: #555; font-size: 16px;">Your One-Time Password (OTP) to proceed with your login is:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <span style="font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 5px; padding: 10px 20px; background: #f4fdf4; border-radius: 5px;">${generatedOtp}</span>
                </div>
                <p style="color: #777; font-size: 14px; text-align: center;">This OTP will expire in 5 minutes. Please do not share this code with anyone.</p>
              </div>
            `;

      await sendMessageByEmail(identifier, emailSubject, emailHtml);
    } else {
      const smsMessage = `Your Elumpu login OTP is: ${generatedOtp}. It will expire in 5 minutes. Please do not share this code.`;
      await sendMessageBySms(identifier, smsMessage);
    }

    return { nextStep: "OTP" };
  }

  // =========================================================
  // STEP 2: PASSWORD LOGIN
  // =========================================================
  if (step === "PASSWORD") {
    if (!password) throw new ApiError(400, "Password is required");

    const user = await prisma.user.findUnique({
      where: isEmailInput ? { email: identifier } : { phone: identifier },
    });

    if (!user || user.password === "") {
      throw new ApiError(400, "Account not found or password not set");
    }

    // সরাসরি user.password এর সাথে তুলনা করা হচ্ছে
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new ApiError(400, "Invalid credentials");

    return loginSuccess(user);
  }

  // =========================================================
  // STEP 3: OTP LOGIN
  // =========================================================
  if (step === "OTP") {
    if (!otp) throw new ApiError(400, "OTP is required");
    const type = isEmailInput ? "email" : "phone";
    
    const isValid = await OtpService.verifyOtp(type, identifier, otp);
    if (!isValid) {
      throw new ApiError(400, "Invalid or expired OTP");
    }
    
    const user = await prisma.user.findUnique({
      where: isEmailInput ? { email: identifier } : { phone: identifier },
    });
    
    if (!user) {
      throw new ApiError(400, "User not found");
    }

    // আপনার নতুন স্কিমাতে authProvider বা verification টেবিল না থাকায় আপডেট পার্টটি বাদ দেওয়া হয়েছে।

    return loginSuccess(user);
  }

  throw new ApiError(400, "Invalid login step");
};

export const getMeService = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
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
      process.env.JWT_REFRESH_TOKEN_SECRET as string,
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
// const changePassword = async (userId: string, payload: any) => {
//   try {
//     const { currentPassword, newPassword } = payload;

//     const user = await prisma.user.findUnique({ where: { id: userId } });
//     if (!user) {
//       throw new ApiError(404, "User not found!");
//     }

//     const isPasswordMatched = await bcrypt.compare(
//       currentPassword,
//       user.password,
//     );

//     if (!isPasswordMatched) {
//       throw new ApiError(401, "Current password is incorrect!");
//     }

//     const hashedPassword = await bcrypt.hash(newPassword, 12);

//     await prisma.user.update({
//       where: { id: userId },
//       data: { password: hashedPassword },
//     });

//     return { message: "Password updated successfully" };
//   } catch (error: any) {
//     if (error instanceof ApiError) throw error;
//     throw new ApiError(500, "Failed to change password: " + error.message);
//   }
// };

// // ১. Forgot Password Service (OTP জেনারেট ও সেন্ড)
// const forgotPassword = async (email: string) => {
//   try {
//     const user = await prisma.user.findUnique({
//       where: { email, isActive: true },
//     });

//     if (!user) {
//       throw new ApiError(
//         404,
//         "No user found with this email or you're expired!",
//       );
//     }

//     // ৬ ডিজিটের র‍্যান্ডম OTP তৈরি করা
//     const otp = Math.floor(100000 + Math.random() * 900000).toString();

//     // OTP এর মেয়াদ ৫ মিনিট (বর্তমান সময়ের সাথে ৫ মিনিট যোগ করা হলো)
//     const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

//     // ডাটাবেসে OTP এবং Expiry সেভ করা
//     await prisma.user.update({
//       where: { id: user.id },
//       data: {
//         resetOtp: otp,
//         resetOtpExpiry: otpExpiry,
//       },
//     });

//     // SMS-এ শুধু OTP পাঠানো
//     const smsText = `Your Ju-Hall-Token password reset OTP is: ${otp}. It is valid for 5 minutes.`;
//     await sendEmail(user.email, "Password Reset OTP", `<p>${smsText}</p>`);

//     return { message: "A 6-digit OTP has been sent to your email!" };
//   } catch (error: any) {
//     if (error instanceof ApiError) throw error;
//     throw new ApiError(
//       500,
//       "Failed to process forgot password request: " + error.message,
//     );
//   }
// };

// // ২. Reset Password Service (OTP ভেরিফাই এবং পাসওয়ার্ড চেঞ্জ)
// const resetPassword = async (payload: any) => {
//   try {
//     const { email, otp, newPassword } = payload;

//     if (!email || !otp || !newPassword) {
//       throw new ApiError(400, "Email, OTP, and new password are required!");
//     }

//     const user = await prisma.user.findUnique({ where: { email } });

//     if (!user) {
//       throw new ApiError(404, "User not found!");
//     }

//     // OTP ঠিক আছে কি না এবং মেয়াদ আছে কি না চেক করা
//     if (user.resetOtp !== otp) {
//       throw new ApiError(401, "Invalid OTP!");
//     }

//     if (!user.resetOtpExpiry || user.resetOtpExpiry < new Date()) {
//       throw new ApiError(401, "OTP has expired! Please request a new one.");
//     }

//     // নতুন পাসওয়ার্ড হ্যাশ করা
//     const hashedPassword = await bcrypt.hash(newPassword, 12);

//     // ডাটাবেসে নতুন পাসওয়ার্ড আপডেট করা এবং OTP মুছে ফেলা (যাতে ২য় বার ইউজ না হয়)
//     await prisma.user.update({
//       where: { id: user.id },
//       data: {
//         password: hashedPassword,
//         resetOtp: null,
//         resetOtpExpiry: null,
//       },
//     });

//     return { message: "Password reset successfully! You can now login." };
//   } catch (error: any) {
//     if (error instanceof ApiError) throw error;
//     throw new ApiError(500, "Failed to reset password: " + error.message);
//   }
// };

export const AuthServices = {
  loginServices,
  getMeService,
};
