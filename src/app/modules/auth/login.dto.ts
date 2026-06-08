
import { z } from "zod";

export const LoginUserDto = z
  .object({
    step: z.enum(["IDENTIFIER", "PASSWORD", "OTP"]),

    identifier: z.string().min(1, "Email or Phone is required"),

    password: z.string().optional(),
    otp: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // STEP 1 → only identifier
    if (data.step === "IDENTIFIER") {
      return;
    }

    // STEP 2 → password required
    if (data.step === "PASSWORD" && !data.password) {
      ctx.addIssue({
        path: ["password"],
        message: "Password is required",
        code: z.ZodIssueCode.custom,
      });
    }

    // STEP 2 → otp required
    if (data.step === "OTP" && !data.otp) {
      ctx.addIssue({
        path: ["otp"],
        message: "OTP is required",
        code: z.ZodIssueCode.custom,
      });
    }
  });

export type ILoginUser = z.infer<typeof LoginUserDto>;
export const SetPasswordDto = z.object({
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(32, "Password cannot exceed 32 characters"),
  confirmPassword: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});