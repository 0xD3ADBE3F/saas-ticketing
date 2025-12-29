import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    organization: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    membership: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/server/lib/prisma";
import { organizationRepo, membershipRepo } from "@/server/repos/organizationRepo";

const mockPrisma = prisma as unknown as {
  organization: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  membership: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

describe("Organization Repository - Tenant Scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findById", () => {
    it("should only return organization if user is a member", async () => {
      const orgId = "org-123";
      const userId = "user-456";

      mockPrisma.organization.findFirst.mockResolvedValue({
        id: orgId,
        name: "Test Org",
        slug: "test-org",
      });

      const result = await organizationRepo.findById(orgId, userId);

      expect(mockPrisma.organization.findFirst).toHaveBeenCalledWith({
        where: {
          id: orgId,
          memberships: {
            some: { userId },
          },
        },
      });
      expect(result).toBeDefined();
      expect(result?.id).toBe(orgId);
    });

    it("should return null if user is not a member", async () => {
      const orgId = "org-123";
      const unauthorizedUserId = "user-unauthorized";

      mockPrisma.organization.findFirst.mockResolvedValue(null);

      const result = await organizationRepo.findById(orgId, unauthorizedUserId);

      expect(result).toBeNull();
    });
  });

  describe("findByUser", () => {
    it("should only return organizations where user is a member", async () => {
      const userId = "user-456";

      mockPrisma.organization.findMany.mockResolvedValue([
        { id: "org-1", name: "Org 1", slug: "org-1" },
        { id: "org-2", name: "Org 2", slug: "org-2" },
      ]);

      const result = await organizationRepo.findByUser(userId);

      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith({
        where: {
          memberships: {
            some: { userId },
          },
        },
        orderBy: { name: "asc" },
      });
      expect(result).toHaveLength(2);
    });

    it("should return empty array if user has no organizations", async () => {
      mockPrisma.organization.findMany.mockResolvedValue([]);

      const result = await organizationRepo.findByUser("user-no-orgs");

      expect(result).toHaveLength(0);
    });
  });

  describe("update", () => {
    it("should only allow admin to update organization", async () => {
      const orgId = "org-123";
      const adminUserId = "admin-user";

      mockPrisma.membership.findUnique.mockResolvedValue({
        organizationId: orgId,
        userId: adminUserId,
        role: "ADMIN",
      });
      mockPrisma.organization.update.mockResolvedValue({
        id: orgId,
        name: "Updated Name",
        slug: "test-org",
      });

      const result = await organizationRepo.update(orgId, adminUserId, {
        name: "Updated Name",
      });

      expect(result).toBeDefined();
      expect(result?.name).toBe("Updated Name");
    });

    it("should reject update from non-admin member", async () => {
      const orgId = "org-123";
      const memberUserId = "member-user";

      mockPrisma.membership.findUnique.mockResolvedValue({
        organizationId: orgId,
        userId: memberUserId,
        role: "MEMBER",
      });

      const result = await organizationRepo.update(orgId, memberUserId, {
        name: "Attempted Update",
      });

      expect(result).toBeNull();
      expect(mockPrisma.organization.update).not.toHaveBeenCalled();
    });

    it("should reject update from non-member", async () => {
      const orgId = "org-123";
      const nonMemberUserId = "non-member";

      mockPrisma.membership.findUnique.mockResolvedValue(null);

      const result = await organizationRepo.update(orgId, nonMemberUserId, {
        name: "Attempted Update",
      });

      expect(result).toBeNull();
      expect(mockPrisma.organization.update).not.toHaveBeenCalled();
    });
  });
});

describe("Membership Repository - Tenant Scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findByOrganization", () => {
    it("should only return members if requesting user is a member", async () => {
      const orgId = "org-123";
      const userId = "user-456";

      mockPrisma.membership.findUnique.mockResolvedValue({
        organizationId: orgId,
        userId,
        role: "ADMIN",
      });
      mockPrisma.membership.findMany.mockResolvedValue([
        { organizationId: orgId, userId, role: "ADMIN" },
        { organizationId: orgId, userId: "user-789", role: "MEMBER" },
      ]);

      const result = await membershipRepo.findByOrganization(orgId, userId);

      expect(result).toHaveLength(2);
    });

    it("should return empty array if user is not a member", async () => {
      const orgId = "org-123";
      const nonMemberUserId = "non-member";

      mockPrisma.membership.findUnique.mockResolvedValue(null);

      const result = await membershipRepo.findByOrganization(
        orgId,
        nonMemberUserId
      );

      expect(result).toHaveLength(0);
      expect(mockPrisma.membership.findMany).not.toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("should only allow admin to add members", async () => {
      const orgId = "org-123";
      const adminUserId = "admin-user";
      const newUserId = "new-user";

      mockPrisma.membership.findUnique.mockResolvedValue({
        organizationId: orgId,
        userId: adminUserId,
        role: "ADMIN",
      });
      mockPrisma.membership.create.mockResolvedValue({
        organizationId: orgId,
        userId: newUserId,
        role: "MEMBER",
      });

      const result = await membershipRepo.create(
        orgId,
        newUserId,
        "MEMBER",
        adminUserId
      );

      expect(result).toBeDefined();
      expect(result?.userId).toBe(newUserId);
    });

    it("should reject member addition from non-admin", async () => {
      const orgId = "org-123";
      const memberUserId = "member-user";
      const newUserId = "new-user";

      mockPrisma.membership.findUnique.mockResolvedValue({
        organizationId: orgId,
        userId: memberUserId,
        role: "MEMBER",
      });

      const result = await membershipRepo.create(
        orgId,
        newUserId,
        "MEMBER",
        memberUserId
      );

      expect(result).toBeNull();
      expect(mockPrisma.membership.create).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("should prevent removing the last admin", async () => {
      const orgId = "org-123";
      const adminUserId = "admin-user";

      // Admin trying to remove themselves
      mockPrisma.membership.findUnique.mockResolvedValue({
        organizationId: orgId,
        userId: adminUserId,
        role: "ADMIN",
      });
      // Only 1 admin exists
      mockPrisma.membership.count.mockResolvedValue(1);

      const result = await membershipRepo.delete(orgId, adminUserId, adminUserId);

      expect(result).toBe(false);
      expect(mockPrisma.membership.delete).not.toHaveBeenCalled();
    });
  });
});
