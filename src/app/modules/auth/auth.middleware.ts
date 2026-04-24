// src/app/auth/auth.middleware.ts
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";


import httpStatus from "http-status"; 
import ApiError from "../../error/ApiError";


interface JwtUser {
  userId: string;
  role: Role;
  
}

export const auth =
  (...authRoles: Role[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      let token: string | undefined;

      if (typeof authHeader === "string") {
        token = authHeader;
      } else if (req.cookies?.accessToken) {
        token = req.cookies.accessToken;
      }

      if (!token) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized: Token missing");
      }

      if (token.startsWith("Bearer ")) {
        token = token.split(" ")[1];
      }

      const decoded = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET as string
      ) as JwtUser;

      const user = {
        userId: decoded.userId,
        role: decoded.role,
       
      };

      req.user = user;


      if (authRoles.length > 0 && !authRoles.includes(user.role)) {
        throw new ApiError(httpStatus.FORBIDDEN, "Forbidden: Insufficient permissions");
      }

      next();
    } catch (error: any) {
      
      if (error.name === "TokenExpiredError") {
        next(new ApiError(httpStatus.UNAUTHORIZED, "Token expired"));
      } else if (error instanceof ApiError) {
        next(error); 
      } else {
        next(new ApiError(httpStatus.UNAUTHORIZED, "Invalid token"));
      }
    }
    };
  