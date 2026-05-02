// src/app/routes/index.ts
import express from "express";
import { AuthRoutes } from "../modules/auth/auth.router";
import { productCategoryRoutes } from "../modules/ProductCategory/productCategory.routes";
import { MediaRoutes } from "../modules/media/media.router";
import { ProductRoutes } from "../modules/product/product.router";


export const router = express.Router();

const appRoutes = [
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/product-category",
    route: productCategoryRoutes
  },
  {
    path: "/media",
    route: MediaRoutes
  },
  {
    path: "/product",
    route: ProductRoutes
  }
  
];

appRoutes.forEach((route) => router.use(route.path, route.route));