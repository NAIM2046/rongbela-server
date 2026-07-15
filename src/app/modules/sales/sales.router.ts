import express from "express";
import { SalesController } from "./sales.controller";

const router = express.Router();

// Stock endpoints
router.get("/stock", SalesController.getStockItems);
router.post("/stock", SalesController.addStockItem);
router.patch("/stock/:variantId", SalesController.updateStockItem);

// POS Sales endpoints
router.get("/analytics", SalesController.getAnalytics);
router.get("/customers", SalesController.searchCustomers);
router.get("/", SalesController.getAllSales);
router.post("/", SalesController.recordSale);
router.patch("/:id", SalesController.updateSale);
router.delete("/:id", SalesController.deleteSale);

export const SalesRoutes = router;
