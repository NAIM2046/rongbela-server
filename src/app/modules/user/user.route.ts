// src/app/modules/customer/user/user.route.ts
import express from "express";
import {
  createUser,
} from "./user.controller";
import multer from "multer";
import { auth } from "../auth/auth.middleware";
const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
router.post("/", auth("ADMIN"), createUser);
export const UserRoutes = router;