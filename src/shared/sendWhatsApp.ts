export const sendWhatsApp = async (phone: string, message: string) => {
  try {
    console.log(`[WhatsApp Alert] Sending message to Admin (${phone}):`);
    console.log(`----------------------------------------`);
    console.log(message);
    console.log(`----------------------------------------`);

    const apiKey = process.env.WHATSAPP_API_KEY;
    const gatewayUrl = process.env.WHATSAPP_API_URL; // e.g. https://api.callmebot.com/whatsapp.php

    if (!apiKey || !gatewayUrl) {
      console.warn("⚠️ WhatsApp API credentials (WHATSAPP_API_KEY/URL) are not set in .env. Logged to console.");
      return true;
    }

    const params = new URLSearchParams({
      phone,
      text: message,
      apikey: apiKey,
    });

    const url = `${gatewayUrl}?${params.toString()}`;
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    
    return res.ok;
  } catch (error: any) {
    console.error("WhatsApp Gateway Error:", error.message);
    return false;
  }
};
