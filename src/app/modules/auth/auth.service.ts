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
import { verifyGoogleToken } from "../../lib/googleAuth/googleAuthHelper";
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

   if (!user || !user.password) {
  throw new ApiError(400, "Password is not set for this user");
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


const googleLoginService = async (idToken: string) => {
  try {
    // ১️⃣ গুগল টোকেন ভেরিফাই করে ডেটা নেওয়া হচ্ছে
    const { email, name, picture, sub } = await verifyGoogleToken(idToken);
    
    if (!email) {
      throw new ApiError(400, "Google login failed: email missing");
    }

    // ২️⃣ নতুন স্কিমা অনুযায়ী সরাসরি User টেবিল থেকে খুজে আনা হচ্ছে (কোনো include লাগবে না)
    let user = await prisma.user.findUnique({
      where: { email },
    });

    // ৩️⃣ ইউজার যদি ডাটাবেজে না থাকে, তবে নতুন ইউজার তৈরি করা হচ্ছে
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || "", 
          status: "ACTIVE",
          role: "CUSTOMER", 
        },
      });
    } else {
      
      if (user.status === "INACTIVE" || user.status === "BANNED") {
        throw new ApiError(403, "Your account has been suspended.");
      }
    }

    // ৫️⃣ আপনার প্রজেক্টের এক্সিস্টিং টোকেন জেনারেটর ফাংশন কল করে রিটার্ন করা হচ্ছে
    return loginSuccess(user);

  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("Error in googleLoginService:", error);
    throw new ApiError(500, "Internal server error during Google authentication");
  }
};

// =============================
// FORGOT PASSWORD SERVICE
// =============================
const forgotPasswordService = async (email?: string, phone?: string) => {
  try {
    // ১. অন্তত একটি ডেটা থাকা নিশ্চিত করা
    if (!email && !phone) {
      throw new ApiError(400, "Email or phone is required");
    }

    // নতুন স্কিমা অনুযায়ী সরাসরি User টেবিল থেকে খোঁজা হচ্ছে
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          email ? { email: email.trim() } : undefined, 
          phone ? { phone: phone.trim() } : undefined
        ].filter(Boolean) as any,
      },
    });

    // ২. Security: হ্যাকাররা যেন বুঝতে না পারে কোন ইমেইলটি সিস্টেমে আছে আর কোনটি নেই,
    // তাই ইউজার না পেলেও আমরা এরর থ্রো না করে শুধু রিটার্ন করে দিব।
    if (!user) {
      return {
        success: true,
        message: "If the account exists, an OTP has been sent.",
      };
    }

    const type = email ? "email" : "phone";
    const identifier = (email || phone) as string;

    // ৩. OTP জেনারেট করা
    const otp = await OtpService.createOtp(type, identifier);

    // ৪. ইমেইল বা এসএমএস পাঠানো
    if (email) {
      const subject = "Karutw - Password Reset OTP";
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
          <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
          <p style="color: #555; font-size: 16px;">Hello,</p>
          <p style="color: #555; font-size: 16px;">We received a request to reset your password. Your One-Time Password (OTP) is:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #e53e3e; letter-spacing: 5px; padding: 10px 20px; background: #fff5f5; border-radius: 5px;">${otp}</span>
          </div>
          <p style="color: #777; font-size: 14px; text-align: center;">This OTP will expire in 5 minutes. If you didn't request a password reset, please ignore this email.</p>
        </div>
      `;
      await sendMessageByEmail(email, subject, html);
    } else if (phone) {
      const message = `Your Karutw password reset OTP is: ${otp}. It will expire in 5 minutes. Do not share this code.`;
      await sendMessageBySms(phone, message);
    }

    return {
      success: true,
      message: "If the account exists, an OTP has been sent.",
    };

  } catch (error) {
    // যদি এটি অলরেডি কোনো ApiError হয়, তবে সরাসরি রি-থ্রো করা হচ্ছে
    if (error instanceof ApiError) throw error;
    
    console.error("Error in forgotPasswordService:", error);
    throw new ApiError(500, "Internal server error during password reset request");
  }
};

// =============================
// RESET PASSWORD SERVICE
// =============================
const resetPasswordWithOtpService = async (
  email: string | undefined,
  phone: string | undefined,
  otp: string,
  newPassword: string,
) => {
  try {
    // কোনো ইনপুট খালি থাকলে আর্লি এরর থ্রো
    if ((!email && !phone) || !otp || !newPassword) {
      throw new ApiError(400, "Email/Phone, OTP, and new password are required");
    }

    // ১. ইউজার খোঁজা
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          email ? { email: email.trim() } : undefined, 
          phone ? { phone: phone.trim() } : undefined
        ].filter(Boolean) as any,
      },
    });

    if (!user) {
      throw new ApiError(404, "Email or phone number not found");
    }

    // ২. OTP ভেরিফিকেশন করা
    const type = email ? "email" : "phone";
    const identifier = (email || phone) as string;
    const isValidOtp = await OtpService.verifyOtp(type, identifier, otp);
    
    if (!isValidOtp) {
      throw new ApiError(400, "Invalid or expired OTP");
    }

    // ৩. নতুন পাসওয়ার্ড হ্যাশ করা
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // ৪. সরাসরি User টেবিলের পাসওয়ার্ড ফিল্ড আপডেট করা হচ্ছে
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    return {
      success: true,
      message: "Password has been successfully reset.",
    };

  } catch (error) {
    if (error instanceof ApiError) throw error;
    
    console.error("Error in resetPasswordWithOtpService:", error);
    throw new ApiError(500, "Internal server error during password update");
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



export const AuthServices = {
  loginServices,
  getMeService,
  googleLoginService,
  forgotPasswordService,
  resetPasswordWithOtpService,
};
