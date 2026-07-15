import { prisma } from "../../../shared/prisma";
import ApiError from "../../error/ApiError";
import httpStatus from "http-status";
import { format } from "date-fns";

// ─── Stock Services ──────────────────────────────────────────────────────────

const getStockItems = async () => {
  try {
    return await prisma.stock.findMany({
      orderBy: {
        productName: "asc",
      },
    });
  } catch (error: any) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Failed to retrieve stock items"
    );
  }
};

const addStockItem = async (payload: {
  productName: string;
  buyingPrice?: number;
  stock?: number;
}) => {
  try {
    const existing = await prisma.stock.findUnique({
      where: { productName: payload.productName.trim() },
    });

    if (existing) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Product name already exists in Stock."
      );
    }

    return await prisma.stock.create({
      data: {
        productName: payload.productName.trim(),
        buyingPrice: payload.buyingPrice ?? 0,
        stock: payload.stock ?? 0,
      },
    });
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Failed to add product to stock"
    );
  }
};

const updateStockItem = async (
  stockId: string,
  payload: {
    productName?: string;
    buyingPrice?: number;
    stock?: number;
  }
) => {
  try {
    const existing = await prisma.stock.findUnique({
      where: { id: stockId },
    });

    if (!existing) {
      throw new ApiError(httpStatus.NOT_FOUND, "Stock record not found");
    }

    // If renaming, check uniqueness
    if (payload.productName && payload.productName.trim() !== existing.productName) {
      const isTaken = await prisma.stock.findUnique({
        where: { productName: payload.productName.trim() },
      });
      if (isTaken) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "New product name is already taken."
        );
      }
    }

    return await prisma.stock.update({
      where: { id: stockId },
      data: {
        productName: payload.productName ? payload.productName.trim() : existing.productName,
        buyingPrice: payload.buyingPrice !== undefined ? payload.buyingPrice : existing.buyingPrice,
        stock: payload.stock !== undefined ? payload.stock : existing.stock,
      },
    });
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Failed to update stock record"
    );
  }
};

// ─── POS Sales Services ──────────────────────────────────────────────────────

const getAllSales = async () => {
  try {
    return await prisma.pOSSale.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        stock: {
          select: {
            productName: true,
          },
        },
      },
    });
  } catch (error: any) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Failed to retrieve sales log"
    );
  }
};

const recordSale = async (payload: {
  productName: string;
  stockId?: string;
  quantity: number;
  totalBill: number;
  customerName: string;
  phone: string;
  paymentMethod: string;
  notes?: string;
}) => {
  try {
    // If stockId is provided, check stock and decrement it
    if (payload.stockId) {
      const stockItem = await prisma.stock.findUnique({
        where: { id: payload.stockId },
      });

      if (!stockItem) {
        throw new ApiError(httpStatus.NOT_FOUND, "Product not found in Stock.");
      }

      if (stockItem.stock < payload.quantity) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Insufficient inventory stock. Available: ${stockItem.stock}`
        );
      }

      // Decrement stock
      await prisma.stock.update({
        where: { id: payload.stockId },
        data: {
          stock: {
            decrement: payload.quantity,
          },
        },
      });
    }

    // Record the offline/online manual sale
    return await prisma.pOSSale.create({
      data: {
        productName: payload.productName.trim(),
        stockId: payload.stockId || null,
        quantity: payload.quantity,
        totalBill: payload.totalBill,
        customerName: payload.customerName.trim(),
        phone: payload.phone.trim(),
        paymentMethod: payload.paymentMethod,
        notes: payload.notes || null,
      },
    });
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Failed to record sale transaction"
    );
  }
};

const updateSale = async (
  saleId: string,
  payload: {
    productName?: string;
    stockId?: string;
    quantity?: number;
    totalBill?: number;
    customerName?: string;
    phone?: string;
    paymentMethod?: string;
    notes?: string;
  }
) => {
  try {
    const existing = await prisma.pOSSale.findUnique({
      where: { id: saleId },
    });

    if (!existing) {
      throw new ApiError(httpStatus.NOT_FOUND, "POS Sale record not found");
    }

    // Adjust stock levels if quantity or stock link has changed
    if (payload.stockId || payload.quantity !== undefined) {
      const finalStockId = payload.stockId ?? existing.stockId;
      const finalQuantity = payload.quantity ?? existing.quantity;

      // Restore stock to previous stock item (if it existed)
      if (existing.stockId) {
        await prisma.stock.update({
          where: { id: existing.stockId },
          data: {
            stock: {
              increment: existing.quantity,
            },
          },
        });
      }

      // Deduct stock from new stock item
      if (finalStockId) {
        const targetStock = await prisma.stock.findUnique({
          where: { id: finalStockId },
        });

        if (!targetStock) {
          throw new ApiError(httpStatus.NOT_FOUND, "Target stock item not found");
        }

        if (targetStock.stock < finalQuantity) {
          // Rollback previous restore
          if (existing.stockId) {
            await prisma.stock.update({
              where: { id: existing.stockId },
              data: {
                stock: {
                  decrement: existing.quantity,
                },
              },
            });
          }
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Insufficient stock on target item. Available: ${targetStock.stock}`
          );
        }

        await prisma.stock.update({
          where: { id: finalStockId },
          data: {
            stock: {
              decrement: finalQuantity,
            },
          },
        });
      }
    }

    return await prisma.pOSSale.update({
      where: { id: saleId },
      data: {
        productName: payload.productName ?? existing.productName,
        stockId: payload.stockId !== undefined ? payload.stockId : existing.stockId,
        quantity: payload.quantity ?? existing.quantity,
        totalBill: payload.totalBill ?? existing.totalBill,
        customerName: payload.customerName ?? existing.customerName,
        phone: payload.phone ?? existing.phone,
        paymentMethod: payload.paymentMethod ?? existing.paymentMethod,
        notes: payload.notes !== undefined ? payload.notes : existing.notes,
      },
    });
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Failed to update sale transaction"
    );
  }
};

