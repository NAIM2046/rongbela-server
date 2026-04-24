import { randomBytes } from "node:crypto";

export const generateTransactionId = (type: "TOPUP" | "COUPON"): string => {
  const randomPart = randomBytes(4).toString("hex").toUpperCase();

  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");

  const prefix = type === "TOPUP" ? "WAL" : "CPN";

  return `${prefix}-${datePart}-${randomPart}`;
};
