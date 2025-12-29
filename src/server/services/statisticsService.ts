import { prisma } from "@/server/lib/prisma";

export type DashboardStatistics = {
  totalEvents: number;
  liveEvents: number;
  draftEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  totalScanned: number;
};

/**
 * Get dashboard statistics for an organization
 * All queries are properly scoped to organizationId
 */
export async function getDashboardStatistics(
  organizationId: string
): Promise<DashboardStatistics> {
  // Get event counts by status
  const [totalEvents, liveEvents, draftEvents] = await Promise.all([
    prisma.event.count({
      where: { organizationId },
    }),
    prisma.event.count({
      where: { organizationId, status: "LIVE" },
    }),
    prisma.event.count({
      where: { organizationId, status: "DRAFT" },
    }),
  ]);

  // Get ticket statistics
  // Count tickets from paid orders only (scoped via order)
  const ticketStats = await prisma.ticket.count({
    where: {
      order: {
        organizationId,
        status: "PAID",
      },
    },
  });

  // Count scanned tickets
  const scannedCount = await prisma.ticket.count({
    where: {
      status: "USED",
      order: {
        organizationId,
        status: "PAID",
      },
    },
  });

  // Calculate total revenue from paid orders
  const revenueStats = await prisma.order.aggregate({
    where: {
      organizationId,
      status: "PAID",
    },
    _sum: {
      ticketTotal: true,
    },
  });

  return {
    totalEvents,
    liveEvents,
    draftEvents,
    totalTicketsSold: ticketStats,
    totalRevenue: revenueStats._sum.ticketTotal ?? 0,
    totalScanned: scannedCount,
  };
}
