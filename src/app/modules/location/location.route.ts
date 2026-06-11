import express from "express";
import { LocationController } from "./location.controller";

const router = express.Router();

// ফ্রন্টএন্ডে লোকেশন ডেটা পাঠানোর পাবলিক এন্ডপয়েন্ট
router.get("/", LocationController.getAllLocations);

export const LocationRoutes = router;