import { prisma } from "@/server/lib/prisma";
import type { TicketType } from "@/generated/prisma";

export type CreateTicketTypeInput = {
  name: string;
  description?: string;
  price: number; // In cents
  capacity: number;
  saleStart?: Date;
  saleEnd?: Date;
  sortOrder?: number;
};

export type UpdateTicketTypeInput = {
  name?: string;
  description?: string;
  price?: number;
  capacity?: number;
  saleStart?: Date | null;
  saleEnd?: Date | null;
  sortOrder?: number;
};

export const ticketTypeRepo = {
  /**
   * Create a new ticket type (scoped to event via membership)
   */
  create: async (
    eventId: string,
    userId: string,
    data: CreateTicketTypeInput
  ): Promise<TicketType | null> => {
    // Verify user has access to event via organization membership
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organization: {
          memberships: {
            some: { userId },
          },
        },
      },
    });

    if (!event) {
      return null;
    }

    return prisma.ticketType.create({
      data: {
        ...data,
        eventId,
      },
    });
  },

  /**
   * Find ticket type by ID (scoped via membership)
   */
  findById: async (
    id: string,
    userId: string
  ): Promise<TicketType | null> => {
    return prisma.ticketType.findFirst({
      where: {
        id,
        event: {
          organization: {
            memberships: {
              some: { userId },
            },
          },
        },
      },
    });
  },

  /**
   * Find ticket type by ID with event info
   */
  findByIdWithEvent: async (
    id: string,
    userId: string
  ): Promise<(TicketType & { event: { id: string; title: string; status: string; organizationId: string } }) | null> => {
    return prisma.ticketType.findFirst({
      where: {
        id,
        event: {
          organization: {
            memberships: {
              some: { userId },
            },
          },
        },
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            status: true,
            organizationId: true,
          },
        },
      },
    });
  },

  /**
   * List all ticket types for an event (scoped via membership)
   */
  findByEvent: async (
    eventId: string,
    userId: string
  ): Promise<TicketType[]> => {
    // First verify access
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organization: {
          memberships: {
            some: { userId },
          },
        },
      },
    });

    if (!event) {
      return [];
    }

    return prisma.ticketType.findMany({
      where: { eventId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  /**
   * List public ticket types for an event (only for LIVE events)
   */
  findPublicByEvent: async (
    eventId: string
  ): Promise<TicketType[]> => {
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        status: "LIVE",
      },
    });

    if (!event) {
      return [];
    }

    return prisma.ticketType.findMany({
      where: { eventId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  /**
   * Update ticket type (must be member of organization)
   */
  update: async (
    id: string,
    userId: string,
    data: UpdateTicketTypeInput
  ): Promise<TicketType | null> => {
    // First find and verify membership
    const ticketType = await prisma.ticketType.findFirst({
      where: {
        id,
        event: {
          organization: {
            memberships: {
              some: { userId },
            },
          },
        },
      },
    });

    if (!ticketType) {
      return null;
    }

    return prisma.ticketType.update({
      where: { id },
      data,
    });
  },

  /**
   * Delete ticket type (only if no tickets sold)
   */
  delete: async (
    id: string,
    userId: string
  ): Promise<TicketType | null> => {
    // First find and verify membership and no tickets sold
    const ticketType = await prisma.ticketType.findFirst({
      where: {
        id,
        event: {
          organization: {
            memberships: {
              some: { userId },
            },
          },
        },
      },
    });

    if (!ticketType) {
      return null;
    }

    // Check if any tickets have been sold
    if (ticketType.soldCount > 0) {
      return null;
    }

    return prisma.ticketType.delete({
      where: { id },
    });
  },

  /**
   * Increment sold count (for order processing)
   * Returns null if capacity would be exceeded
   */
  incrementSoldCount: async (
    id: string,
    quantity: number
  ): Promise<TicketType | null> => {
    // Use a transaction to ensure atomicity
    return prisma.$transaction(async (tx) => {
      const ticketType = await tx.ticketType.findUnique({
        where: { id },
      });

      if (!ticketType) {
        return null;
      }

      // Check capacity
      if (ticketType.soldCount + quantity > ticketType.capacity) {
        return null;
      }

      return tx.ticketType.update({
        where: { id },
        data: {
          soldCount: {
            increment: quantity,
          },
        },
      });
    });
  },

  /**
   * Decrement sold count (for refunds)
   */
  decrementSoldCount: async (
    id: string,
    quantity: number
  ): Promise<TicketType | null> => {
    return prisma.$transaction(async (tx) => {
      const ticketType = await tx.ticketType.findUnique({
        where: { id },
      });

      if (!ticketType) {
        return null;
      }

      // Don't go below 0
      const newCount = Math.max(0, ticketType.soldCount - quantity);

      return tx.ticketType.update({
        where: { id },
        data: {
          soldCount: newCount,
        },
      });
    });
  },

  /**
   * Get availability info for ticket type
   */
  getAvailability: async (
    id: string
  ): Promise<{
    available: number;
    total: number;
    sold: number;
    isOnSale: boolean;
  } | null> => {
    const ticketType = await prisma.ticketType.findUnique({
      where: { id },
      include: {
        event: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!ticketType) {
      return null;
    }

    const now = new Date();
    const isWithinSaleWindow =
      (!ticketType.saleStart || ticketType.saleStart <= now) &&
      (!ticketType.saleEnd || ticketType.saleEnd >= now);

    return {
      available: ticketType.capacity - ticketType.soldCount,
      total: ticketType.capacity,
      sold: ticketType.soldCount,
      isOnSale: ticketType.event.status === "LIVE" && isWithinSaleWindow,
    };
  },

  /**
   * Reorder ticket types
   */
  reorder: async (
    eventId: string,
    userId: string,
    orderedIds: string[]
  ): Promise<boolean> => {
    // Verify access
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organization: {
          memberships: {
            some: { userId },
          },
        },
      },
    });

    if (!event) {
      return false;
    }

    // Update sort orders
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.ticketType.updateMany({
          where: { id, eventId },
          data: { sortOrder: index },
        })
      )
    );

    return true;
  },
};
