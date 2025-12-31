import { prisma } from "@/server/lib/prisma";
import { calculateApplicationFee, MOLLIE_FEE } from "@/server/services/molliePaymentService";

/**
 * Payout Breakdown Structure:
 *
 * Buyer pays:
 *   - Ticket Total
 *   - Service Fee (€0.50 + 2%)
 *
 * Money flow:
 *   - Ticket Total → Organizer's Mollie balance
 *   - Service Fee - Mollie Fee (€0.35) → Platform (via application fee)
 *   - Mollie Fee (€0.35) → Mollie (transaction cost, paid by organizer)
 *
 * Organizer receives:
 *   - Gross Revenue (ticket sales) - Mollie Fees
 */

export interface EventPayoutBreakdown {
  eventId: string;
  eventTitle: string;
  ticketsSold: number;
  grossRevenue: number; // Total ticket sales in cents
  serviceFees: number; // Service fees paid by buyers (goes to platform)
  platformFee: number; // What platform receives (service fee - Mollie fees)
  mollieFees: number; // Mollie transaction fees (paid by organizer)
  netPayout: number; // What the organizer receives (gross - Mollie fees)
}

export interface OrganizationPayoutSummary {
  totalGrossRevenue: number;
  totalServiceFees: number; // Total service fees collected from buyers
  totalPlatformFees: number; // Total platform receives (service fees - Mollie fees)
  totalMollieFees: number; // Total Mollie transaction fees
  totalNetPayout: number; // Total organizer receives (gross - Mollie fees)
  events: EventPayoutBreakdown[];
}

/**
 * Payout Service
 * Calculate payout breakdowns per event and organization
 */
