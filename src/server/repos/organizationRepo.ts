import { prisma } from "@/server/lib/prisma";
import type { Organization, Membership, Role } from "@/generated/prisma";

export type CreateOrganizationInput = {
  name: string;
  slug: string;
  email?: string;
  // Owner details (for Mollie)
  firstName?: string;
  lastName?: string;
  // Address details (for Mollie)
  streetAndNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  registrationNumber?: string;
  vatNumber?: string;
};

export type UpdateOrganizationInput = {
  name?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  streetAndNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  registrationNumber?: string;
  vatNumber?: string;
};

export const organizationRepo = {
  /**
   * Create a new organization
   */
  create: async (
    data: CreateOrganizationInput,
    userId: string
  ): Promise<Organization> => {
    return prisma.organization.create({
      data: {
        ...data,
        memberships: {
          create: {
            userId,
            role: "ADMIN",
          },
        },
      },
    });
  },

  /**
   * Find organization by ID (scoped check via membership)
   */
  findById: async (
    id: string,
    userId: string
  ): Promise<Organization | null> => {
    return prisma.organization.findFirst({
      where: {
        id,
        memberships: {
          some: { userId },
        },
      },
    });
  },

  /**
   * Find organization by slug
   */
  findBySlug: async (slug: string): Promise<Organization | null> => {
    return prisma.organization.findUnique({
      where: { slug },
    });
  },

  /**
   * List all organizations for a user
   */
  findByUser: async (userId: string): Promise<Organization[]> => {
    return prisma.organization.findMany({
      where: {
        memberships: {
          some: { userId },
        },
      },
      orderBy: { name: "asc" },
    });
  },

  /**
   * Update organization (must be member)
   */
  update: async (
    id: string,
    userId: string,
    data: UpdateOrganizationInput
  ): Promise<Organization | null> => {
    // First verify membership
    const membership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: { organizationId: id, userId },
      },
    });

    if (!membership || membership.role !== "ADMIN") {
      return null;
    }

    return prisma.organization.update({
      where: { id },
      data,
    });
  },

  /**
   * Check if slug is available
   */
  isSlugAvailable: async (slug: string): Promise<boolean> => {
    const existing = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });
    return !existing;
  },

  /**
   * Update design settings (logo, website URL, ticket availability, and/or payment timeout)
   */
  updateDesignSettings: async (
    orgId: string,
    data: {
      logoUrl?: string | null;
      websiteUrl?: string | null;
      showTicketAvailability?: boolean;
      paymentTimeoutMinutes?: number;
    }
  ) => {
    return prisma.organization.update({
      where: { id: orgId },
      data,
      select: {
        id: true,
        logoUrl: true,
        websiteUrl: true,
        showTicketAvailability: true,
        paymentTimeoutMinutes: true,
      },
    });
  },

  /**
   * Get design settings for an organization
   */
  getDesignSettings: async (orgId: string) => {
    return prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        logoUrl: true,
        websiteUrl: true,
        showTicketAvailability: true,
        paymentTimeoutMinutes: true,
      },
    });
  },
};

export const membershipRepo = {
  /**
   * Get user's membership for an organization
   */
  findByOrgAndUser: async (
    organizationId: string,
    userId: string
  ): Promise<Membership | null> => {
    return prisma.membership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    });
  },

  /**
   * Get user's role in an organization
   */
  getRole: async (
    organizationId: string,
    userId: string
  ): Promise<Role | null> => {
    const membership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
      select: { role: true },
    });
    return membership?.role ?? null;
  },

  /**
   * List all members of an organization
   */
  findByOrganization: async (
    organizationId: string,
    userId: string
  ): Promise<Membership[]> => {
    // First verify the requesting user is a member
    const membership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId },
      },
    });

    if (!membership) {
      return [];
    }

    return prisma.membership.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
    });
  },

  /**
   * Add a member to an organization
   */
  create: async (
    organizationId: string,
    targetUserId: string,
    role: Role,
    requestingUserId: string
  ): Promise<Membership | null> => {
    // Verify requesting user is admin
    const requestingMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId: requestingUserId },
      },
    });

    if (!requestingMembership || requestingMembership.role !== "ADMIN") {
      return null;
    }

    return prisma.membership.create({
      data: {
        organizationId,
        userId: targetUserId,
        role,
      },
    });
  },

  /**
   * Update a member's role
   */
  updateRole: async (
    organizationId: string,
    targetUserId: string,
    role: Role,
    requestingUserId: string
  ): Promise<Membership | null> => {
    // Verify requesting user is admin
    const requestingMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId: requestingUserId },
      },
    });

    if (!requestingMembership || requestingMembership.role !== "ADMIN") {
      return null;
    }

    return prisma.membership.update({
      where: {
        organizationId_userId: { organizationId, userId: targetUserId },
      },
      data: { role },
    });
  },

  /**
   * Remove a member from an organization
   */
  delete: async (
    organizationId: string,
    targetUserId: string,
    requestingUserId: string
  ): Promise<boolean> => {
    // Verify requesting user is admin
    const requestingMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: { organizationId, userId: requestingUserId },
      },
    });

    if (!requestingMembership || requestingMembership.role !== "ADMIN") {
      return false;
    }

    // Don't allow removing the last admin
    if (targetUserId === requestingUserId) {
      const adminCount = await prisma.membership.count({
        where: { organizationId, role: "ADMIN" },
      });
      if (adminCount <= 1) {
        return false;
      }
    }

    await prisma.membership.delete({
      where: {
        organizationId_userId: { organizationId, userId: targetUserId },
      },
    });

    return true;
  },
};
