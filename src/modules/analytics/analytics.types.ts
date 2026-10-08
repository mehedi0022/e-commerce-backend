export type DashboardPeriod = "today" | "7d" | "30d" | "custom";

export interface DashboardQuery {
  period?: DashboardPeriod;
  startDate?: string;
  endDate?: string;
}

export interface MetricWithComparison {
  value: number;
  formattedValue: string;
  previousValue: number;
  formattedPreviousValue: string;
  changePercentage: number;
  trend: "up" | "down" | "neutral";
}

export interface OrderStatusBreakdown {
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  returned: number;
}

export interface SalesTrendPoint {
  label: string;
  date: string;
  sales: number;
  orders: number;
}

export interface DashboardRecentOrder {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  grandTotal: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  itemCount: number;
  createdAt: string;
}

export interface DashboardLowStockItem {
  variantId: number;
  productId: number;
  productName: string;
  productSlug: string;
  productImage: string | null;
  sku: string;
  availableQuantity: number;
  lowStockThreshold: number;
  status: "LOW_STOCK" | "OUT_OF_STOCK";
}

export interface DashboardTopProduct {
  productId: number;
  productName: string;
  productSlug: string;
  productImage: string | null;
  sku: string;
  unitsSold: number;
  revenue: string;
}

export interface DashboardPaymentDistribution {
  method: string;
  label: string;
  count: number;
  totalAmount: string;
  percentage: number;
}

export interface DashboardAnalyticsResponse {
  period: DashboardPeriod;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  metrics: {
    sales: MetricWithComparison & { aov: number; formattedAov: string };
    orders: MetricWithComparison & { activeOrdersCount: number };
    customers: MetricWithComparison & { totalCustomers: number };
    inventory: {
      lowStockCount: number;
      outOfStockCount: number;
      inStockCount: number;
      totalOnHand: number;
    };
    returns: {
      pendingReturnsCount: number;
      totalRefundedAmount: string;
    };
  };
  orderStatusBreakdown: OrderStatusBreakdown;
  salesTrend: SalesTrendPoint[];
  recentOrders: DashboardRecentOrder[];
  lowStockItems: DashboardLowStockItem[];
  topSellingProducts: DashboardTopProduct[];
  paymentDistribution: DashboardPaymentDistribution[];
  updatedAt: string;
}
