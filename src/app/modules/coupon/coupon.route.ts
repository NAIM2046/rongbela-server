import express from "express";
import { CouponController } from "./coupon.controller";

const router = express.Router();

router.get("/", CouponController.getAllCoupons);
router.post("/", CouponController.createCoupon);
router.delete("/:id", CouponController.deleteCoupon);
router.get("/validate/:code", CouponController.validateCoupon);

export const CouponRoutes = router;
