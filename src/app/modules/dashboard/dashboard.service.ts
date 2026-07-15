import { prisma } from "../../../shared/prisma";
import ApiError from "../../error/ApiError";

const getDashboardStats = async () => {
  try {
    // 1. Calculate Total Revenue (Delivered, Confirmed, or Shipped orders)
    const revenueResult = await prisma.order.aggregate({
      _sum: {
        totalAmount: true,
      },
      where: {
        orderStatus: {
          in: ["CONFIRMED", "SHIPPED", "DELIVERED"],
        },
      },
    });
    const totalRevenue = revenueResult._sum.totalAmount ?? 0;

    // 2. Count Total Orders
    const totalOrders = await prisma.order.count();

    // 3. Count Pending (Processing) Orders
    const pendingOrders = await prisma.order.count({
      where: {
        orderStatus: "PROCESSING",
      },
    });

    // 4. Count Total Products
    const totalProducts = await prisma.product.count();

    // 5. Fetch Low-Stock Variants (Stock <= 5) for Emergency Information
    const lowStockVariants = await prisma.productVariant.findMany({
      where: {
        stock: {
          lte: 5,
        },
      },
      include: {
        product: {
          select: {
            title: true,
          },
        },
        image: {
          select: {
            url: true,
          },
        },
      },
      orderBy: {
        stock: "asc",
      },
    });

    // 6. Fetch Recent Orders (last 5 orders)
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        totalAmount: true,
        orderStatus: true,
        createdAt: true,
        shippingAddress: true,
      },
    });

    // Parse shipping addresses safely for customer names in recent orders list
    const formattedRecentOrders = recentOrders.map((order) => {
      let customerName = "Unknown Customer";
      try {
        const address =
          typeof order.shippingAddress === "string"
            ? JSON.parse(order.shippingAddress)
            : (order.shippingAddress as any);
        customerName = address?.recipientName || address?.name || "Unknown Customer";
      } catch (e) {
        // Fallback
      }

      return {
        id: order.id,
        totalAmount: order.totalAmount,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
        customerName,
      };
    });

    return {
      stats: {
        totalRevenue,
        totalOrders,
        pendingOrders,
        totalProducts,
      },
      lowStockVariants: lowStockVariants.map((variant) => ({
        id: variant.id,
        productId: variant.productId,
        productTitle: variant.product?.title || "Unknown Product",
        sku: variant.sku || "N/A",
        stock: variant.stock,
        attributes: variant.attributes || {},
        variantImage: variant.image?.url || "",
      })),
      recentOrders: formattedRecentOrders,
    };
  } catch (error: any) {
    throw new ApiError(500, error.message || "Failed to retrieve dashboard statistics.");
  }
};

export const DashboardServices = {
  getDashboardStats,
};
