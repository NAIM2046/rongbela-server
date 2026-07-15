import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { SalesService } from "./sales.service";
import httpStatus from "http-status";

// ─── Stock Controllers ────────────────────────────────────────────────────────

const getStockItems = catchAsync(async (req: Request, res: Response) => {
  const result = await SalesService.getStockItems();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stock items retrieved successfully",
    data: result,
  });
});

const addStockItem = catchAsync(async (req: Request, res: Response) => {
  const result = await SalesService.addStockItem(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "New stock item added successfully",
    data: result,
  });
});

const updateStockItem = catchAsync(async (req: Request, res: Response) => {
  const { variantId } = req.params;
  const result = await SalesService.updateStockItem(variantId as string, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stock item updated successfully",
    data: result,
  });
});

// ─── POS Sales Controllers ───────────────────────────────────────────────────

const getAllSales = catchAsync(async (req: Request, res: Response) => {
  const result = await SalesService.getAllSales();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "POS Sales retrieved successfully",
    data: result,
  });
});

const recordSale = catchAsync(async (req: Request, res: Response) => {
  const result = await SalesService.recordSale(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Offline sale recorded successfully",
    data: result,
  });
});

const updateSale = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SalesService.updateSale(id as string, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "POS Sale updated successfully",
    data: result,
  });
});

const deleteSale = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SalesService.deleteSale(id as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "POS Sale deleted successfully",
    data: result,
  });
});

const getAnalytics = catchAsync(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  const result = await SalesService.getAnalytics(
    startDate as string | undefined,
    endDate as string | undefined
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Business analytics reports generated successfully",
    data: result,
  });
});

const searchCustomers = catchAsync(async (req: Request, res: Response) => {
  const { query } = req.query;
  const result = await SalesService.searchCustomers(query as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Customers retrieved successfully",
    data: result,
  });
});

export const SalesController = {
  getStockItems,
  addStockItem,
  updateStockItem,
  getAllSales,
  recordSale,
  updateSale,
  deleteSale,
  getAnalytics,
  searchCustomers,
};
