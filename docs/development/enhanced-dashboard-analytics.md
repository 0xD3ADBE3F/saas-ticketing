# Enhanced Dashboard Analytics

**Status:** 🟨 Planned
**Priority:** High
**Estimated Effort:** 16-24 hours (4-6 days)

## Overview

Expand the organization dashboard with comprehensive analytics including time-based sales trends, ticket type performance, buyer behavior patterns, repeat customer intelligence, and scanning insights. This helps event organizers make data-driven decisions about pricing, marketing timing, capacity planning, and customer retention strategies.

## Current State

### ✅ Completed

- Basic dashboard with 4 stat cards (events, tickets sold, scanned, revenue)
- StatCard component with hover effects and color coding
- Dashboard statistics service (`statsService.ts`)
- Order model with indexed fields (buyerEmail, status, createdAt, paidAt)
- ScanLog model with comprehensive audit trail
- Scanning statistics service (`scanningStatsService.ts`)
- CSV export functionality for orders, tickets, and scans
- Responsive dashboard layout with mobile support

### ⬜ To Build

- Time-series aggregation service for sales velocity analysis
- Ticket type performance metrics and comparison
- Order behavior analytics (basket size, value distribution)
- Repeat customer tracking and lifetime value calculations
- Enhanced scanning analytics (check-in patterns, no-show rate)
- Chart components library integration (recharts)
- Dedicated analytics page or expanded dashboard sections
- Real-time/cached statistics with performance optimization
- Exportable analytics reports

---

## Business Requirements

### User Story

As an event organizer, I want to see detailed analytics about my ticket sales, buyer behavior, and event performance, so that I can optimize pricing strategies, improve marketing timing, understand customer loyalty, and make informed decisions about future events.

### Acceptance Criteria

- [ ] User can view sales trends over time (daily/weekly/monthly)
- [ ] User can identify peak purchase hours and days
- [ ] User can compare ticket type performance (sell-through rate, revenue contribution)
- [ ] User can see average order value and basket size distribution
- [ ] User can identify repeat customers and their lifetime value
- [ ] User can view check-in time distribution and no-show rates
- [ ] User can filter all analytics by date range and event
- [ ] Charts are interactive with hover tooltips and drill-down capability
- [ ] Dashboard loads in <2s with up to 50,000 orders
- [ ] All analytics properly scoped to organization (multi-tenancy)
- [ ] Mobile-responsive with touch-optimized charts
- [ ] Export functionality for all analytics sections

### Use Cases

1. **Primary Use Case: Sales Velocity Tracking**
   - User views dashboard → Sees sales-over-time chart → Identifies slow period → Launches promotional campaign → Monitors impact in real-time

2. **Pricing Optimization**
   - User views ticket type performance → Sees early bird sold out fast but regular tier slow → Adjusts pricing for next event → Increases total revenue

3. **Customer Retention**
   - User views repeat customer metrics → Identifies 200 attendees with 3+ events → Creates loyalty program → Emails discount code → Increases retention rate

4. **Operational Planning**
   - User views check-in time distribution → Sees 70% arrive in first hour → Staffs more scanners at entry → Reduces queue times

5. **Edge Cases:**
   - New organization with <50 orders → Show limited charts with "More data needed" message
   - Single-event organization → Hide comparison features, show single-event focus
   - No scanned tickets yet → Show "Event hasn't started" placeholder
   - Date range filter returns no data → Show empty state with "Try a different date range"

---

## Technical Implementation

### A) Database Schema

**No new tables required** - all analytics use existing Order, Ticket, ScanLog, and Event models.

**Optimize existing indexes for analytics queries:**

```sql
-- Migration: optimize_indexes_for_analytics

-- Orders: Time-based queries
CREATE INDEX IF NOT EXISTS idx_orders_org_paid_at
  ON orders(organization_id, paid_at DESC)
  WHERE status = 'PAID';

CREATE INDEX IF NOT EXISTS idx_orders_org_created_at
  ON orders(organization_id, created_at DESC);

-- Tickets: Status aggregation
CREATE INDEX IF NOT EXISTS idx_tickets_event_status
  ON tickets(event_id, status);

-- ScanLog: Time distribution analysis
CREATE INDEX IF NOT EXISTS idx_scanlogs_ticket_scanned_at
  ON scan_logs(ticket_id, scanned_at DESC);

-- OrderItems: Ticket type performance
CREATE INDEX IF NOT EXISTS idx_order_items_ticket_type
  ON order_items(ticket_type_id, quantity);
```

