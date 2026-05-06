import express from "express";
import { auth } from "../auth/auth.middleware";
import {
  createProduct,
  getAllProducts,
  updateSingleProduct,
  deleteSingleProduct,
  ProductControllers,
} from "./product.controller";

const router = express.Router();
router.post("/create", auth("ADMIN"), createProduct);
router.get(
  "/category-wise-products/:categorySlug",
  ProductControllers.getCategoryWiseProducts,
);
router.get("/", getAllProducts);
router.get("/single/:slug", ProductControllers.getSingleProductBySlug);
router.patch("/:productId", auth("ADMIN"), updateSingleProduct);
router.delete("/:productId", auth("ADMIN"), deleteSingleProduct);
export const ProductRoutes = router;
