// src/app/routes/index.ts
import express from "express";
import { AuthRoutes } from "../modules/auth/auth.router";


export const router = express.Router();

const appRoutes = [
  {
    path: "/auth",
    route: AuthRoutes,
  },
  
];

appRoutes.forEach((route) => router.use(route.path, route.route));