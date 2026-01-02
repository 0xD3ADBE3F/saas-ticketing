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

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verkoopsnelheid</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[350px] text-gray-500">
            Geen verkoopgegevens beschikbaar voor de geselecteerde periode
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Verkoopsnelheid</CardTitle>
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
                      Bestellingen: {payload[0].value}
                    </p>
                    <p className="text-sm text-green-600">
                      Omzet: €{payload[1]?.value?.toFixed(2)}
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
              name="Bestellingen"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: "#10b981", r: 4 }}
              activeDot={{ r: 6 }}
              name="Omzet (€)"
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
    try {
      return new Date(period).toLocaleDateString("nl-NL", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return period;
    }
  }
  return period;
}
