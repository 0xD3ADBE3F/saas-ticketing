import { prisma } from "@/server/lib/prisma";
import { Prisma } from "@/generated/prisma";

// =============================================================================
// TYPES
// =============================================================================

export interface SalesVelocityData {
  period: string; // Date/time string
  orderCount: number;
  revenue: number;
  serviceFees: number;
  totalAmount: number;
}

export interface TicketTypePerformance {
  ticketTypeId: string;
  name: string;
  price: number;
  capacity: number;
  sold: number;
  sellThroughRate: number; // Percentage
  revenue: number;
  revenueShare: number; // Percentage
  averageOrderSize: number;
  timeToSellOutMs: number | null; // Milliseconds
}

export interface OrderBehaviorMetrics {
  totalOrders: number;
  totalTickets: number;
  averageOrderValue: number; // Cents
  averageBasketSize: number; // Tickets per order
  valueDistribution: Record<string, number>;
  basketSizeDistribution: Record<number, number>;
  paymentMethodBreakdown: Record<string, number>;
}

export interface RepeatCustomerMetrics {
  totalUniqueCustomers: number;
  segments: {
    firstTime: number;
    repeat: number; // 2-3 events
    loyal: number; // 4+ events
  };
  repeatRate: number; // Percentage
  averageLifetimeValue: number; // Cents
  topCustomers: Array<{
    email: string;
    orderCount: number;
    eventCount: number;
    lifetimeValue: number;
  }>;
}

export interface ScanningAnalytics {
  totalSold: number;
  totalScanned: number;
  noShowCount: number;
  noShowRate: number; // Percentage
  scanRate: number; // Percentage
  duplicateAttempts: number;
  checkInTimeDistribution: Record<string, number>; // Time bucket → count
}

// =============================================================================
// SERVICE
// =============================================================================

