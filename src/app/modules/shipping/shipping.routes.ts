import express from "express";
import { ShippingController } from "./shipping.controller";
import { auth } from "../auth/auth.middleware";
import { Role } from "@prisma/client";

// import auth from "../../middlewares/auth"; 
// import { ENUM_USER_ROLE } from "../../../enums/user";

const router = express.Router();


router.get("/configurations", ShippingController.getAllConfigs);

// Create Configuration (ঐচ্ছিক)
router.post(
  "/configurations",
  auth(Role.ADMIN),
  ShippingController.createConfig
);

// Update Configuration (শুধুমাত্র অ্যাডমিনের জন্য)
router.patch(
  "/configurations/:id",
    auth(Role.ADMIN),
  ShippingController.updateConfig
);

export const ShippingRoutes = router;