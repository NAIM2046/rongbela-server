import { NextFunction, Request, RequestHandler, Response } from "express";

export default function catchAsync(fn: RequestHandler) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}