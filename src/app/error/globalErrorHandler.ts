import { ErrorRequestHandler } from "express";
import ApiError from "./ApiError"; // আপনার ApiError ফাইলের পাথ

const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // ডিফল্ট স্ট্যাটাস কোড এবং মেসেজ
  let statusCode = 500;
  let message = "Something went wrong!";

  // যদি এররটি আপনার তৈরি করা ApiError ক্লাসের ইন্সট্যান্স হয়
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
  }
  // সাধারণ Error হলে
  else if (err instanceof Error) {
    message = err.message;
  }

  // ফ্রন্টএন্ডের জন্য রেসপন্স পাঠানো
  res.status(statusCode).json({
    success: false,
    message: message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

export default globalErrorHandler;
