import { z } from "zod";

const createCategoryZodSchema = z.object({
  body: z.object({
    // name: string (Required)
    name: z.string({
      
    }).min(1, "Category name cannot be empty"), // নাম খালি স্ট্রিং হতে পারবে না

    // description?: string (Optional)
    description: z.string().optional(),

    // parentId?: string | null (Optional & Nullable)
    // এটি null, undefined অথবা valid string অ্যাকসেপ্ট করবে
    parentId: z.string().nullable().optional(),

    // image?: string (Optional)
    image: z.string().optional(),
  }),
});

export const CategoryValidation = {
  createCategoryZodSchema,
};