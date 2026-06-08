// src/app/routes/index.ts
import express from "express";
import { AuthRoutes } from "../modules/auth/auth.router";
import { productCategoryRoutes } from "../modules/ProductCategory/productCategory.routes";
import { MediaRoutes } from "../modules/media/media.router";
import { ProductRoutes } from "../modules/product/product.router";
import { BannerRoutes } from "../modules/BannerManagement/banner.routes";
import { OrderRoutes } from "../modules/order/order.route";
import { UserRoutes } from "../modules/user/user.route";

export const router = express.Router();

const appRoutes = [
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/product-category",
    route: productCategoryRoutes,
  },
  {
    path: "/media",
    route: MediaRoutes,
  },
  {
    path: "/product",
    route: ProductRoutes,
  },
  {
    path: "/banner",
    route: BannerRoutes,
  },
  {
    path: "/order",
    route: OrderRoutes,
  },
  {
    path: "/user",
    route: UserRoutes
  }
];

appRoutes.forEach((route) => router.use(route.path, route.route));
