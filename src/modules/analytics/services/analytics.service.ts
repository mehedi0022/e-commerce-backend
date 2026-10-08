import { Temporal } from "temporal-polyfill";
import type {
  DashboardAnalyticsResponse,
  DashboardPeriod,
  DashboardQuery,
  OrderStatusBreakdown,
  SalesTrendPoint,
  DashboardPaymentDistribution,
} from "../analytics.types.js";
import * as repo from "../repositories/analytics.repository.js";

const calculatePercentageChange = (current: number, previous: number) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  const change = ((current - previous) / previous) * 100;
  return Number(change.toFixed(1));
};

export const getDashboardAnalytics = async (
  query: DashboardQuery,
): Promise<DashboardAnalyticsResponse> => {
  const period: DashboardPeriod = query.period || "30d";
  const now = Temporal.Now.instant();

  let currentStart: Temporal.Instant;
  let currentEnd: Temporal.Instant = now;
  let prevStart: Temporal.Instant;
  let prevEnd: Temporal.Instant;
  let trendBucketCount = 7;
  let bucketType: "hour" | "day" = "day";

  if (period === "today") {
    // Current period: Last 24 hours (or today)
    currentStart = now.subtract({ hours: 24 });
    prevEnd = currentStart;
    prevStart = prevEnd.subtract({ hours: 24 });
    trendBucketCount = 8; // Every 3 hours
    bucketType = "hour";
  } else if (period === "7d") {
    currentStart = now.subtract({ hours: 24 * 7 });
    prevEnd = currentStart;
    prevStart = prevEnd.subtract({ hours: 24 * 7 });
    trendBucketCount = 7;
    bucketType = "day";
  } else if (period === "custom" && query.startDate && query.endDate) {
    try {
      currentStart = Temporal.Instant.from(new Date(query.startDate).toISOString());
      currentEnd = Temporal.Instant.from(new Date(query.endDate).toISOString());
      const diffMs = currentEnd.epochMilliseconds - currentStart.epochMilliseconds;
      prevEnd = currentStart;
      prevStart = Temporal.Instant.fromEpochMilliseconds(currentStart.epochMilliseconds - diffMs);
      trendBucketCount = 10;
      bucketType = "day";
    } catch {
      currentStart = now.subtract({ hours: 24 * 30 });
      prevEnd = currentStart;
      prevStart = prevEnd.subtract({ hours: 24 * 30 });
      trendBucketCount = 15;
      bucketType = "day";
    }
  } else {
    // Default: 30 days
    currentStart = now.subtract({ hours: 24 * 30 });
    prevEnd = currentStart;
    prevStart = prevEnd.subtract({ hours: 24 * 30 });
    trendBucketCount = 15;
    bucketType = "day";
  }

  // Execute database queries concurrently
  const [
    currentOrders,
    previousOrders,
    recentOrdersRaw,
    customerStats,
    inventoryData,
    returnsData,
    topProducts,
  ] = await Promise.all([
    repo.getOrdersInDateRange(currentStart, currentEnd),
    repo.getOrdersInDateRange(prevStart, prevEnd),
    repo.getRecentOrders(6),
    repo.getCustomerCounts(currentStart, currentEnd, prevStart, prevEnd),
    repo.getInventoryStatus(),
    repo.getReturnsAndRefunds(),
    repo.getTopSellingProducts(currentStart, currentEnd, 5),
  ]);

  // Compute Revenue and Sales
  const validCurrentOrders = currentOrders.filter((o: any) => o.status !== "CANCELLED");
  const validPrevOrders = previousOrders.filter((o: any) => o.status !== "CANCELLED");

  const totalSales = validCurrentOrders.reduce(
    (acc: number, o: any) => acc + Number(o.grandTotal || 0),
    0,
  );
  const prevSales = validPrevOrders.reduce(
    (acc: number, o: any) => acc + Number(o.grandTotal || 0),
    0,
  );

  const salesChangePercent = calculatePercentageChange(totalSales, prevSales);
  const ordersChangePercent = calculatePercentageChange(
    validCurrentOrders.length,
    validPrevOrders.length,
  );

  const aov =
    validCurrentOrders.length > 0 ? totalSales / validCurrentOrders.length : 0;

  // Order status breakdown
  const orderStatusBreakdown: OrderStatusBreakdown = {
    pending: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    returned: 0,
  };

  const paymentMethodCounts: Record<string, { count: number; total: number }> = {};

  for (const o of currentOrders) {
    const st = String(o.status || "").toLowerCase();
    if (st in orderStatusBreakdown) {
      (orderStatusBreakdown as any)[st]++;
    }

    const pm = String(o.paymentMethod || "CASH_ON_DELIVERY");
    if (!paymentMethodCounts[pm]) {
      paymentMethodCounts[pm] = { count: 0, total: 0 };
    }
    paymentMethodCounts[pm].count++;
    paymentMethodCounts[pm].total += Number(o.grandTotal || 0);
  }

  // Payment distribution
  const paymentMethodLabels: Record<string, string> = {
    CASH_ON_DELIVERY: "Cash on Delivery",
    ONLINE: "Online Gateway (bKash/Cards)",
    PARTIAL_COD: "Partial COD with Advance",
  };

  const totalOrdersCount = currentOrders.length || 1;
  const paymentDistribution: DashboardPaymentDistribution[] = Object.entries(
    paymentMethodCounts,
  ).map(([method, data]) => ({
    method,
    label: paymentMethodLabels[method] || method,
    count: data.count,
    totalAmount: data.total.toFixed(2),
    percentage: Number(((data.count / totalOrdersCount) * 100).toFixed(1)),
  }));

  // Build Time-Series Sales Trend Buckets
  const salesTrend: SalesTrendPoint[] = [];
  const startMs = currentStart.epochMilliseconds;
  const endMs = currentEnd.epochMilliseconds;
  const bucketDurationMs = (endMs - startMs) / trendBucketCount;

  for (let i = 0; i < trendBucketCount; i++) {
    const bucketStartMs = startMs + i * bucketDurationMs;
    const bucketEndMs = bucketStartMs + bucketDurationMs;
    const bucketDate = new Date(bucketStartMs);

    let label = "";
    if (bucketType === "hour") {
      const hours = bucketDate.getHours().toString().padStart(2, "0");
      const minutes = bucketDate.getMinutes().toString().padStart(2, "0");
      label = `${hours}:${minutes}`;
    } else {
      label = bucketDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }

    // Filter orders in this slice
    const ordersInSlice = validCurrentOrders.filter((o: any) => {
      const orderMs =
        typeof o.createdAt?.epochMilliseconds === "number"
          ? o.createdAt.epochMilliseconds
          : new Date(o.createdAt).getTime();
      return orderMs >= bucketStartMs && orderMs < bucketEndMs;
    });

    const sliceSales = ordersInSlice.reduce(
      (sum: number, o: any) => sum + Number(o.grandTotal || 0),
      0,
    );

    salesTrend.push({
      label,
      date: bucketDate.toISOString().split("T")[0],
      sales: Number(sliceSales.toFixed(2)),
      orders: ordersInSlice.length,
    });
  }

  // Format recent orders
  const recentOrders = recentOrdersRaw.map((o: any) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName || "Customer",
    customerPhone: o.customerPhone || "N/A",
    grandTotal: String(o.grandTotal),
    status: o.status,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    itemCount: o.items?.length || 0,
    createdAt:
      typeof o.createdAt?.toString === "function"
        ? o.createdAt.toString()
        : new Date(o.createdAt).toISOString(),
  }));

  const activeOrdersCount =
    orderStatusBreakdown.pending +
    orderStatusBreakdown.confirmed +
    orderStatusBreakdown.processing +
    orderStatusBreakdown.shipped;

  const customersChangePercent = calculatePercentageChange(
    customerStats.newInPeriod,
    customerStats.previousNew,
  );

  return {
    period,
    dateRange: {
      startDate: new Date(startMs).toISOString(),
      endDate: new Date(endMs).toISOString(),
    },
    metrics: {
      sales: {
        value: Number(totalSales.toFixed(2)),
        formattedValue: `৳${Number(totalSales.toFixed(2)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        previousValue: Number(prevSales.toFixed(2)),
        formattedPreviousValue: `৳${Number(prevSales.toFixed(2)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        changePercentage: salesChangePercent,
        trend: salesChangePercent >= 0 ? "up" : "down",
        aov: Number(aov.toFixed(2)),
        formattedAov: `৳${Number(aov.toFixed(2)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
      orders: {
        value: validCurrentOrders.length,
        formattedValue: validCurrentOrders.length.toLocaleString("en-US"),
        previousValue: validPrevOrders.length,
        formattedPreviousValue: validPrevOrders.length.toLocaleString("en-US"),
        changePercentage: ordersChangePercent,
        trend: ordersChangePercent >= 0 ? "up" : "down",
        activeOrdersCount,
      },
      customers: {
        value: customerStats.newInPeriod,
        formattedValue: customerStats.newInPeriod.toLocaleString("en-US"),
        previousValue: customerStats.previousNew,
        formattedPreviousValue: customerStats.previousNew.toLocaleString("en-US"),
        changePercentage: customersChangePercent,
        trend: customersChangePercent >= 0 ? "up" : "down",
        totalCustomers: customerStats.totalCustomers,
      },
      inventory: inventoryData.summary,
      returns: returnsData,
    },
    orderStatusBreakdown,
    salesTrend,
    recentOrders,
    lowStockItems: inventoryData.lowStockItems,
    topSellingProducts: topProducts,
    paymentDistribution,
    updatedAt: new Date().toISOString(),
  };
};
