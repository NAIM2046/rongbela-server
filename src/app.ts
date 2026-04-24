// src/app.ts
import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import { router } from "./app/routes";
import globalErrorHandler from "./app/error/globalErrorHandler";
const app = express();
app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
    exposedHeaders: ["set-cookie"],
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", router);
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Welcome to JU Transport API",
  });
});
app.post("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: " ok vai",
  });
});
app.use(globalErrorHandler);

export default app;
