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
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tickettype Prestaties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-gray-500">
            Geen ticketverkoopgegevens beschikbaar
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tickettype Prestaties</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div
              key={index}
              className="rounded-lg border p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h4 className="font-semibold">{item.name}</h4>
                  <p className="text-sm text-gray-600">
                    {item.sold} / {item.capacity} verkocht
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    €{(item.revenue / 100).toFixed(2)}
                  </p>
                  {item.timeToSellOutMs && (
                    <Badge variant="outline" className="mt-1">
                      Uitverkocht in {formatDuration(item.timeToSellOutMs)}
                    </Badge>
                  )}
                </div>
              </div>
              <Progress value={item.sellThroughRate} className="h-2" />
              <p className="mt-1 text-xs text-gray-500">
                {item.sellThroughRate.toFixed(1)}% verkoopratio
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
