// src/app/auth/auth.router.ts
import express from "express";
import {  forgotPassword, getMe, googleLogin, login, logout, refreshToken, resetPasswordWithOtp } from "./auth.controller";
import { auth } from "./auth.middleware";

const router = express.Router();

router.post("/login", login);
router.post("/google-login", googleLogin);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);
router.get("/me", auth(), getMe);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPasswordWithOtp);


export const AuthRoutes = router;