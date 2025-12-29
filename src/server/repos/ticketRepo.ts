import { prisma } from "@/server/lib/prisma";
import type { Ticket, TicketStatus, Prisma } from "@/generated/prisma";

export type TicketWithDetails = Ticket & {
  ticketType: {
    id: string;
    name: string;
    price: number;
  };
  event: {
    id: string;
    title: string;
    slug: string;
    startsAt: Date;
    endsAt: Date;
    location: string | null;
  };
  order: {
    id: string;
    orderNumber: string;
    buyerEmail: string;
    buyerName: string | null;
  };
};

export type TicketForScanning = Ticket & {
  ticketType: {
    id: string;
    name: string;
  };
  event: {
    id: string;
    title: string;
    organizationId: string;
  };
};

export const ticketRepo = {
  /**
   * Find ticket by ID
   */
  findById: async (id: string): Promise<TicketWithDetails | null> => {
    return prisma.ticket.findUnique({
      where: { id },
      include: {
        ticketType: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startsAt: true,
            endsAt: true,
            location: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            buyerEmail: true,
            buyerName: true,
          },
        },
      },
    });
  },

  /**
   * Find ticket by short code (human-readable)
   */
  findByCode: async (code: string): Promise<TicketWithDetails | null> => {
    return prisma.ticket.findUnique({
      where: { code },
      include: {
        ticketType: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startsAt: true,
            endsAt: true,
            location: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            buyerEmail: true,
            buyerName: true,
          },
        },
      },
    });
  },

  /**
   * Find ticket by secret token (for QR scan validation)
   */
  findBySecretToken: async (secretToken: string): Promise<TicketForScanning | null> => {
    return prisma.ticket.findUnique({
      where: { secretToken },
      include: {
        ticketType: {
          select: {
            id: true,
            name: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            organizationId: true,
          },
        },
      },
    });
  },

  /**
   * Find all tickets for an order
   */
  findByOrder: async (orderId: string): Promise<TicketWithDetails[]> => {
    return prisma.ticket.findMany({
      where: { orderId },
      include: {
        ticketType: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startsAt: true,
            endsAt: true,
            location: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            buyerEmail: true,
            buyerName: true,
          },
        },
      },
      orderBy: [
        { ticketType: { sortOrder: "asc" } },
        { createdAt: "asc" },
      ],
    });
  },

  /**
   * Find all tickets for an event (for dashboard)
   */
  findByEvent: async (
    eventId: string,
    userId: string,
    options?: {
      status?: TicketStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<TicketWithDetails[]> => {
    const where: Prisma.TicketWhereInput = {
      eventId,
      event: {
        organization: {
          memberships: {
            some: { userId },
          },
        },
      },
    };

    if (options?.status) {
      where.status = options.status;
    }

    return prisma.ticket.findMany({
      where,
      include: {
        ticketType: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startsAt: true,
            endsAt: true,
            location: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            buyerEmail: true,
            buyerName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit,
      skip: options?.offset,
    });
  },

  /**
   * Update ticket status
   */
  updateStatus: async (
    id: string,
    status: TicketStatus,
    additionalData?: {
      usedAt?: Date;
    }
  ): Promise<Ticket | null> => {
    return prisma.ticket.update({
      where: { id },
      data: {
        status,
        ...additionalData,
      },
    });
  },

  /**
   * Mark ticket as used (for scanning)
   */
  markAsUsed: async (id: string): Promise<Ticket | null> => {
    return prisma.ticket.update({
      where: { id },
      data: {
        status: "USED",
        usedAt: new Date(),
      },
    });
  },

  /**
   * Mark ticket as refunded
   */
  markAsRefunded: async (id: string): Promise<Ticket | null> => {
    return prisma.ticket.update({
      where: { id },
      data: {
        status: "REFUNDED",
      },
    });
  },

  /**
   * Count tickets by status for an event
   */
  countByEvent: async (
    eventId: string,
    status?: TicketStatus
  ): Promise<number> => {
    return prisma.ticket.count({
      where: {
        eventId,
        ...(status && { status }),
      },
    });
  },

  /**
   * Get ticket statistics for an event
   */
  getEventStats: async (eventId: string): Promise<{
    total: number;
    valid: number;
    used: number;
    refunded: number;
  }> => {
    const [total, valid, used, refunded] = await Promise.all([
      prisma.ticket.count({ where: { eventId } }),
      prisma.ticket.count({ where: { eventId, status: "VALID" } }),
      prisma.ticket.count({ where: { eventId, status: "USED" } }),
      prisma.ticket.count({ where: { eventId, status: "REFUNDED" } }),
    ]);

    return { total, valid, used, refunded };
  },
};