**Alternative: Materialized View for Heavy Aggregations** (if performance needed)

```sql
-- For organizations with >10,000 orders, consider materialized view
CREATE MATERIALIZED VIEW mv_daily_sales AS
SELECT
  organization_id,
  event_id,
  DATE(paid_at) as sale_date,
  COUNT(*) as order_count,
  SUM(ticket_total) as total_revenue,
  SUM(service_fee) as total_fees,
  COUNT(DISTINCT buyer_email) as unique_buyers
FROM orders
WHERE status = 'PAID'
GROUP BY organization_id, event_id, DATE(paid_at);

-- Refresh daily via cron job
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales;
```

---

### B) Services

**File:** `src/server/services/analyticsService.ts`

```typescript
import { prisma } from "@/server/lib/prisma";
import { Prisma } from "@prisma/client";

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
        ticketType: any;
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
    return Array.from(grouped.entries()).map(([id, data]) => {
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
        sellThroughRate: (data.quantity / data.ticketType.capacity) * 100,
        revenue: data.revenue,
        revenueShare: 0, // Calculate after all types
        averageOrderSize: data.quantity / data.orders.length,
        timeToSellOutMs: timeToSellOut,
      };
    });
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
      where: { id: eventId },
      select: {
        startDate: true,
        tickets: {
          where: { status: { in: ["VALID", "USED"] } },
          select: {
            id: true,
            status: true,
            order: {
              select: { status: true },
            },
          },
        },
        scanLogs: {
          select: {
            scannedAt: true,
            result: true,
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
    event.scanLogs
      .filter((log) => log.result === "VALID")
      .forEach((log) => {
        if (!event.startDate) return;

        const minutesFromStart = Math.floor(
          (log.scannedAt.getTime() - event.startDate.getTime()) / (1000 * 60)
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
    const duplicateAttempts = event.scanLogs.filter(
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

// Types
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
```

---

### C) API Routes

**Route 1:** `/api/stats/sales-velocity`

```typescript
// src/app/api/stats/sales-velocity/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "@/server/lib/session";
import { analyticsService } from "@/server/services/analyticsService";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId") || undefined;
  const interval = (searchParams.get("interval") as any) || "day";
  const dateFrom = searchParams.get("dateFrom")
    ? new Date(searchParams.get("dateFrom")!)
    : undefined;
  const dateTo = searchParams.get("dateTo")
    ? new Date(searchParams.get("dateTo")!)
    : undefined;

  try {
    const data = await analyticsService.getSalesVelocity(
      session.organizationId,
      { dateFrom, dateTo, eventId, interval }
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Sales velocity error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales velocity" },
      { status: 500 }
    );
  }
}
```

**Route 2:** `/api/stats/ticket-performance`

```typescript
// Similar pattern for ticket type performance
export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId") || undefined;

  const data = await analyticsService.getTicketTypePerformance(
    session.organizationId,
    { eventId }
  );

  return NextResponse.json(data);
}
```

**Route 3:** `/api/stats/order-behavior`

**Route 4:** `/api/stats/repeat-customers`

**Route 5:** `/api/stats/scanning-analytics`

---

### D) UI Components

#### 1. Sales Velocity Line Chart

**File:** `src/components/analytics/SalesVelocityChart.tsx`

