import { prisma } from "../../../shared/prisma";
import ApiError from "../../error/ApiError";

const getCustomerOrders = async (limit = 10, page = 1) => {
  try {
    const currentOrders = await prisma.order.findMany({
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        shippingAddress: true,
        orderItems: {
          select: {
            productImage: true,
            quantity: true,
            productName: true,
            totalPrice: true,
            unitPrice: true,
          },
        },
        createdAt: true,
        orderStatus: true,
        totalAmount: true,
      },
    });

    const totalOrders = await prisma.order.count();
    const totalPages = Math.ceil(totalOrders / limit);

    return {
      data: currentOrders,
      meta: {
        totalPages,
        limit,
        page,
        total: totalOrders,
      },
    };
  } catch (error: any) {
    console.error("Error creating COD order:", error);
    throw new ApiError(500, error.message || "Failed to take cod order.");
  }
};

export const getTransactionId = (): string => {
  const charset = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Removed 'I' and 'O' to avoid confusion with 1 and 0
  const array = new Uint32Array(10);
  crypto.getRandomValues(array);

  return Array.from(array)
    .map((x) => charset[x % charset.length])
    .join("");
};

const takeCODOrder = async (orderPayload: OrderPayload) => {
  console.log({ orderPayload });
  try {
    let productIds = orderPayload.items.map((item) => item.id);

    const products = await prisma.product.findMany({
      where: {
        AND: {
          id: {
            in: productIds,
          },
        },
      },
      select: {
        id: true,
        images: true,
        title: true,
      },
    });

    const productWithQantityAndPrice = products.map((product) => {
      const currentProduct = orderPayload.items.find(
        (item) => item.id == product.id,
      );
      return {
        id: product.id,
        quantity: currentProduct?.quantity,
        price: currentProduct?.price,
        image: product.images[0]?.url,
        title: product.title,
      };
    });

    const fullCustomerAddress = JSON.stringify({
      ...orderPayload.shippingAddress,
      ...orderPayload.customer,
    });

    const result = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          totalAmount: orderPayload.totalAmount,
          orderStatus: "PROCESSING",
          paymentGateway: "COD",
          shippingAddress: fullCustomerAddress,
          orderItems: {
            create: productWithQantityAndPrice.map((item) => ({
              productId: item.id,
              productName: item.title,
              productImage: item.image,
              quantity: item.quantity || 0,
              unitPrice: item.price || 0,
              totalPrice: (item.price || 0) * (item.quantity || 0),
            })),
          },
          orderPayments: {
            create: {
              amount: orderPayload.totalAmount,
              gateway: "COD",
              transactionId: getTransactionId(),
              status: "PENDING",
            },
          },
        },
        include: {
          orderItems: true,
          orderPayments: true,
        },
      });
      return newOrder;
    });
    return null;
  } catch (error: any) {
    console.error("Error creating COD order:", error);
    throw new ApiError(500, error.message || "Failed to take cod order.");
  }
};

const updateOrderStatus = async () => {
  try {
  } catch (error) {}
};

export const OrderServices = {
  getCustomerOrders,
  takeCODOrder,
  updateOrderStatus,
};