export const payoutService = {
  /**
   * Calculate payout breakdown for a single event
   */
  async getEventPayoutBreakdown(
    eventId: string,
    organizationId: string
  ): Promise<EventPayoutBreakdown | null> {
    // Verify event belongs to organization
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizationId,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!event) {
      return null;
    }

    // Get all paid orders for this event
    const orders = await prisma.order.findMany({
      where: {
        eventId,
        organizationId,
        status: "PAID",
      },
      select: {
        ticketTotal: true,
        serviceFee: true,
        tickets: {
          select: {
            id: true,
          },
        },
      },
    });

    // Calculate totals
    const grossRevenue = orders.reduce(
      (sum, order) => sum + order.ticketTotal,
      0
    );
    const serviceFees = orders.reduce((sum, order) => sum + order.serviceFee, 0);
    const ticketsSold = orders.reduce(
      (sum, order) => sum + order.tickets.length,
      0
    );

    // Platform receives: service fees minus Mollie transaction fees
    const platformFee = orders.reduce(
      (sum, order) => sum + calculateApplicationFee(order.serviceFee),
      0
    );

    // Mollie transaction fees (€0.35 per order, paid by organizer)
    const mollieFees = orders.length * MOLLIE_FEE;

    // Net payout: gross revenue minus Mollie fees
    // (Service fees go to platform via application fee)
    const netPayout = grossRevenue - mollieFees;

    return {
      eventId: event.id,
      eventTitle: event.title,
      ticketsSold,
      grossRevenue,
      serviceFees,
      platformFee,
      mollieFees,
      netPayout,
    };
  },

  /**
   * Calculate payout summary for entire organization
   */
  async getOrganizationPayoutSummary(
    organizationId: string,
    options?: {
      from?: Date;
      until?: Date;
    }
  ): Promise<OrganizationPayoutSummary> {
    // Get all events for this organization
    const eventFilter: {
      organizationId: string;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      organizationId,
    };

    if (options?.from || options?.until) {
      eventFilter.createdAt = {};
      if (options.from) {
        eventFilter.createdAt.gte = options.from;
      }
      if (options.until) {
        eventFilter.createdAt.lte = options.until;
      }
    }

    const events = await prisma.event.findMany({
      where: eventFilter,
      select: {
        id: true,
        title: true,
      },
      orderBy: {
        startsAt: "desc",
      },
    });

    // Calculate breakdown for each event
    const eventBreakdowns: EventPayoutBreakdown[] = [];
    let totalGrossRevenue = 0;
    let totalServiceFees = 0;
    let totalPlatformFees = 0;
    let totalMollieFees = 0;
    let totalNetPayout = 0;

    for (const event of events) {
      const breakdown = await this.getEventPayoutBreakdown(
        event.id,
        organizationId
      );

      if (breakdown && breakdown.grossRevenue > 0) {
        eventBreakdowns.push(breakdown);
        totalGrossRevenue += breakdown.grossRevenue;
        totalServiceFees += breakdown.serviceFees;
        totalPlatformFees += breakdown.platformFee;
        totalMollieFees += breakdown.mollieFees;
        totalNetPayout += breakdown.netPayout;
      }
    }

    return {
      totalGrossRevenue,
      totalServiceFees,
      totalPlatformFees,
      totalMollieFees,
      totalNetPayout,
      events: eventBreakdowns,
    };
  },

  /**
   * Get orders for CSV export
   */
  async getOrdersForExport(
    organizationId: string,
    options?: {
      eventId?: string;
      from?: Date;
      until?: Date;
    }
  ) {
    const where: {
      organizationId: string;
      status: "PAID";
      eventId?: string;
      paidAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      organizationId,
      status: "PAID",
    };

    if (options?.eventId) {
      where.eventId = options.eventId;
    }

    if (options?.from || options?.until) {
      where.paidAt = {};
      if (options.from) {
        where.paidAt.gte = options.from;
      }
      if (options.until) {
        where.paidAt.lte = options.until;
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        event: {
          select: {
            title: true,
            startsAt: true,
          },
        },
        orderItems: {
          include: {
            ticketType: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        paidAt: "desc",
      },
    });

    return orders.map((order) => ({
      orderNumber: order.orderNumber,
      eventTitle: order.event.title,
      eventDate: order.event.startsAt,
      buyerEmail: order.buyerEmail,
      buyerName: order.buyerName || "",
      items: order.orderItems.map((item) => ({
        ticketType: item.ticketType.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      ticketTotal: order.ticketTotal,
      serviceFee: order.serviceFee,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod || "",
      paidAt: order.paidAt,
    }));
  },

  /**
   * Get tickets for CSV export
   */
  async getTicketsForExport(
    organizationId: string,
    options?: {
      eventId?: string;
      from?: Date;
      until?: Date;
    }
  ) {
    const where: {
      order: {
        organizationId: string;
        status: "PAID";
      };
      eventId?: string;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      order: {
        organizationId,
        status: "PAID",
      },
    };

    if (options?.eventId) {
      where.eventId = options.eventId;
    }

    if (options?.from || options?.until) {
      where.createdAt = {};
      if (options.from) {
        where.createdAt.gte = options.from;
      }
      if (options.until) {
        where.createdAt.lte = options.until;
      }
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        ticketType: {
          select: {
            name: true,
          },
        },
        event: {
          select: {
            title: true,
            startsAt: true,
          },
        },
        order: {
          select: {
            orderNumber: true,
            buyerEmail: true,
            buyerName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return tickets.map((ticket) => ({
      ticketCode: ticket.code,
      eventTitle: ticket.event.title,
      eventDate: ticket.event.startsAt,
      ticketType: ticket.ticketType.name,
      orderNumber: ticket.order.orderNumber,
      buyerEmail: ticket.order.buyerEmail,
      buyerName: ticket.order.buyerName || "",
      status: ticket.status,
      usedAt: ticket.usedAt,
      createdAt: ticket.createdAt,
    }));
  },

  /**
   * Get scan logs for CSV export
   */
  async getScanLogsForExport(
    organizationId: string,
    options?: {
      eventId?: string;
      from?: Date;
      until?: Date;
    }
  ) {
    const where: {
      ticket: {
        order: {
          organizationId: string;
        };
        eventId?: string;
      };
      scannedAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      ticket: {
        order: {
          organizationId,
        },
      },
    };

    if (options?.eventId) {
      where.ticket = {
        ...where.ticket,
        eventId: options.eventId,
      };
    }

    if (options?.from || options?.until) {
      where.scannedAt = {};
      if (options.from) {
        where.scannedAt.gte = options.from;
      }
      if (options.until) {
        where.scannedAt.lte = options.until;
      }
    }

    const scanLogs = await prisma.scanLog.findMany({
      where,
      include: {
        ticket: {
          include: {
            event: {
              select: {
                title: true,
              },
            },
            ticketType: {
              select: {
                name: true,
              },
            },
            order: {
              select: {
                orderNumber: true,
                buyerEmail: true,
              },
            },
          },
        },
      },
      orderBy: {
        scannedAt: "desc",
      },
    });

    return scanLogs.map((log) => ({
      scanDate: log.scannedAt,
      eventTitle: log.ticket.event.title,
      ticketCode: log.ticket.code,
      ticketType: log.ticket.ticketType.name,
      orderNumber: log.ticket.order.orderNumber,
      buyerEmail: log.ticket.order.buyerEmail,
      result: log.result,
      scannedBy: log.scannedBy,
      deviceId: log.deviceId || "",
      offlineSync: log.offlineSync,
      syncedAt: log.syncedAt,
    }));
  },
};
