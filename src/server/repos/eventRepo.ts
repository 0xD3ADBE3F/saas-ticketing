import { prisma } from "@/server/lib/prisma";
import type { Event, EventStatus } from "@/generated/prisma";

export type CreateEventInput = {
  title: string;
  slug: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  status?: EventStatus;
  isPaid?: boolean;
  vatRate?: "STANDARD_21" | "REDUCED_9" | "EXEMPT";
};

export type UpdateEventInput = {
  title?: string;
  slug?: string;
  description?: string | null;
  location?: string | null;
  startsAt?: Date;
  endsAt?: Date;
  status?: EventStatus;
  isPaid?: boolean;
  vatRate?: "STANDARD_21" | "REDUCED_9" | "EXEMPT";
};

export type EventFilters = {
  status?: EventStatus;
  search?: string;
};

export type PublicEvent = Event & {
  organization: {
    name: string;
    slug: string;
    logoUrl: string | null;
    websiteUrl: string | null;
    showTicketAvailability: boolean;
  };
  ticketTypes: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    capacity: number;
    soldCount: number;
    saleStart: Date | null;
    saleEnd: Date | null;
    sortOrder: number;
  }[];
};

export const eventRepo = {
  /**
   * Create a new event (scoped to organization)
   */
  create: async (
    organizationId: string,
    userId: string,
    data: CreateEventInput
  ): Promise<Event | null> => {
    // Verify user has access to organization
    const membership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    });

    if (!membership) {
      return null;
    }

    return prisma.event.create({
      data: {
        ...data,
        organizationId,
      },
    });
  },

  /**
   * Find event by ID (scoped to organization via membership)
   */
  findById: async (
    id: string,
    userId: string
  ): Promise<Event | null> => {
    return prisma.event.findFirst({
      where: {
        id,
        organization: {
          memberships: {
            some: { userId },
          },
        },
      },
    });
  },

  /**
   * Find event by ID within specific organization
   */
  findByIdInOrg: async (
    id: string,
    organizationId: string
  ): Promise<Event | null> => {
    return prisma.event.findFirst({
      where: {
        id,
        organizationId,
      },
    });
  },

  /**
   * Find event by slug (public - no auth required)
   */
  findBySlug: async (
    organizationId: string,
    slug: string
  ): Promise<Event | null> => {
    return prisma.event.findUnique({
      where: {
        organizationId_slug: { organizationId, slug },
      },
    });
  },

  /**
   * Find public event by slug (only LIVE events)
   */
  findPublicBySlug: async (slug: string): Promise<PublicEvent | null> => {
    return prisma.event.findFirst({
      where: {
        slug,
        status: "LIVE",
      },
      include: {
        organization: {
          select: {
            name: true,
            slug: true,
            logoUrl: true,
            websiteUrl: true,
            showTicketAvailability: true,
          },
        },
        ticketTypes: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            capacity: true,
            soldCount: true,
            saleStart: true,
            saleEnd: true,
            sortOrder: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });
  },

  /**
   * List all events for an organization (scoped via membership)
   */
  findByOrganization: async (
    organizationId: string,
    userId: string,
    filters?: EventFilters
  ): Promise<Event[]> => {
    // First verify membership
    const membership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    });

    if (!membership) {
      return [];
    }

    return prisma.event.findMany({
      where: {
        organizationId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.search && {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { location: { contains: filters.search, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: { startsAt: "desc" },
    });
  },

  /**
   * List all events for a user (across all their organizations)
   */
  findByUser: async (
    userId: string,
    filters?: EventFilters
  ): Promise<Event[]> => {
    return prisma.event.findMany({
      where: {
        organization: {
          memberships: {
            some: { userId },
          },
        },
        ...(filters?.status && { status: filters.status }),
        ...(filters?.search && {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { location: { contains: filters.search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        organization: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { startsAt: "desc" },
    });
  },

  /**
   * Update event (must be member of organization)
   */
  update: async (
    id: string,
    userId: string,
    data: UpdateEventInput
  ): Promise<Event | null> => {
    // First find the event and verify membership
    const event = await prisma.event.findFirst({
      where: {
        id,
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

    return prisma.event.update({
      where: { id },
      data,
    });
  },

  /**
   * Delete event (must be ADMIN of organization)
   */
  delete: async (
    id: string,
    userId: string
  ): Promise<Event | null> => {
    // First find the event and verify admin membership
    const event = await prisma.event.findFirst({
      where: {
        id,
        organization: {
          memberships: {
            some: {
              userId,
              role: "ADMIN",
            },
          },
        },
      },
    });

    if (!event) {
      return null;
    }

    return prisma.event.delete({
      where: { id },
    });
  },

  /**
   * Check if slug is available within organization
   */
  isSlugAvailable: async (
    organizationId: string,
    slug: string,
    excludeEventId?: string
  ): Promise<boolean> => {
    const existing = await prisma.event.findFirst({
      where: {
        organizationId,
        slug,
        ...(excludeEventId && { NOT: { id: excludeEventId } }),
      },
    });

    return !existing;
  },

  /**
   * Update event status
   */
  updateStatus: async (
    id: string,
    userId: string,
    status: EventStatus
  ): Promise<Event | null> => {
    // Verify membership first
    const event = await prisma.event.findFirst({
      where: {
        id,
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

    return prisma.event.update({
      where: { id },
      data: { status },
    });
  },

  /**
   * Get event statistics
   */
  getStats: async (
    id: string,
    userId: string
  ): Promise<{
    ticketTypeCount: number;
    totalCapacity: number;
    totalSold: number;
  } | null> => {
    const event = await prisma.event.findFirst({
      where: {
        id,
        organization: {
          memberships: {
            some: { userId },
          },
        },
      },
      include: {
        ticketTypes: {
          select: {
            capacity: true,
            soldCount: true,
          },
        },
      },
    });

    if (!event) {
      return null;
    }

    return {
      ticketTypeCount: event.ticketTypes.length,
      totalCapacity: event.ticketTypes.reduce((sum, tt) => sum + tt.capacity, 0),
      totalSold: event.ticketTypes.reduce((sum, tt) => sum + tt.soldCount, 0),
    };
  },

  /**
   * List all public events (no auth required)
   * Only shows LIVE events from organizations with showOnPublicEventsPage = true
   */
  findPublicEvents: async (): Promise<PublicEvent[]> => {
    const events = await prisma.event.findMany({
      where: {
        status: "LIVE",
        startsAt: {
          gte: new Date(), // Only future events
        },
        organization: {
          showOnPublicEventsPage: true,
        },
      },
      include: {
        organization: {
          select: {
            name: true,
            slug: true,
            logoUrl: true,
            websiteUrl: true,
            showTicketAvailability: true,
          },
        },
        ticketTypes: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            capacity: true,
            soldCount: true,
            saleStart: true,
            saleEnd: true,
            sortOrder: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
      orderBy: {
        startsAt: "asc", // Upcoming events first
      },
    });

    return events;
  },
};