```tsx
"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface SalesVelocityChartProps {
  data: Array<{
    period: string;
    orderCount: number;
    revenue: number;
  }>;
  interval: "hour" | "day" | "week" | "month";
}

export function SalesVelocityChart({
  data,
  interval,
}: SalesVelocityChartProps) {
  // Format data for chart
  const chartData = useMemo(() => {
    return data.map((item) => ({
      period: formatPeriod(item.period, interval),
      orders: item.orderCount,
      revenue: item.revenue / 100, // Convert cents to euros
    }));
  }, [data, interval]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Sales Velocity</CardTitle>
          <TrendingUp className="h-5 w-5 text-green-500" />
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="period"
              stroke="#6b7280"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis yAxisId="left" stroke="#3b82f6" fontSize={12} />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#10b981"
              fontSize={12}
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.[0]) return null;
                return (
                  <div className="rounded-lg border bg-white p-3 shadow-lg">
                    <p className="font-semibold">{payload[0].payload.period}</p>
                    <p className="text-sm text-blue-600">
                      Orders: {payload[0].value}
                    </p>
                    <p className="text-sm text-green-600">
                      Revenue: €{payload[1]?.value?.toFixed(2)}
                    </p>
                  </div>
                );
              }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="orders"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", r: 4 }}
              activeDot={{ r: 6 }}
              name="Orders"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: "#10b981", r: 4 }}
              activeDot={{ r: 6 }}
              name="Revenue (€)"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function formatPeriod(period: string, interval: string): string {
  // Format based on interval
  if (interval === "hour") {
    return period.slice(-5); // Show HH:MM
  }
  if (interval === "day") {
    return new Date(period).toLocaleDateString("nl-NL", {
      month: "short",
      day: "numeric",
    });
  }
  return period;
}
```

#### 2. Ticket Type Performance Table

**File:** `src/components/analytics/TicketPerformanceTable.tsx`

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface TicketPerformanceTableProps {
  data: Array<{
    name: string;
    sold: number;
    capacity: number;
    sellThroughRate: number;
    revenue: number;
    timeToSellOutMs: number | null;
  }>;
}

export function TicketPerformanceTable({ data }: TicketPerformanceTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket Type Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="rounded-lg border p-4 hover:bg-gray-50">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h4 className="font-semibold">{item.name}</h4>
                  <p className="text-sm text-gray-600">
                    {item.sold} / {item.capacity} sold
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    €{(item.revenue / 100).toFixed(2)}
                  </p>
                  {item.timeToSellOutMs && (
                    <Badge variant="outline" className="mt-1">
                      Sold out in {formatDuration(item.timeToSellOutMs)}
                    </Badge>
                  )}
                </div>
              </div>
              <Progress value={item.sellThroughRate} className="h-2" />
              <p className="mt-1 text-xs text-gray-500">
                {item.sellThroughRate.toFixed(1)}% sell-through rate
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return `${Math.floor(ms / (1000 * 60))}m`;
}
```

#### 3. Repeat Customer Segments

**File:** `src/components/analytics/RepeatCustomerSegments.tsx`

```tsx
"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RepeatCustomerSegmentsProps {
  segments: {
    firstTime: number;
    repeat: number;
    loyal: number;
  };
  repeatRate: number;
  averageLifetimeValue: number;
}

