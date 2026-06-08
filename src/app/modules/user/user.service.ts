import { prisma } from "../../../shared/prisma";
import ApiError from "../../error/ApiError";
import { sendMessageByEmail } from "../../lib/otp/sendMessageByEmail";
import { sendMessageBySms } from "../../lib/otp/sendMessageBySms";
import { OtpService } from "../otp/otp.service";
import bcrypt from "bcryptjs";

const getUserProfile = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const nameParts = user.name ? user.name.trim().split(" ") : ["", ""];
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: true, 
      firstName: firstName,
      lastName: lastName,
      fullName: user.name,
      profileImage: "", 
      hasPassword: !!user.password, 
      hasEmail: !!user.email,
      hasPhone: !!user.phone,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("Error in getUserProfile service:", error);
    throw new ApiError(500, "Internal server error while fetching profile");
  }
};

const updateBasicProfile = async (
  userId: string,
  data: { firstName?: string; lastName?: string; name?: string }
) => {
  try {
    const fullName = data.name || `${data.firstName || ""} ${data.lastName || ""}`.trim();

    return await prisma.user.update({
      where: { id: userId },
      data: {
        name: fullName,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("Error in updateBasicProfile service:", error);
    throw new ApiError(500, "Failed to update profile. Please try again.");
  }
};

const requestUpdateContact = async (
  userId: string,
  type: "email" | "phone",
  value: string
) => {
  try {
    console.log(`Requesting update for ${type} to ${value} for user ${userId}`);
    
    // ১️⃣ ইউনিকনেস চেক
    if (type === "email") {
      const exists = await prisma.user.findFirst({
        where: { email: value, NOT: { id: userId } },
      });
      if (exists) throw new ApiError(400, "Email already in use");
    }

    if (type === "phone") {
      const exists = await prisma.user.findFirst({
        where: { phone: value, NOT: { id: userId } },
      });
      if (exists) throw new ApiError(400, "Phone already in use");
    }

    // ২️⃣ ওটিপি তৈরি
    const otp = await OtpService.createOtp(type, value);

    // ৩️⃣ ওটিপি পাঠানো
    if (type === "email") {
      await sendMessageByEmail(
        value,
        "Your OTP for Verification",
        `<p>Your OTP is:</p><h2>${otp}</h2><p>This OTP will expire in 5 minutes.</p>`
      );
    } else {
      await sendMessageBySms(
        value,
        `Your OTP is ${otp}, valid for 5 minutes. Please do not share this OTP.`
      );
    }

    return {
      message: "OTP sent successfully",
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("Error in requestUpdateContact service:", error);
    throw new ApiError(500, `Failed to request ${type} verification. Please try again.`);
  }
};

const verifyUpdateContact = async (
  userId: string,
  type: "email" | "phone",
  value: string,
  otp: string
) => {
  try {
    const isValid = await OtpService.verifyOtp(type, value, otp);
    
    if (!isValid) {
      throw new ApiError(400, "Invalid or expired OTP. Please request a new one.");
    }

    return await prisma.user.update({
      where: { id: userId },
      data: type === "email" ? { email: value } : { phone: value },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("Error in verifyUpdateContact service:", error);
    throw new ApiError(500, `Failed to verify and update ${type}. Please try again.`);
  }
};

const setPassword = async (userId: string, password: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.password) {
      throw new ApiError(400, "Password already set");
    }

    const hash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });

    return { message: "Password set successfully" };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("Error in setPassword service:", error);
    throw new ApiError(500, "Failed to set password. Please try again.");
  }
};

const changePassword = async (
  userId: string,
  oldPassword: string,
  newPassword: string
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      throw new ApiError(400, "Password not set");
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new ApiError(400, "Old password is incorrect");
    }

    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      throw new ApiError(400, "New password must be different from the old one");
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: newHash },
    });

    return { message: "Password updated successfully" };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("Error in changePassword service:", error);
    throw new ApiError(500, "Failed to change password. Please try again.");
  }
};

export const UserServices = {
  getUserProfile,
  updateBasicProfile,
  requestUpdateContact,
  verifyUpdateContact,
  setPassword,
  changePassword,
};