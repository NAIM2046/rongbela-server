import express from "express";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getAllCategoriesForHomePage,
  getCategoryById,
  updateCategory,
} from "./productCategory.controller";

const router = express.Router();

router.post("/", createCategory);

router.get("/home-category", getAllCategoriesForHomePage);
router.get("/:id", getCategoryById);
router.get("/", getAllCategories);
router.patch("/:id", updateCategory);
router.delete("/:id", deleteCategory);
export const productCategoryRoutes = router;