const deleteSale = async (saleId: string) => {
  try {
    const existing = await prisma.pOSSale.findUnique({
      where: { id: saleId },
    });

    if (!existing) {
      throw new ApiError(httpStatus.NOT_FOUND, "POS Sale record not found");
    }

    // Restore stock if variant was linked
    if (existing.stockId) {
      await prisma.stock.update({
        where: { id: existing.stockId },
        data: {
          stock: {
            increment: existing.quantity,
          },
        },
      });
    }

    // Delete POS sale record
    await prisma.pOSSale.delete({
      where: { id: saleId },
    });

    return { success: true };
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Failed to delete sale transaction"
    );
  }
};

const getAnalytics = async (startDate?: string, endDate?: string) => {
  try {
    const whereClause: any = {};

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(`${startDate}T00:00:00.000Z`),
        lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    }

    // 1. Fetch sales in date range
    const salesInPeriod = await prisma.pOSSale.findMany({
      where: whereClause,
      include: {
        stock: {
          select: {
            buyingPrice: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // 2. Fetch all stocks for inventory cost value
    const allStocks = await prisma.stock.findMany();

    // 3. Core Calculations
    let totalSales = 0;
    let totalCOGS = 0;
    const paymentStats = { CASH: 0, ONLINE: 0, cashCount: 0, onlineCount: 0 };

    // Grouping variables
    const dailyMap: Record<string, { sales: number; profit: number }> = {};
    const bestSellersMap: Record<
      string,
      { productName: string; qty: number; salesVal: number; profitVal: number }
    > = {};
    const customerMap: Record<
      string,
      { name: string; phone: string; totalSpend: number; ordersCount: number }
    > = {};

    salesInPeriod.forEach((sale) => {
      totalSales += sale.totalBill;

      const unitBuyingPrice = sale.stock?.buyingPrice ?? 0;
      const cogsVal = sale.quantity * unitBuyingPrice;
      totalCOGS += cogsVal;
      const profitVal = sale.totalBill - cogsVal;

      // Payment stats
      if (sale.paymentMethod === "ONLINE") {
        paymentStats.ONLINE += sale.totalBill;
        paymentStats.onlineCount += 1;
      } else {
        paymentStats.CASH += sale.totalBill;
        paymentStats.cashCount += 1;
      }

      // Daily trend mapping
      const dateStr = format(new Date(sale.createdAt), "yyyy-MM-dd");
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { sales: 0, profit: 0 };
      }
      dailyMap[dateStr].sales += sale.totalBill;
      dailyMap[dateStr].profit += profitVal;

      // Best sellers mapping
      if (!bestSellersMap[sale.productName]) {
        bestSellersMap[sale.productName] = {
          productName: sale.productName,
          qty: 0,
          salesVal: 0,
          profitVal: 0,
        };
      }
      bestSellersMap[sale.productName].qty += sale.quantity;
      bestSellersMap[sale.productName].salesVal += sale.totalBill;
      bestSellersMap[sale.productName].profitVal += profitVal;

      // Customer mapping
      const custKey = `${sale.customerName.trim()}-${sale.phone.trim()}`;
      if (!customerMap[custKey]) {
        customerMap[custKey] = {
          name: sale.customerName,
          phone: sale.phone,
          totalSpend: 0,
          ordersCount: 0,
        };
      }
      customerMap[custKey].totalSpend += sale.totalBill;
      customerMap[custKey].ordersCount += 1;
    });

    const netProfit = totalSales - totalCOGS;
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
    const averageOrderValue = salesInPeriod.length > 0 ? totalSales / salesInPeriod.length : 0;

    // Format best sellers list
    const bestSellers = Object.values(bestSellersMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    // Format daily stats list
    const dailyStats = Object.entries(dailyMap).map(([date, data]) => ({
      date,
      sales: data.sales,
      profit: data.profit,
    }));

    // Customer Analysis calculations
    const customerList = Object.values(customerMap);
    const topCustomers = [...customerList]
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 10);

    const repeatCustomers = customerList.filter((c) => c.ordersCount > 1).length;
    const repeatCustomerRate = customerList.length > 0 ? (repeatCustomers / customerList.length) * 100 : 0;

    // Inventory status overview
    let totalStockItems = 0;
    let totalStockCostValue = 0;
    let lowStockCount = 0;

    allStocks.forEach((item) => {
      totalStockItems += item.stock;
      totalStockCostValue += item.stock * item.buyingPrice;
      if (item.stock <= 5) {
        lowStockCount += 1;
      }
    });

    return {
      totalSales,
      totalCOGS,
      netProfit,
      profitMargin,
      averageOrderValue,
      salesCount: salesInPeriod.length,
      paymentStats,
      bestSellers,
      dailyStats,
      customerStats: {
        totalUniqueCustomers: customerList.length,
        repeatCustomerRate,
        topCustomers,
      },
      stockOverview: {
        totalStockItems,
        totalStockCostValue,
        lowStockCount,
      },
    };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Failed to generate business analytics reports"
    );
  }
};

const searchCustomers = async (query: string) => {
  try {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const trimmedQuery = query.trim();

    // 1. Fetch matching registered customers
    const registeredUsers = await prisma.user.findMany({
      where: {
        role: "CUSTOMER",
        OR: [
          { name: { contains: trimmedQuery, mode: "insensitive" } },
          { phone: { contains: trimmedQuery, mode: "insensitive" } },
        ],
      },
      select: {
        name: true,
        phone: true,
      },
      take: 5,
    });

    // 2. Fetch matching past POS sales customers
    const posSales = await prisma.pOSSale.findMany({
      where: {
        OR: [
          { customerName: { contains: trimmedQuery, mode: "insensitive" } },
          { phone: { contains: trimmedQuery, mode: "insensitive" } },
        ],
      },
      select: {
        customerName: true,
        phone: true,
      },
      take: 10,
    });

    // 3. Merge and deduplicate records based on phone
    const customersMap: Record<string, { name: string; phone: string }> = {};

    registeredUsers.forEach((user) => {
      if (user.phone) {
        customersMap[user.phone.trim()] = {
          name: user.name,
          phone: user.phone.trim(),
        };
      }
    });

    posSales.forEach((sale) => {
      if (sale.phone) {
        customersMap[sale.phone.trim()] = {
          name: sale.customerName,
          phone: sale.phone.trim(),
        };
      }
    });

    // Sort by prefix relevance
    const queryLower = trimmedQuery.toLowerCase();
    const sortedCustomers = Object.values(customersMap).sort((a, b) => {
      const aNameStart = a.name.toLowerCase().startsWith(queryLower);
      const bNameStart = b.name.toLowerCase().startsWith(queryLower);
      const aPhoneStart = a.phone.startsWith(trimmedQuery);
      const bPhoneStart = b.phone.startsWith(trimmedQuery);

      if ((aNameStart || aPhoneStart) && !(bNameStart || bPhoneStart)) return -1;
      if (!(aNameStart || aPhoneStart) && (bNameStart || bPhoneStart)) return 1;
      return 0;
    });

    return sortedCustomers.slice(0, 5);
  } catch (error: any) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Failed to search customer profiles"
    );
  }
};

export const SalesService = {
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
