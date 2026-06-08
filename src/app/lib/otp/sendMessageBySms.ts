

export const sendMessageBySms = async (phone: string, message: string) => {
  
  const params = new URLSearchParams({
    api_key: process.env.BULKSMS_API_KEY!,
    type: "text",
    number: phone,
    senderid: process.env.BULKSMS_SENDER_ID!,
    message,
  });

  const url = `https://bulksmsbd.net/api/smsapi?${params.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    cache: "no-store", // important for OTP
  });
  console.log("BulkSMS Response Status:", res);
  if (!res.ok) {
    throw new Error("Failed to send SMS OTP");
  }

  return await res.text(); // BulkSMSBD returns text response
};