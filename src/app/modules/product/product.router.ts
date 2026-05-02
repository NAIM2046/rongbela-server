import express from "express";
import { auth } from "../auth/auth.middleware";
import { 
  createProduct, 
  getAllProducts, 
  updateSingleProduct, 
  deleteSingleProduct, 
  getSingleProductBySlug
} from "./product.controller";

const router = express.Router();

// ১. প্রোডাক্ট তৈরি করার রাউট (Protected)
router.post("/create", auth("ADMIN"), createProduct);

// ২. সব প্রোডাক্ট দেখার রাউট (Public - তাই auth মিডলওয়্যার নেই)
router.get("/", getAllProducts);
router.get("/:slug", getSingleProductBySlug);

// ৩. প্রোডাক্ট আপডেট করার রাউট (Protected)
router.patch("/:productId", auth("ADMIN"), updateSingleProduct);

// ৪. প্রোডাক্ট ডিলিট করার রাউট (Protected)
router.delete("/:productId", auth("ADMIN"), deleteSingleProduct);

export const ProductRoutes = router;