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
router.get("/", getHomeProducts); 
router.get("/all-products", getAllProductsForAdmin);
router.post("/create-product", auth("ADMIN"), createProduct);
router.get("/slug/:slug", getProductBySlug);
router.post("/publish/:id", auth("ADMIN"), publishProduct);

router.get("/:id", getProductById);
router.patch("/:id/info", auth("ADMIN"), updateProductInfo);
router.put("/:id/variants", auth("ADMIN"), manageVariants);
router.patch("/:id/status", auth("ADMIN"), updateStatus);
router.delete("/:id", auth("ADMIN"), deleteProduct);

router.post("/:id/images", auth("ADMIN"), addProductImage);
router.delete("/:productId/images", auth("ADMIN"), removeImages);
router.patch("/:productId/images/reorder", auth("ADMIN"), reorderImages);

export const ProductRoutes = router;