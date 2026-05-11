import { Request, Response } from "express";
import statusCode from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { JwtUser } from "../auth/auth.middleware";
import { OrderServices } from "./order.service";

const initiateCODOrder = catchAsync(
  async (req: Request & { user?: JwtUser }, res: Response) => {
    const userId = req.user?.userId as string;
    const body = req.body as OrderPayload;
    const result = await OrderServices.takeCODOrder(body);
    sendResponse(res, {
      data: result,
      success: true,
      message: "Order placed successfully (Cash on Delivery)",
      statusCode: statusCode.OK,
    });
  },
);

const updateOrderStatus = catchAsync(
  async (req: Request & { user?: JwtUser }, res: Response) => {
    const userId = req.user?.userId as string;
    const { orderId, status } = req.body;
    const result = await OrderServices.updateOrderStatus();
    sendResponse(res, {
      data: result,
      success: true,
      message: "Order status updated successfully.",
      statusCode: statusCode.OK,
    });
  },
);

const getCustomerOrders = catchAsync(
  async (req: Request & { user?: JwtUser }, res: Response) => {
    const result = await OrderServices.getCustomerOrders();
    sendResponse(res, {
      data: result.data,
      meta: result.meta,
      success: true,
      message: "Customer Orders Retrieved Successfully.",
      statusCode: statusCode.OK,
    });
  },
);

export const OrderControllers = {
  initiateCODOrder,
  getCustomerOrders,
  updateOrderStatus,
};
