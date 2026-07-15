import express from "express";
import { DashboardControllers } from "./dashboard.controller";
import { auth } from "../auth/auth.middleware";

const router = express.Router();

router.get(
  "/stats",
  auth("ADMIN"),
  DashboardControllers.getDashboardStats,
);

export const DashboardRoutes = router;
