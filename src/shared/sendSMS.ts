import httpStatus from 'http-status';
import ApiError from '../app/error/ApiError';

export const sendSMS = async (phone: string, message: string) => {
  try {
    console.log(`Sending SMS to ${phone}: ${message}`);

    // .env বা config থেকে ক্রেডেনশিয়াল কল করা
    const apiKey = process.env.BULKSMS_API_KEY as string;
    const senderId = process.env.BULKSMS_SENDER_ID as string;

    // যদি .env ফাইলে API key না থাকে, তাহলে এটি এরর না দিয়ে শুধু কনসোলে দেখাবে (ডেভেলপমেন্টের সুবিধার্থে)
    if (!apiKey || !senderId) {
      console.warn("⚠️ BulkSMS credentials are not set in .env. Logging to console instead.");
      return true;
    }

    const params = new URLSearchParams({
      api_key: apiKey,
      type: "text",
      number: phone,
      senderid: senderId,
      message: message, 
    });

    const url = `https://bulksmsbd.net/api/smsapi?${params.toString()}`;

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store", 
    });

    if (!res.ok) {
      throw new Error(`Failed to send SMS. Status: ${res.status}`);
    }

    const responseText = await res.text(); // BulkSMSBD text 
    console.log("BulkSMS Response:", responseText);

    return responseText;
  } catch (error: any) {
    console.error('SMS Gateway Error:', error.message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to send SMS');
  }
};