export function RepeatCustomerSegments({
  segments,
  repeatRate,
  averageLifetimeValue,
}: RepeatCustomerSegmentsProps) {
  const chartData = [
    { name: "First-time", value: segments.firstTime, color: "#93c5fd" },
    { name: "Repeat (2-3)", value: segments.repeat, color: "#3b82f6" },
    { name: "Loyal (4+)", value: segments.loyal, color: "#1e40af" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Loyalty</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Pie chart */}
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

          {/* Stats */}
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Repeat Customer Rate</p>
              <p className="text-3xl font-bold text-green-600">
                {repeatRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Average Lifetime Value</p>
              <p className="text-3xl font-bold">
                €{(averageLifetimeValue / 100).toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-sm font-medium text-blue-900">
                {segments.loyal} loyal customers
              </p>
              <p className="text-xs text-blue-700">Attended 4+ events</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 4. Enhanced Dashboard Page

**File:** `src/app/(dashboard)/dashboard/page.tsx`

```tsx
import { Suspense } from "react";
import { getServerSession } from "@/server/lib/session";
import { redirect } from "next/navigation";
import { analyticsService } from "@/server/services/analyticsService";
import { SalesVelocityChart } from "@/components/analytics/SalesVelocityChart";
import { TicketPerformanceTable } from "@/components/analytics/TicketPerformanceTable";
import { RepeatCustomerSegments } from "@/components/analytics/RepeatCustomerSegments";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session?.organizationId) {
    redirect("/login");
  }

  // Fetch last 30 days of data
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 30);

  const [salesVelocity, ticketPerformance, repeatCustomers] = await Promise.all(
    [
      analyticsService.getSalesVelocity(session.organizationId, {
        dateFrom,
        interval: "day",
      }),
      analyticsService.getTicketTypePerformance(session.organizationId),
      analyticsService.getRepeatCustomerMetrics(session.organizationId),
    ]
  );

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {session.user.name}</p>
      </div>

      {/* Existing stat cards */}
      {/* ... */}

      {/* Analytics Tabs */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Sales Trends</TabsTrigger>
          <TabsTrigger value="tickets">Ticket Performance</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <SalesVelocityChart data={salesVelocity} interval="day" />
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <TicketPerformanceTable data={ticketPerformance} />
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <RepeatCustomerSegments
            segments={repeatCustomers.segments}
            repeatRate={repeatCustomers.repeatRate}
            averageLifetimeValue={repeatCustomers.averageLifetimeValue}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## Implementation Checklist

### Phase 1: Database Optimization & Core Services (Day 1, ~6 hours)

- [ ] Create migration `optimize_indexes_for_analytics`
- [ ] Add composite indexes for time-based queries
- [ ] Run migration on development database
- [ ] Implement `analyticsService.getSalesVelocity` with interval grouping
- [ ] Implement `analyticsService.getTicketTypePerformance`
- [ ] Implement `analyticsService.getOrderBehaviorMetrics`
- [ ] Add unit tests for all aggregation functions
- [ ] Test with seed data (1,000+ orders spanning 3 months)

### Phase 2: Repeat Customer & Scanning Analytics (Day 2, ~4 hours)

- [ ] Implement `analyticsService.getRepeatCustomerMetrics`
- [ ] Implement `analyticsService.getScanningAnalytics`
- [ ] Add unit tests for email-based customer tracking
- [ ] Test with duplicate buyer emails across events
- [ ] Add unit tests for check-in time distribution
- [ ] Verify org-scoping on all service functions

### Phase 3: API Endpoints (Day 2-3, ~4 hours)

- [ ] Create `/api/stats/sales-velocity` route
- [ ] Create `/api/stats/ticket-performance` route
- [ ] Create `/api/stats/order-behavior` route
- [ ] Create `/api/stats/repeat-customers` route
- [ ] Create `/api/stats/scanning-analytics` route
- [ ] Add authentication checks (all org-scoped)
- [ ] Add query parameter validation
- [ ] Add error handling and logging
- [ ] Write integration tests for all endpoints

### Phase 4: Chart Components Library (Day 3, ~3 hours)

- [ ] Install recharts: `pnpm add recharts`
- [ ] Create `SalesVelocityChart` component
- [ ] Create `TicketPerformanceTable` component
- [ ] Create `RepeatCustomerSegments` pie chart
- [ ] Create `OrderValueDistribution` bar chart
- [ ] Create `CheckInTimeDistribution` area chart
- [ ] Add responsive design (mobile breakpoints)
- [ ] Add loading skeletons for charts
- [ ] Test charts with various data sizes

### Phase 5: Dashboard Integration (Day 4, ~5 hours)

- [ ] Add analytics sections to main dashboard
- [ ] Implement tabs for different analytics views
- [ ] Add date range filter component
- [ ] Add event filter dropdown
- [ ] Add interval selector (hour/day/week/month)
- [ ] Integrate all chart components
- [ ] Add empty states for no data
- [ ] Add error boundaries for chart failures
- [ ] Test responsive layout on mobile

### Phase 6: Caching & Performance (Day 4-5, ~3 hours)

- [ ] Implement React cache() for SSR deduplication
- [ ] Add 5-minute cache for heavy aggregations
- [ ] Add loading states during data fetch
- [ ] Optimize database queries with EXPLAIN ANALYZE
- [ ] Test performance with 50,000+ orders
- [ ] Add pagination for large result sets
- [ ] Monitor query execution times
- [ ] Consider materialized view if needed

### Phase 7: Testing & Polish (Day 5-6, ~4 hours)

- [ ] Write unit tests for all service functions (>85% coverage)
- [ ] Write integration tests for API endpoints
- [ ] E2E test: View analytics dashboard → Filter by date → Export data
- [ ] Test edge cases: no data, single order, all events sold out
- [ ] Performance test: Load dashboard with 10,000 orders
- [ ] Accessibility audit (keyboard navigation, screen readers)
- [ ] Test on mobile devices (iOS & Android)
- [ ] Cross-browser testing (Chrome, Safari, Firefox)

### Phase 8: Documentation & Deployment (Day 6, ~3 hours)

- [ ] Update SPEC.md with analytics features
- [ ] Document all analytics service functions
- [ ] Add inline comments for complex calculations
- [ ] Update CSV export to include analytics data
- [ ] Create PR with detailed description
- [ ] Deploy to staging environment
- [ ] Smoke test in staging with real data
- [ ] Monitor performance metrics in production
- [ ] Collect initial user feedback

---

## Edge Cases & Error Handling

1. **Insufficient Data**
   - Problem: New org with <50 orders shows meaningless charts
   - Solution: Show placeholder with "Need at least 50 orders for meaningful analytics"
   - Threshold: Hide charts if sample size too small

2. **Date Range with No Data**
   - Problem: User filters to date range with zero orders
   - Solution: Show empty state "No orders in this period. Try expanding your date range."
   - UI: Maintain filter values so user can adjust

3. **Slow Query Performance**
   - Problem: Organization with 100,000+ orders takes >5s to aggregate
   - Solution: Implement background job to pre-calculate daily stats
   - Monitoring: Log queries >2s, alert on >5s

4. **Timezone Issues**
   - Problem: Server timezone differs from user/event timezone
   - Solution: Store all timestamps in UTC, display in event/org timezone
   - Implementation: Add timezone field to Organization model

5. **Incomplete Time-Series Data**
   - Problem: Sales paused for weeks, charts show gaps
   - Solution: Fill missing periods with zero values for continuous timeline
   - UX: Show annotation "No sales this period"

6. **Concurrent Dashboard Access**
   - Problem: Multiple users hitting analytics APIs simultaneously
   - Solution: Implement request deduplication with cache keys
   - Redis: Use org-scoped cache keys with 5-minute TTL

7. **Chart Rendering Failures**
   - Problem: Recharts throws error with malformed data
   - Solution: Add error boundary around each chart, validate data shape
   - Fallback: Show error message with "Try refreshing the page"

---

## Testing Strategy

### Unit Tests

**File:** `tests/analyticsService.test.ts`

```typescript
describe("analyticsService", () => {
  describe("getSalesVelocity", () => {
    it("should aggregate orders by day", async () => {
      const result = await analyticsService.getSalesVelocity(testOrgId, {
        interval: "day",
      });

      expect(result).toHaveLength(30); // Last 30 days
      expect(result[0]).toHaveProperty("period");
      expect(result[0]).toHaveProperty("orderCount");
      expect(result[0]).toHaveProperty("revenue");
    });

    it("should filter by event", async () => {
      const result = await analyticsService.getSalesVelocity(testOrgId, {
        eventId: testEventId,
        interval: "day",
      });

      // Verify only orders from specific event
      expect(result.reduce((sum, d) => sum + d.orderCount, 0)).toBe(100);
    });

    it("should handle hourly interval", async () => {
      const result = await analyticsService.getSalesVelocity(testOrgId, {
        interval: "hour",
        dateFrom: new Date("2026-01-01"),
        dateTo: new Date("2026-01-02"),
      });

      expect(result.length).toBeLessThanOrEqual(24);
      expect(result[0].period).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:00/);
    });
  });

  describe("getRepeatCustomerMetrics", () => {
    it("should identify repeat customers", async () => {
      const result = await analyticsService.getRepeatCustomerMetrics(testOrgId);

      expect(result.totalUniqueCustomers).toBeGreaterThan(0);
      expect(result.repeatRate).toBeGreaterThanOrEqual(0);
      expect(result.repeatRate).toBeLessThanOrEqual(100);
    });

    it("should calculate lifetime value correctly", async () => {
      const result = await analyticsService.getRepeatCustomerMetrics(testOrgId);

      expect(result.averageLifetimeValue).toBeGreaterThan(0);
      expect(result.topCustomers.length).toBeLessThanOrEqual(10);
    });
  });
});
```

### Integration Tests

```typescript
describe("Analytics API Endpoints", () => {
  it("GET /api/stats/sales-velocity returns 200", async () => {
    const response = await fetch("/api/stats/sales-velocity?interval=day", {
      headers: { Cookie: sessionCookie },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("returns 401 for unauthenticated request", async () => {
    const response = await fetch("/api/stats/sales-velocity");
    expect(response.status).toBe(401);
  });
});
```

### E2E Tests

```typescript
describe("Analytics Dashboard E2E", () => {
  it("should display sales velocity chart", async () => {
    await page.goto("/dashboard");

    // Wait for chart to load
    const chart = await page.waitForSelector('[data-testid="sales-chart"]');
    expect(chart).toBeTruthy();

    // Verify data is displayed
    const dataPoints = await page.$$('[data-testid="chart-data-point"]');
    expect(dataPoints.length).toBeGreaterThan(0);
  });

  it("should filter by date range", async () => {
    await page.goto("/dashboard");

    // Open date filter
    await page.click('[data-testid="date-filter"]');
    await page.fill('[data-testid="date-from"]', "2026-01-01");
    await page.fill('[data-testid="date-to"]', "2026-01-31");
    await page.click('[data-testid="apply-filter"]');

    // Verify URL updated
    expect(page.url()).toContain("dateFrom=2026-01-01");
    expect(page.url()).toContain("dateTo=2026-01-31");
  });
});
```

---

## Security Considerations

1. **Authentication:** All analytics endpoints require authenticated session
2. **Authorization:** All queries scoped to organizationId (multi-tenancy enforced)
3. **Data Validation:** Validate date ranges (max 1 year), intervals (enum), eventIds (UUID)
4. **Rate Limiting:** Analytics endpoints limited to 30 requests/minute per org
5. **Audit Logging:** Log suspicious patterns (excessive API calls, data scraping)
6. **Data Privacy:**
   - Buyer emails visible only in aggregate (count, not list)
   - Top customers list shown only to org admins
   - Anonymize emails in exports if GDPR requested
7. **Performance Limits:** Cap result sets at 10,000 rows, require pagination beyond

---

## Performance Considerations

1. **Database Queries:**
   - Add composite indexes: `(organizationId, paidAt)`, `(eventId, status)`
   - Use `groupBy` for aggregations (more efficient than multiple counts)
   - Consider partial indexes with `WHERE status = 'PAID'`
   - Monitor slow queries with `EXPLAIN ANALYZE`

2. **Caching Strategy:**
   - Cache sales velocity for 5 minutes (React cache() or Redis)
   - Cache ticket performance for 10 minutes (slower to change)
   - Invalidate cache on new paid order (optional, adds complexity)
   - Use stale-while-revalidate pattern for better UX

3. **Frontend Performance:**
   - Lazy load chart components (dynamic imports)
   - Use virtualization for large tables (>100 rows)
   - Debounce filter changes (300ms delay)
   - Show loading skeletons during data fetch
   - Use CSS transforms for smooth animations

4. **Scalability:**
   - For orgs with >50,000 orders, use materialized views
   - Background job to pre-calculate daily stats (cron at 2 AM)
   - Consider time-series database for very large datasets
   - Archive old orders (>2 years) to separate table

---

## Success Criteria

- ✅ Dashboard displays sales velocity chart with last 30 days data
- ✅ User can filter analytics by date range and event
- ✅ Ticket performance shows sell-through rate and time-to-sellout
- ✅ Repeat customer metrics identify loyal customers (4+ events)
- ✅ Charts load in <2s with 50,000 orders
- ✅ All queries properly scoped to organization
- ✅ Tests passing (>85% coverage for analyticsService)
- ✅ Responsive design works on mobile devices
- ✅ Accessibility: Keyboard navigation and ARIA labels
- ✅ No performance regression on dashboard load time
- ✅ Documentation complete (inline comments + API docs)

---

## Dependencies

- ✅ Prisma schema with Order, Ticket, ScanLog models
- ✅ Dashboard statistics service (statsService.ts)
- ✅ StatCard and Card UI components
- ⬜ Recharts library installation (`pnpm add recharts`)
- ⬜ Database indexes optimization migration
- ⬜ Tabs component for analytics sections

**Blocks:** Geographical heatmap (can be developed in parallel), advanced financial reporting

---

## Rollout Strategy

1. **Feature Flag:** `ENHANCED_ANALYTICS_ENABLED`
   - Initially enabled for development/staging only
   - Enable for 3-5 test organizations with good data (>500 orders)
   - Collect feedback on chart usefulness and UX
   - Enable globally after 2 weeks validation

2. **Monitoring:**
   - Track analytics API endpoint usage (req/min per org)
   - Monitor query performance (p95 latency <1s target)
   - Count dashboard analytics tab views
   - Collect user feedback via in-app survey

3. **User Education:**
   - Add tooltip hints on first dashboard visit
   - Email existing users: "New analytics features available"
   - Create help article with screenshots and use cases
   - Add "What's New" banner in dashboard

4. **Rollback Plan:**
   - Disable feature flag if performance issues
   - Analytics APIs are non-critical (won't break core flows)
   - Migrations are additive (indexes only, no data changes)
   - Can remove indexes if causing performance issues

---

## Future Enhancements

Ideas for future iterations (out of scope for MVP):

- **Predictive Analytics:** AI-powered sales forecasting based on historical trends
- **A/B Testing:** Compare performance of different ticket pricing strategies
- **Cohort Analysis:** Track buyer retention by acquisition month
- **Funnel Analytics:** Measure checkout abandonment and conversion rates
- **Revenue Forecasting:** Project future revenue based on current pace
- **Comparative Benchmarking:** Compare performance to similar events in platform
- **Custom Dashboards:** Allow users to create personalized analytics views
- **Scheduled Reports:** Email weekly/monthly analytics summaries
- **Real-Time Alerts:** Notify when sales velocity drops or ticket selling fast
- **Export to BI Tools:** Integration with Tableau, Power BI, Google Data Studio

---

## Related Documentation

- [SPEC.md](../../SPEC.md) - Business rules for orders and tickets
- [README.md](../../README.md) - Development setup
- [docs/development/geographical-heatmap-analytics.md](./geographical-heatmap-analytics.md) - Related analytics feature
- [docs/development/analytics-monitoring/](./analytics-monitoring/) - Advanced monitoring features
- [Recharts Documentation](https://recharts.org/) - Charting library
- [React Cache Documentation](https://react.dev/reference/react/cache) - SSR caching

---

## Questions & Decisions

**Decisions Made:**

- [x] **Decision:** Use Recharts over D3 or Chart.js
  - **Reason:** Better React integration, declarative API, smaller bundle size
- [x] **Decision:** Aggregate at service layer, not database views
  - **Reason:** More flexible for filtering, easier to test, migrations simpler
- [x] **Decision:** 5-minute cache TTL for analytics
  - **Reason:** Balance between freshness and performance
- [x] **Decision:** Show last 30 days by default
  - **Reason:** Most actionable timeframe, good balance of detail vs. overview

**Open Questions:**

- [ ] **Question:** Should we add export to PDF for analytics? (Assigned to: Product)
  - **Note:** Users may want to share charts in presentations
- [ ] **Question:** Real-time updates vs. periodic refresh? (Assigned to: Dev)
  - **Note:** WebSocket for live updates adds complexity; polling every 30s is simpler
- [ ] **Question:** Should repeat customer tracking be opt-in for privacy? (Assigned to: Legal)
  - **Note:** Email-based tracking may have GDPR implications

**Risks:**

- **Risk:** Heavy analytics queries impact production database performance
  - **Mitigation:** Add read replica for analytics, implement query timeouts (5s max)
- **Risk:** Charts don't render well on small mobile screens
  - **Mitigation:** Use responsive breakpoints, simplify mobile charts (fewer data points)

---

## Notes

- **Performance Baseline:** Current dashboard loads in ~500ms with basic stats; target <1s with all analytics
- **Chart Library Bundle Size:** Recharts adds ~100KB gzipped; consider tree-shaking to reduce
- **Accessibility:** All charts must have data table alternative for screen readers
- **Mobile UX:** Consider swipeable tabs on mobile for better navigation
- **Cache Strategy:** Use React cache() for SSR; consider Redis for multi-instance deployments
- **Data Retention:** Analytics should respect same retention policy as Order data (typically 7 years for tax purposes in NL)
