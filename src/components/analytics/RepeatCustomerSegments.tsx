"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
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
    { name: "Nieuw", value: segments.firstTime, color: "#93c5fd" },
    { name: "Terugkerend (2-3)", value: segments.repeat, color: "#3b82f6" },
    { name: "Loyaal (4+)", value: segments.loyal, color: "#1e40af" },
  ];

  const totalCustomers = segments.firstTime + segments.repeat + segments.loyal;

  if (totalCustomers === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Klantloyaliteit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-gray-500">
            Geen klantgegevens beschikbaar
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Klantloyaliteit</CardTitle>
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
                  percent !== undefined
                    ? `${name} ${(percent * 100).toFixed(0)}%`
                    : name
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
              <p className="text-sm text-gray-600">
                Terugkerende Klanten Percentage
              </p>
              <p className="text-3xl font-bold text-green-600">
                {repeatRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">
                Gemiddelde Levenslange Waarde
              </p>
              <p className="text-3xl font-bold">
                €{(averageLifetimeValue / 100).toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-sm font-medium text-blue-900">
                {segments.loyal} loyale klanten
              </p>
              <p className="text-xs text-blue-700">4+ evenementen bijgewoond</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
