import express from "express";
import {
  addProductImage,
  createProduct,
  deleteProduct,
  getAllProductsForAdmin,
  getHomeProducts,
  getProductById,
 
  getProductBySlug,
 
  manageVariants,
  publishProduct,
  removeImages,
  reorderImages,
  updateProductInfo,
  updateStatus,
} from "./product.controller";
import { auth } from "../auth/auth.middleware";

const router = express.Router();

// প্রোডাক্ট কুয়েরি এবং ক্রিয়েশন রাউটস
router.get("/", getHomeProducts); 
router.get("/all-products", getAllProductsForAdmin);
router.post("/create-product", auth("ADMIN"), createProduct);
router.get("/slug/:slug", getProductBySlug); // স্লাগ ভিত্তিক প্রোডাক্ট রাউট
router.post("/publish/:id", auth("ADMIN"), publishProduct);

// নির্দিষ্ট প্রোডাক্ট আইডি ভিত্তিক রাউটস
router.get("/:id", getProductById);
router.patch("/:id/info", auth("ADMIN"), updateProductInfo);
router.put("/:id/variants", auth("ADMIN"), manageVariants);
router.patch("/:id/status", auth("ADMIN"), updateStatus);
router.delete("/:id", auth("ADMIN"), deleteProduct);

// ইমেজ ম্যানেজমেন্ট রাউটস
router.post("/:id/images", auth("ADMIN"), addProductImage);
router.delete("/:productId/images", auth("ADMIN"), removeImages); // কন্ট্রোলারের প্যারামিটার (productId) অনুযায়ী ম্যাচ করা হয়েছে
router.patch("/:productId/images/reorder", auth("ADMIN"), reorderImages);

export const ProductRoutes = router;