export const analyticsService = {
  /**
   * Get sales velocity over time (daily/weekly/monthly aggregation)
   * @param organizationId - Organization to scope query
   * @param filters - Date range, event ID, grouping interval
   * @returns Time-series data with order counts and revenue
   */
  async getSalesVelocity(
    organizationId: string,
    filters: {
      dateFrom?: Date;
      dateTo?: Date;
      eventId?: string;
      interval?: "hour" | "day" | "week" | "month";
    }
  ): Promise<SalesVelocityData[]> {
    const { dateFrom, dateTo, eventId, interval = "day" } = filters;

    // Build where clause
    const where: Prisma.OrderWhereInput = {
      organizationId,
      status: "PAID",
      paidAt: {
        ...(dateFrom && { gte: dateFrom }),
        ...(dateTo && { lte: dateTo }),
      },
      ...(eventId && { eventId }),
    };

    // Fetch raw orders
    const orders = await prisma.order.findMany({
      where,
      select: {
        paidAt: true,
        ticketTotal: true,
        serviceFee: true,
        totalAmount: true,
      },
      orderBy: { paidAt: "asc" },
    });

    // Group by interval
    return this.groupByInterval(orders, interval);
  },

  /**
   * Helper: Group orders by time interval
   */
  groupByInterval(
    orders: Array<{
      paidAt: Date | null;
      ticketTotal: number;
      serviceFee: number;
      totalAmount: number;
    }>,
    interval: "hour" | "day" | "week" | "month"
  ): SalesVelocityData[] {
    const grouped = new Map<string, SalesVelocityData>();

    orders.forEach((order) => {
      if (!order.paidAt) return;

      // Generate key based on interval
      const date = new Date(order.paidAt);
      let key: string;

      switch (interval) {
        case "hour":
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:00`;
          break;
        case "day":
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
          break;
        case "week":
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
          key = `${weekStart.getFullYear()}-W${String(Math.ceil(weekStart.getDate() / 7)).padStart(2, "0")}`;
          break;
        case "month":
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          break;
      }

      // Aggregate
      if (!grouped.has(key)) {
        grouped.set(key, {
          period: key,
          orderCount: 0,
          revenue: 0,
          serviceFees: 0,
          totalAmount: 0,
        });
      }

      const data = grouped.get(key)!;
      data.orderCount++;
      data.revenue += order.ticketTotal;
      data.serviceFees += order.serviceFee;
      data.totalAmount += order.totalAmount;
    });

    return Array.from(grouped.values()).sort((a, b) =>
      a.period.localeCompare(b.period)
    );
  },

  /**
   * Get ticket type performance metrics
   */
  async getTicketTypePerformance(
    organizationId: string,
    filters?: { eventId?: string; dateFrom?: Date; dateTo?: Date }
  ): Promise<TicketTypePerformance[]> {
    const where: Prisma.OrderWhereInput = {
      organizationId,
      status: "PAID",
      ...(filters?.eventId && { eventId: filters.eventId }),
      ...(filters?.dateFrom && { paidAt: { gte: filters.dateFrom } }),
      ...(filters?.dateTo && { paidAt: { lte: filters.dateTo } }),
    };

    // Get all order items with ticket type info
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: where,
      },
      include: {
        ticketType: {
          select: {
            id: true,
            name: true,
            price: true,
            capacity: true,
            soldCount: true,
          },
        },
        order: {
          select: {
            paidAt: true,
            createdAt: true,
          },
        },
      },
    });

    // Group by ticket type
    const grouped = new Map<
      string,
      {
        ticketType: {
          id: string;
          name: string;
          price: number;
          capacity: number;
          soldCount: number;
        };
        quantity: number;
        revenue: number;
        orders: Date[];
      }
    >();

    orderItems.forEach((item) => {
      const key = item.ticketTypeId;
      if (!grouped.has(key)) {
        grouped.set(key, {
          ticketType: item.ticketType,
          quantity: 0,
          revenue: 0,
          orders: [],
        });
      }

      const data = grouped.get(key)!;
      data.quantity += item.quantity;
      data.revenue += item.totalPrice;
      data.orders.push(item.order.paidAt || item.order.createdAt);
    });

    // Calculate metrics
    const results = Array.from(grouped.entries()).map(([id, data]) => {
      const sortedOrders = data.orders.sort(
        (a, b) => a.getTime() - b.getTime()
      );
      const firstSale = sortedOrders[0];
      const lastSale = sortedOrders[sortedOrders.length - 1];

      // Calculate time to sell out (if capacity reached)
      let timeToSellOut: number | null = null;
      if (data.ticketType.soldCount >= data.ticketType.capacity) {
        timeToSellOut = lastSale.getTime() - firstSale.getTime();
      }

      return {
        ticketTypeId: id,
        name: data.ticketType.name,
        price: data.ticketType.price,
        capacity: data.ticketType.capacity,
        sold: data.quantity,
        sellThroughRate:
          data.ticketType.capacity > 0
            ? (data.quantity / data.ticketType.capacity) * 100
            : 0,
        revenue: data.revenue,
        revenueShare: 0, // Calculate after all types
        averageOrderSize: data.orders.length > 0 ? data.quantity / data.orders.length : 0,
        timeToSellOutMs: timeToSellOut,
      };
    });

    // Calculate revenue share
    const totalRevenue = results.reduce((sum, r) => sum + r.revenue, 0);
    results.forEach((result) => {
      result.revenueShare =
        totalRevenue > 0 ? (result.revenue / totalRevenue) * 100 : 0;
    });

    return results;
  },

  /**
   * Get order behavior metrics
   */
  async getOrderBehaviorMetrics(
    organizationId: string,
    filters?: { eventId?: string; dateFrom?: Date; dateTo?: Date }
  ): Promise<OrderBehaviorMetrics> {
    const where: Prisma.OrderWhereInput = {
      organizationId,
      status: "PAID",
      ...(filters?.eventId && { eventId: filters.eventId }),
      ...(filters?.dateFrom && { paidAt: { gte: filters.dateFrom } }),
      ...(filters?.dateTo && { paidAt: { lte: filters.dateTo } }),
    };

    const orders = await prisma.order.findMany({
      where,
      select: {
        totalAmount: true,
        orderItems: {
          select: {
            quantity: true,
          },
        },
        paymentMethod: true,
      },
    });

    // Calculate metrics
    const totalOrders = orders.length;
    const totalTickets = orders.reduce(
      (sum, o) => sum + o.orderItems.reduce((s, i) => s + i.quantity, 0),
      0
    );
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Order value distribution
    const valueDistribution = {
      "0-25": 0,
      "26-50": 0,
      "51-100": 0,
      "101-200": 0,
      "200+": 0,
    };

    orders.forEach((order) => {
      const euros = order.totalAmount / 100;
      if (euros <= 25) valueDistribution["0-25"]++;
      else if (euros <= 50) valueDistribution["26-50"]++;
      else if (euros <= 100) valueDistribution["51-100"]++;
      else if (euros <= 200) valueDistribution["101-200"]++;
      else valueDistribution["200+"]++;
    });

    // Basket size distribution
    const basketSizeDistribution = new Map<number, number>();
    orders.forEach((order) => {
      const size = order.orderItems.reduce((s, i) => s + i.quantity, 0);
      basketSizeDistribution.set(
        size,
        (basketSizeDistribution.get(size) || 0) + 1
      );
    });

    // Payment method breakdown
    const paymentMethods = new Map<string, number>();
    orders.forEach((order) => {
      const method = order.paymentMethod || "unknown";
      paymentMethods.set(method, (paymentMethods.get(method) || 0) + 1);
    });

    return {
      totalOrders,
      totalTickets,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      averageBasketSize: totalOrders > 0 ? totalTickets / totalOrders : 0,
      valueDistribution,
      basketSizeDistribution: Object.fromEntries(basketSizeDistribution),
      paymentMethodBreakdown: Object.fromEntries(paymentMethods),
    };
  },

  /**
   * Get repeat customer intelligence
   */
  async getRepeatCustomerMetrics(
    organizationId: string,
    filters?: { dateFrom?: Date; dateTo?: Date }
  ): Promise<RepeatCustomerMetrics> {
    const where: Prisma.OrderWhereInput = {
      organizationId,
      status: "PAID",
      ...(filters?.dateFrom && { paidAt: { gte: filters.dateFrom } }),
      ...(filters?.dateTo && { paidAt: { lte: filters.dateTo } }),
    };

    // Get all paid orders with buyer emails
    const orders = await prisma.order.findMany({
      where,
      select: {
        buyerEmail: true,
        totalAmount: true,
        eventId: true,
        paidAt: true,
      },
      orderBy: { paidAt: "asc" },
    });

    // Group by email
    const customerMap = new Map<
      string,
      {
        orders: number;
        revenue: number;
        events: Set<string>;
        firstPurchase: Date;
        lastPurchase: Date;
      }
    >();

    orders.forEach((order) => {
      const email = order.buyerEmail.toLowerCase();
      if (!customerMap.has(email)) {
        customerMap.set(email, {
          orders: 0,
          revenue: 0,
          events: new Set(),
          firstPurchase: order.paidAt || new Date(),
          lastPurchase: order.paidAt || new Date(),
        });
      }

      const data = customerMap.get(email)!;
      data.orders++;
      data.revenue += order.totalAmount;
      data.events.add(order.eventId);
      data.lastPurchase = order.paidAt || new Date();
    });

    // Segment customers
    const segments = {
      firstTime: 0,
      repeat: 0,
      loyal: 0, // 4+ events
    };

    const lifetimeValues: number[] = [];

    customerMap.forEach((data) => {
      lifetimeValues.push(data.revenue);

      if (data.events.size === 1) segments.firstTime++;
      else if (data.events.size < 4) segments.repeat++;
      else segments.loyal++;
    });

    // Calculate metrics
    const totalCustomers = customerMap.size;
    const repeatRate =
      totalCustomers > 0
        ? ((segments.repeat + segments.loyal) / totalCustomers) * 100
        : 0;

    // Calculate average lifetime value
    const avgLifetimeValue =
      lifetimeValues.length > 0
        ? lifetimeValues.reduce((sum, v) => sum + v, 0) / lifetimeValues.length
        : 0;

    // Top customers by revenue
    const topCustomers = Array.from(customerMap.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([email, data]) => ({
        email,
        orderCount: data.orders,
        eventCount: data.events.size,
        lifetimeValue: data.revenue,
      }));

    return {
      totalUniqueCustomers: totalCustomers,
      segments,
      repeatRate,
      averageLifetimeValue: avgLifetimeValue,
      topCustomers,
    };
  },

  /**
   * Get enhanced scanning analytics
   */
  async getScanningAnalytics(
    organizationId: string,
    eventId: string
  ): Promise<ScanningAnalytics> {
    // Get event details
    const event = await prisma.event.findUnique({
      where: { id: eventId, organizationId },
      select: {
        startsAt: true,
        tickets: {
          where: { status: { in: ["VALID", "USED"] } },
          select: {
            id: true,
            status: true,
            order: {
              select: { status: true },
            },
            scanLogs: {
              select: {
                scannedAt: true,
                result: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new Error("Event not found");
    }

    const validTickets = event.tickets.filter((t) => t.order.status === "PAID");
    const scannedTickets = validTickets.filter((t) => t.status === "USED");
    const noShows = validTickets.length - scannedTickets.length;

    // Check-in time distribution (relative to event start)
    const timeDistribution = new Map<string, number>();

    // Collect all scan logs from all tickets
    const allScanLogs = event.tickets.flatMap((ticket) => ticket.scanLogs);

    allScanLogs
      .filter((log) => log.result === "VALID")
      .forEach((log) => {
        if (!event.startsAt) return;

        const minutesFromStart = Math.floor(
          (log.scannedAt.getTime() - event.startsAt.getTime()) / (1000 * 60)
        );

        // Group into 15-minute buckets
        const bucket = Math.floor(minutesFromStart / 15) * 15;
        const label =
          bucket < 0
            ? `${bucket} min (early)`
            : bucket === 0
              ? "0-15 min"
              : `${bucket}-${bucket + 15} min`;

        timeDistribution.set(label, (timeDistribution.get(label) || 0) + 1);
      });

    // Duplicate scan attempts
    const duplicateAttempts = allScanLogs.filter(
      (log) => log.result === "ALREADY_USED"
    ).length;

    return {
      totalSold: validTickets.length,
      totalScanned: scannedTickets.length,
      noShowCount: noShows,
      noShowRate:
        validTickets.length > 0 ? (noShows / validTickets.length) * 100 : 0,
      scanRate:
        validTickets.length > 0
          ? (scannedTickets.length / validTickets.length) * 100
          : 0,
      duplicateAttempts,
      checkInTimeDistribution: Object.fromEntries(timeDistribution),
    };
  },
};
