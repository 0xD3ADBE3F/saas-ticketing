import { prisma } from "@/server/lib/prisma";
import type { Order, OrderStatus, OrderItem, Prisma } from "@/generated/prisma";

export type CreateOrderInput = {
  eventId: string;
  buyerEmail: string;
  buyerName?: string;
  ticketTotal: number;
  serviceFee: number;
  totalAmount: number;
  expiresAt?: Date;
};

export type OrderItemInput = {
  ticketTypeId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type OrderWithItems = Order & {
  orderItems: (OrderItem & {
    ticketType: {
      id: string;
      name: string;
      price: number;
    };
  })[];
};

export type OrderWithEvent = Order & {
  event: {
    id: string;
    title: string;
    slug: string;
    startsAt: Date;
    endsAt: Date;
    location: string | null;
  };
  orderItems: (OrderItem & {
    ticketType: {
      id: string;
      name: string;
    };
  })[];
};

/**
 * Generate a unique order number (format: ORD-YYYYMMDD-XXXXX)
 */
function generateOrderNumber(): string {
  const date = new Date();
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ORD-${datePart}-${randomPart}`;
}

export const orderRepo = {
  /**
   * Create a new order with items (transactional)
   * Note: This is called from public checkout, so we validate via event slug
   */
  create: async (
    organizationId: string,
    data: CreateOrderInput,
    items: OrderItemInput[]
  ): Promise<Order | null> => {
    // Generate unique order number
    let orderNumber = generateOrderNumber();
    let attempts = 0;

    // Ensure uniqueness (rare collision case)
    while (attempts < 5) {
      const existing = await prisma.order.findUnique({
        where: { orderNumber },
      });
      if (!existing) break;
      orderNumber = generateOrderNumber();
      attempts++;
    }

    // Create order with items in a transaction
    return prisma.order.create({
      data: {
        organizationId,
        eventId: data.eventId,
        orderNumber,
        buyerEmail: data.buyerEmail.toLowerCase().trim(),
        buyerName: data.buyerName?.trim() || null,
        ticketTotal: data.ticketTotal,
        serviceFee: data.serviceFee,
        totalAmount: data.totalAmount,
        expiresAt: data.expiresAt,
        orderItems: {
          create: items.map((item) => ({
            ticketTypeId: item.ticketTypeId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
      },
      include: {
        orderItems: true,
      },
    });
  },

  /**
   * Find order by ID (scoped to organization via membership)
   */
  findById: async (id: string, userId: string): Promise<OrderWithItems | null> => {
    return prisma.order.findFirst({
      where: {
        id,
        organization: {
          memberships: {
            some: { userId },
          },
        },
      },
      include: {
        orderItems: {
          include: {
            ticketType: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
    });
  },

  /**
   * Find order by ID (public - for checkout flow)
   */
  findByIdPublic: async (id: string): Promise<OrderWithEvent | null> => {
    return prisma.order.findUnique({
      where: { id },
      include: {
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
        orderItems: {
          include: {
            ticketType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  },

  /**
   * Find order by order number
   */
  findByOrderNumber: async (
    orderNumber: string,
    userId: string
  ): Promise<OrderWithItems | null> => {
    return prisma.order.findFirst({
      where: {
        orderNumber,
        organization: {
          memberships: {
            some: { userId },
          },
        },
      },
      include: {
        orderItems: {
          include: {
            ticketType: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
    });
  },

  /**
   * Find order by payment ID (for webhook handling)
   */
  findByPaymentId: async (paymentId: string): Promise<Order | null> => {
    return prisma.order.findUnique({
      where: { paymentId },
    });
  },

  /**
   * List orders by organization
   */
  findByOrganization: async (
    organizationId: string,
    userId: string,
    options?: {
      status?: OrderStatus;
      eventId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<OrderWithItems[]> => {
    const where: Prisma.OrderWhereInput = {
      organizationId,
      organization: {
        memberships: {
          some: { userId },
        },
      },
    };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.eventId) {
      where.eventId = options.eventId;
    }

    return prisma.order.findMany({
      where,
      include: {
        orderItems: {
          include: {
            ticketType: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit,
      skip: options?.offset,
    });
  },

  /**
   * List orders by event
   */
  findByEvent: async (
    eventId: string,
    userId: string,
    options?: {
      status?: OrderStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<OrderWithItems[]> => {
    const where: Prisma.OrderWhereInput = {
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

    return prisma.order.findMany({
      where,
      include: {
        orderItems: {
          include: {
            ticketType: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit,
      skip: options?.offset,
    });
  },

  /**
   * Update order status
   */
  updateStatus: async (
    id: string,
    status: OrderStatus,
    additionalData?: {
      paymentId?: string;
      paymentMethod?: string;
      paidAt?: Date;
      refundedAt?: Date;
    }
  ): Promise<Order | null> => {
    return prisma.order.update({
      where: { id },
      data: {
        status,
        ...additionalData,
      },
    });
  },

  /**
   * Set payment ID on order (idempotent)
   */
  setPaymentId: async (id: string, paymentId: string): Promise<Order | null> => {
    return prisma.order.update({
      where: { id },
      data: { paymentId },
    });
  },

  /**
   * Mark order as paid
   */
  markAsPaid: async (
    id: string,
    paymentMethod?: string
  ): Promise<Order | null> => {
    return prisma.order.update({
      where: { id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentMethod,
      },
    });
  },

  /**
   * Cancel order (only pending orders)
   */
  cancel: async (id: string): Promise<Order | null> => {
    return prisma.order.update({
      where: {
        id,
        status: "PENDING",
      },
      data: {
        status: "CANCELLED",
      },
    });
  },

  /**
   * Count orders by status for an event
   */
  countByEventAndStatus: async (
    eventId: string,
    status: OrderStatus
  ): Promise<number> => {
    return prisma.order.count({
      where: {
        eventId,
        status,
      },
    });
  },

  /**
   * Get total revenue for an event (paid orders only)
   */
  getEventRevenue: async (eventId: string): Promise<number> => {
    const result = await prisma.order.aggregate({
      where: {
        eventId,
        status: "PAID",
      },
      _sum: {
        ticketTotal: true,
      },
    });
    return result._sum.ticketTotal || 0;
  },

  /**
   * Find expired pending orders
   */
  findExpiredPending: async (): Promise<Order[]> => {
    return prisma.order.findMany({
      where: {
        status: "PENDING",
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  },

  /**
   * Search orders by buyer email
   */
  searchByEmail: async (
    organizationId: string,
    userId: string,
    email: string
  ): Promise<OrderWithItems[]> => {
    return prisma.order.findMany({
      where: {
        organizationId,
        organization: {
          memberships: {
            some: { userId },
          },
        },
        buyerEmail: {
          contains: email.toLowerCase(),
          mode: "insensitive",
        },
      },
      include: {
        orderItems: {
          include: {
            ticketType: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  },
};
