import express from "express";
import { BannerController } from "./banner.controller";
import { auth } from "../auth/auth.middleware";



const router = express.Router();


router.get("/", BannerController.getAllBanners);


router.post(
  "/create", 
 auth("ADMIN"), 
  BannerController.createBanner
);
router.patch(
  "/:id", 
  auth("ADMIN"), 
  BannerController.updateBanner
);

router.delete(
  "/:id", 
  auth("ADMIN"), 
  BannerController.deleteBanner
);

export const BannerRoutes = router;