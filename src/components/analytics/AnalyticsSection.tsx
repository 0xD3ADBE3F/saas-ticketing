"use client";

import { useEffect, useState } from "react";
import { SalesVelocityChart } from "@/components/analytics/SalesVelocityChart";
import { TicketPerformanceTable } from "@/components/analytics/TicketPerformanceTable";
import { RepeatCustomerSegments } from "@/components/analytics/RepeatCustomerSegments";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, TrendingUp, Ticket, Users } from "lucide-react";

interface AnalyticsSectionProps {
  organizationId: string;
}

interface SalesVelocityData {
  period: string;
  orderCount: number;
  revenue: number;
}

interface TicketPerformanceData {
  name: string;
  sold: number;
  capacity: number;
  sellThroughRate: number;
  revenue: number;
  timeToSellOutMs: number | null;
}

interface RepeatCustomerData {
  segments: {
    firstTime: number;
    repeat: number;
    loyal: number;
  };
  repeatRate: number;
  averageLifetimeValue: number;
}

export function AnalyticsSection({ organizationId }: AnalyticsSectionProps) {
  const [salesVelocity, setSalesVelocity] = useState<SalesVelocityData[]>([]);
  const [ticketPerformance, setTicketPerformance] = useState<
    TicketPerformanceData[]
  >([]);
  const [repeatCustomers, setRepeatCustomers] =
    useState<RepeatCustomerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);

        // Calculate last 30 days
        const dateTo = new Date();
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 30);

        // Fetch all analytics in parallel
        const [salesRes, ticketRes, customerRes] = await Promise.all([
          fetch(
            `/api/stats/sales-velocity?interval=day&dateFrom=${dateFrom.toISOString()}&dateTo=${dateTo.toISOString()}`
          ),
          fetch(`/api/stats/ticket-performance`),
          fetch(`/api/stats/repeat-customers`),
        ]);

        if (salesRes.ok) {
          setSalesVelocity(await salesRes.json());
        }
        if (ticketRes.ok) {
          setTicketPerformance(await ticketRes.json());
        }
        if (customerRes.ok) {
          setRepeatCustomers(await customerRes.json());
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [organizationId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-500">Analytics laden...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="sales" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="sales" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          <span className="hidden sm:inline">Verkooptrends</span>
        </TabsTrigger>
        <TabsTrigger value="tickets" className="flex items-center gap-2">
          <Ticket className="h-4 w-4" />
          <span className="hidden sm:inline">Ticketprestaties</span>
        </TabsTrigger>
        <TabsTrigger value="customers" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Klanten</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="sales" className="space-y-4">
        <SalesVelocityChart data={salesVelocity} interval="day" />
      </TabsContent>

      <TabsContent value="tickets" className="space-y-4">
        <TicketPerformanceTable data={ticketPerformance} />
      </TabsContent>

      <TabsContent value="customers" className="space-y-4">
        {repeatCustomers && (
          <RepeatCustomerSegments
            segments={repeatCustomers.segments}
            repeatRate={repeatCustomers.repeatRate}
            averageLifetimeValue={repeatCustomers.averageLifetimeValue}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
