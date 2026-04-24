// src/app/auth/auth.router.ts
import express from "express";
import { AuthController, changePassword, getMe, login, logout, refreshToken } from "./auth.controller";
import { auth } from "./auth.middleware";

const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);
router.get("/me",auth(),  getMe);
router.patch("/change-password", auth(), changePassword);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);

export const AuthRoutes = router;