import { prisma } from "../../../shared/prisma";
import ApiError from "../../error/ApiError";

const getCustomerOrders = async () => {
  try {
    const currentOrders = await prisma.order.findMany()
  } catch (error) {}
};

const getTransactionId = (): string => {
  const charset = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Removed 'I' and 'O' to avoid confusion with 1 and 0
  const array = new Uint32Array(10);
  crypto.getRandomValues(array);

  return Array.from(array)
    .map((x) => charset[x % charset.length])
    .join("");
};

const takeCODOrder = async (orderPayload: OrderPayload) => {
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
        price: true,
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
        image: product.images[0],
        title: product.title,
      };
    });

    const result = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          totalAmount: orderPayload.totalAmount,
          paymentStatus: "PENDING",
          paymentGateway: "COD",
          shippingAddress: JSON.stringify(orderPayload.shippingAddress),
          orderItems: {
            create: productWithQantityAndPrice.map((item) => ({
              productId: item.id,
              productName: item.title,
              productImage: item.image,
              quantity: item.quantity,
              unitPrice: item.price,
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

    return {
      success: true,
      message: "Order placed successfully (Cash on Delivery)",
      order: result,
    };
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
