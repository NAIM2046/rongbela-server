
import crypto from 'crypto';
import ApiError from '../../error/ApiError';
import redis from '../../../shared/redis';



type OtpType = "email" | "phone" | "password_reset";

export const OtpService = {
  // ১. Create & Save OTP
  createOtp: async (type: OtpType, identifier: string): Promise<string> => {
    const rateLimitKey = `rate_limit:otp:${type}:${identifier}`;
    
    const requestsCount = await redis.incr(rateLimitKey);
    
    if (requestsCount === 1) {
      await redis.expire(rateLimitKey, 60); 
    } else if (requestsCount > 3) {
      throw new ApiError(429, "Too many requests. Please wait 1 minute.");
    }

    // ৬ ডিজিটের ওটিপি
    const otp = crypto.randomInt(100000, 999999).toString();
    
    const key = `otp:${type}:${identifier}`;
    const ttl = 300; 

    await redis.set(key, otp, 'EX', ttl);
    
    console.log(`[OTP Created]: Key=${key}, OTP=${otp}`); 
    return otp;
  },

  // ২. Verify OTP
  verifyOtp: async (type: OtpType, identifier: string, inputOtp: string): Promise<boolean> => {
    const key = `otp:${type}:${identifier}`;
    const savedOtp = await redis.get(key);

    console.log(`[OTP Verify Attempt]: Key=${key}, Saved=${savedOtp}, Input=${inputOtp}`);

    // ওটিপি না থাকলে বা না মিললে
    if (!savedOtp || savedOtp !== inputOtp) {
      return false;
    }

    // একবার ব্যবহার হলে ডিলিট করে দিন (Security Best Practice)
    await redis.del(key);
    return true;
  }
};