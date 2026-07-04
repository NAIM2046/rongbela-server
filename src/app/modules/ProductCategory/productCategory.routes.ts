import express from "express";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getAllCategoriesForHomePage,
  getFlatCategories,
  getCategoryById,
  updateCategory,
} from "./productCategory.controller";

const router = express.Router();

router.post("/", createCategory);

router.get("/home-category", getAllCategoriesForHomePage);
router.get("/flat-categories", getFlatCategories);
router.get("/", getAllCategories);
router.get("/:id", getCategoryById);
router.patch("/:id", updateCategory);
router.delete("/:id", deleteCategory);
export const productCategoryRoutes = router;
