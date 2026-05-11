import express from "express";
import { OrderControllers } from "./order.controller";
import { auth } from "../auth/auth.middleware";
const router = express.Router();

router.get("/initiate-cod-order", OrderControllers.initiateCODOrder);

router.get(
  "/customer-orders",
  auth("ADMIN"),
  OrderControllers.getCustomerOrders,
);

router.post(
  "/update-order-status",
  auth("ADMIN"),
  OrderControllers.updateOrderStatus,
);
export const OrderRoutes = router;