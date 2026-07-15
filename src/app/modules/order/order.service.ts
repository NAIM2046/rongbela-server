import { prisma } from "../../../shared/prisma";
import ApiError from "../../error/ApiError";
import { sendSMS } from "../../../shared/sendSMS";


const getCustomerOrders = async (limit = 10, page = 1) => {
  try {
    const currentOrders = await prisma.order.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
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
        couponCode: true,
        discountAmount: true,
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
    // 1. Parse cart items: extract standard UUID (first 36 chars) as productId
    const parsedItems = orderPayload.items.map((item) => {
      const isVariant = item.id.length > 36;
      const productId = isVariant ? item.id.slice(0, 36) : item.id;
      const variantId = isVariant ? item.id.slice(37) : null;
      return {
        ...item,
        productId,
        variantId,
      };
    });

    const productIds = Array.from(new Set(parsedItems.map((item) => item.productId)));

    // 2. Fetch products from database
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      select: {
        id: true,
        images: true,
        title: true,
        productVariants: true,
      },
    });

    // 3. Map parsed cart items to database order items structure
    const productWithQuantityAndPrice = parsedItems.map((cartItem) => {
      const dbProduct = products.find((p) => p.id === cartItem.productId);
      const matchedVariant = cartItem.variantId
        ? dbProduct?.productVariants?.find((v) => v.id === cartItem.variantId)
        : null;

      return {
        productId: cartItem.productId,
        variantId: cartItem.variantId,
        quantity: cartItem.quantity,
        price: cartItem.price,
        image: cartItem.image || dbProduct?.images?.[0]?.url || "",
        title: cartItem.title,
        productUrl: cartItem.productUrl || "",
        variantInfo: matchedVariant?.attributes || null,
      };
    });

    const fullCustomerAddress = JSON.stringify({
      ...orderPayload.shippingAddress,
      ...orderPayload.customer,
    });

    const result = await prisma.$transaction(async (tx) => {
      // Stock Validation: Ensure enough inventory is available before taking the order
      for (const item of productWithQuantityAndPrice) {
        if (item.variantId) {
          const variantRecord = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            select: { stock: true },
          });

          if (!variantRecord) {
            throw new ApiError(400, `Variant not found for item: ${item.title}`);
          }

          if (variantRecord.stock < (item.quantity || 0)) {
            throw new ApiError(
              400,
              `Insufficient stock for "${item.title}". Available: ${variantRecord.stock}, Requested: ${item.quantity}`
            );
          }
        }
      }

      let discountAmount = 0;
      let couponCode: string | null = null;

      if (orderPayload.couponCode) {
        const coupon = await tx.coupon.findUnique({
          where: { code: orderPayload.couponCode.trim().toUpperCase() },
        });

        if (coupon && coupon.isActive) {
          const subtotal = productWithQuantityAndPrice.reduce(
            (acc, item) => acc + (item.price || 0) * (item.quantity || 0),
            0
          );
          discountAmount = (subtotal * coupon.discountPercent) / 100;
          couponCode = coupon.code;
        } else {
          throw new ApiError(400, "Invalid or expired coupon code");
        }
      }

      const subtotal = productWithQuantityAndPrice.reduce(
        (acc, item) => acc + (item.price || 0) * (item.quantity || 0),
        0
      );
      const expectedTotal = Math.max(0, subtotal - discountAmount);

      const newOrder = await tx.order.create({
        data: {
          totalAmount: expectedTotal,
          couponCode: couponCode,
          discountAmount: discountAmount,
          orderStatus: "PROCESSING",
          paymentGateway: "COD",
          shippingAddress: fullCustomerAddress,
          orderItems: {
            create: productWithQuantityAndPrice.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              productName: item.title,
              productImage: item.image,
              quantity: item.quantity || 0,
              unitPrice: item.price || 0,
              totalPrice: (item.price || 0) * (item.quantity || 0),
              variant: item.variantInfo as any,
            })),
          },
          orderPayments: {
            create: {
              amount: expectedTotal,
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

    // Send notifications
    const sellerNumber = "01575606194"; // Seller's phone number
    const userNumber = orderPayload.customer.phone;
    

   

    const sellerMessage = `New Order Placed!\nCustomer: ${orderPayload.customer.name} (${userNumber})}`;
    const userMessage = `Thank you ${orderPayload.customer.name} for your order at Rongbela! We have received your order. Total: Tk ${orderPayload.totalAmount}. The seller will contact you for shipping price.`;

    // WhatsApp details for Admin
    const whatsappMessage = `🔔 *New Order Notification!*\n\n*Customer Details:*\n- Name: ${orderPayload.customer.name}\n- Phone: ${userNumber}\n- `;

    try {
      // 1. Send SMS alerts
      await sendSMS(sellerNumber, sellerMessage);
      await sendSMS(userNumber, userMessage);
    } catch (smsError) {
      console.error("SMS notification error:", smsError);
    }

    try {
      
    } catch (waError) {
      console.error("WhatsApp notification error:", waError);
    }

    return result;
  } catch (error: any) {
    console.error("Error creating COD order:", error);
    throw new ApiError(500, error.message || "Failed to take cod order.");
  }
};

const updateOrderStatus = async (orderId: string, status: any) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    const previousStatus = order.orderStatus;

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Update order status
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { orderStatus: status },
      });

      // 2. Stock Deduction: If transitioning to CONFIRMED, SHIPPED, or DELIVERED, and previous status wasn't already confirmed
      const isConfirmedState = (s: string) => ["CONFIRMED", "SHIPPED", "DELIVERED"].includes(s);
      
      if (isConfirmedState(status) && !isConfirmedState(previousStatus)) {
        for (const item of order.orderItems) {
          if (item.variantId) {
            // Decrement variant stock
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { decrement: item.quantity } },
            });
          }
        }
      }

      // 3. Stock Restoring: If transitioning to CANCELLED from a confirmed/shipped/delivered state
      if (status === "CANCELLED" && isConfirmedState(previousStatus)) {
        for (const item of order.orderItems) {
          if (item.variantId) {
            // Restore variant stock
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
      }

      return updated;
    });

    // 4. Notifications on delivery (completion)
    if (status === "DELIVERED") {
      let customerPhone = "";
      let customerName = "Customer";

      try {
        const address =
          typeof order.shippingAddress === "string"
            ? JSON.parse(order.shippingAddress)
            : (order.shippingAddress as any);
        customerPhone = address?.phone || address?.alternativePhone || "";
        customerName = address?.recipientName || address?.name || "Customer";
      } catch (e) {
        console.error("Failed to parse shipping address for SMS:", e);
      }

      // Send SMS to customer
      if (customerPhone) {
        const smsMessage = `Thank you ${customerName}! Your order (ID: ${orderId.slice(0, 8)}) at Rongbela has been completed and delivered.`;
        try {
          await sendSMS(customerPhone, smsMessage);
        } catch (smsError) {
          console.error("SMS notification failed:", smsError);
        }
      }

     
      try {
        
      } catch (waError) {
        console.error("WhatsApp notification failed:", waError);
      }
    }

    return updatedOrder;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, error.message || "Failed to update order status");
  }
};

export const OrderServices = {
  getCustomerOrders,
  takeCODOrder,
  updateOrderStatus,
};
