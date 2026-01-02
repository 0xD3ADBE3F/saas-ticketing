import { prisma } from "@/server/lib/prisma";
import { eventRepo } from "@/server/repos/eventRepo";

export type ScanningStats = {
  eventId: string;
  eventTitle: string;
  totalSold: number;
  totalScanned: number;
  totalDuplicates: number;
  scanPercentage: number;
  byStatus: {
    valid: number;
    used: number;
    refunded: number;
  };
};

export type RecentScan = {
  id: string;
  ticketId: string;
  ticketCode: string;
  result: string;
  scannedAt: Date;
  scannedBy: string;
  deviceId: string | null;
  ticketType: string;
  buyerEmail: string | null;
};

/**
 * Get live scanning statistics for an event
 */
export async function getEventScanningStats(
  eventId: string,
  organizationId: string
): Promise<ScanningStats> {
  // Verify event belongs to organization
  const event = await eventRepo.findByIdInOrg(eventId, organizationId);
  if (!event) {
    throw new Error("Event not found or access denied");
  }

  // Get total tickets sold (from paid orders)
  const totalSold = await prisma.ticket.count({
    where: {
      ticketType: {
        eventId,
      },
      order: {
        status: "PAID",
      },
    },
  });

  // Get tickets by status
  const statusCounts = await prisma.ticket.groupBy({
    by: ["status"],
    where: {
      ticketType: {
        eventId,
      },
      order: {
        status: "PAID",
      },
    },
    _count: {
      status: true,
    },
  });

  const byStatus = {
    valid: 0,
    used: 0,
    refunded: 0,
  };

  statusCounts.forEach((group) => {
    const status = group.status.toLowerCase();
    if (status === "valid" || status === "used" || status === "refunded") {
      byStatus[status] = group._count.status;
    }
  });

  // Get total scanned (first scan only - status = VALID means first successful scan)
  const totalScanned = byStatus.used;

  // Get duplicate scan attempts (scans where result = ALREADY_USED)
  const totalDuplicates = await prisma.scanLog.count({
    where: {
      ticket: {
        ticketType: {
          eventId,
        },
      },
      result: "ALREADY_USED",
    },
  });

  const scanPercentage =
    totalSold > 0 ? Math.round((totalScanned / totalSold) * 100) : 0;

  return {
    eventId,
    eventTitle: event.title,
    totalSold,
    totalScanned,
    totalDuplicates,
    scanPercentage,
    byStatus,
  };
}

/**
 * Get recent scans for an event
 */
export async function getRecentScans(
  eventId: string,
  organizationId: string,
  limit: number = 50
): Promise<RecentScan[]> {
  // Verify event belongs to organization
  const event = await eventRepo.findByIdInOrg(eventId, organizationId);
  if (!event) {
    throw new Error("Event not found or access denied");
  }

  const scans = await prisma.scanLog.findMany({
    where: {
      ticket: {
        ticketType: {
          eventId,
        },
      },
    },
    include: {
      ticket: {
        include: {
          ticketType: {
            select: {
              name: true,
            },
          },
          order: {
            select: {
              buyerEmail: true,
            },
          },
        },
      },
    },
    orderBy: {
      scannedAt: "desc",
    },
    take: limit,
  });

  return scans.map((scan) => ({
    id: scan.id,
    ticketId: scan.ticketId,
    ticketCode: scan.ticket.code,
    result: scan.result,
    scannedAt: scan.scannedAt,
    scannedBy: scan.scannedBy,
    deviceId: scan.deviceId,
    ticketType: scan.ticket.ticketType.name,
    buyerEmail: scan.ticket.order.buyerEmail,
  }));
}

/**
 * Search tickets and orders by buyer email
 */
export async function searchTicketsByEmail(
  email: string,
  organizationId: string,
  eventId?: string
): Promise<
  Array<{
    id: string;
    code: string;
    status: string;
    eventTitle: string;
    ticketTypeName: string;
    buyerEmail: string;
    orderNumber: string;
    scannedAt: Date | null;
  }>
> {
  const tickets = await prisma.ticket.findMany({
    where: {
      order: {
        buyerEmail: {
          contains: email,
          mode: "insensitive",
        },
        event: {
          organizationId,
          ...(eventId && { id: eventId }),
        },
      },
    },
    include: {
      ticketType: {
        select: {
          name: true,
        },
      },
      order: {
        select: {
          orderNumber: true,
          buyerEmail: true,
          event: {
            select: {
              title: true,
            },
          },
        },
      },
      scanLogs: {
        where: {
          result: "VALID",
        },
        orderBy: {
          scannedAt: "asc",
        },
        take: 1,
      },
    },
  });

  return tickets.map((ticket) => ({
    id: ticket.id,
    code: ticket.code,
    status: ticket.status,
    eventTitle: ticket.order.event.title,
    ticketTypeName: ticket.ticketType.name,
    buyerEmail: ticket.order.buyerEmail,
    orderNumber: ticket.order.orderNumber,
    scannedAt: ticket.scanLogs[0]?.scannedAt ?? null,
  }));
}
