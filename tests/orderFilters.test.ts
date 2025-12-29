import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/server/lib/prisma";
import { orderRepo } from "@/server/repos/orderRepo";
import type { Prisma } from "@/generated/prisma";

const mockPrisma = prisma as unknown as {
  order: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

describe("Order Repository - Filtering and Search", () => {
  const testUserId = "test-user-123";
  const testOrg1Id = "org-1";
  const testOrg2Id = "org-2";
  const testEventId = "event-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findWithFilters", () => {
    it("should filter orders by status", async () => {
      const mockOrders = [
        {
          id: "order-1",
          organizationId: testOrg1Id,
          eventId: testEventId,
          orderNumber: "ORD-20250101-ABCDE",
          buyerEmail: "buyer1@example.com",
          buyerName: null,
          status: "PENDING",
          ticketTotal: 2500,
          serviceFee: 99,
          totalAmount: 2599,
          paymentId: null,
          paymentMethod: null,
          paidAt: null,
          refundedAt: null,
          expiresAt: null,
          createdAt: new Date("2025-01-01"),
          updatedAt: new Date("2025-01-01"),
          event: {
            id: testEventId,
            title: "Test Event",
            slug: "test-event",
            startsAt: new Date("2025-06-01"),
            endsAt: new Date("2025-06-01"),
            location: "Test Location",
          },
          orderItems: [
            {
              ticketType: {
                id: "tt-1",
                name: "General",
              },
              quantity: 1,
            },
          ],
        },
      ];

      mockPrisma.order.findMany.mockResolvedValue(mockOrders);
      mockPrisma.order.count.mockResolvedValue(1);

      const result = await orderRepo.findWithFilters(testOrg1Id, testUserId, {
        status: "PENDING",
      });

      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].status).toBe("PENDING");
      expect(result.total).toBe(1);

      // Verify the where clause includes status filter
      const findManyCall = mockPrisma.order.findMany.mock.calls[0][0] as any;
      expect(findManyCall.where.status).toBe("PENDING");
    });

    it("should search by buyer email", async () => {
      const mockOrders = [
        {
          id: "order-1",
          organizationId: testOrg1Id,
          eventId: testEventId,
          orderNumber: "ORD-20250101-ABCDE",
          buyerEmail: "alice@example.com",
          buyerName: null,
          status: "PENDING",
          ticketTotal: 2500,
          serviceFee: 99,
          totalAmount: 2599,
          paymentId: null,
          paymentMethod: null,
          paidAt: null,
          refundedAt: null,
          expiresAt: null,
          createdAt: new Date("2025-01-01"),
          updatedAt: new Date("2025-01-01"),
          event: {
            id: testEventId,
            title: "Test Event",
            slug: "test-event",
            startsAt: new Date("2025-06-01"),
            endsAt: new Date("2025-06-01"),
            location: "Test Location",
          },
          orderItems: [
            {
              ticketType: {
                id: "tt-1",
                name: "General",
              },
              quantity: 1,
            },
          ],
        },
      ];

      mockPrisma.order.findMany.mockResolvedValue(mockOrders);
      mockPrisma.order.count.mockResolvedValue(1);

      const result = await orderRepo.findWithFilters(testOrg1Id, testUserId, {
        search: "alice",
      });

      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].buyerEmail).toBe("alice@example.com");

      // Verify OR clause for email/order number search
      const findManyCall = mockPrisma.order.findMany.mock.calls[0][0] as any;
      expect(findManyCall.where.OR).toBeDefined();
      expect(findManyCall.where.OR).toHaveLength(2);
    });

    it("should enforce multi-tenancy via membership check", async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      await orderRepo.findWithFilters(testOrg2Id, testUserId, {});

      // Verify where clause includes organization membership check
      const findManyCall = mockPrisma.order.findMany.mock.calls[0][0] as any;
      expect(findManyCall.where.organizationId).toBe(testOrg2Id);
      expect(findManyCall.where.organization.memberships.some.userId).toBe(testUserId);
    });

    it("should support date range filtering", async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      const dateFrom = new Date("2025-01-01");
      const dateTo = new Date("2025-12-31");

      await orderRepo.findWithFilters(testOrg1Id, testUserId, {
        dateFrom,
        dateTo,
      });

      // Verify createdAt date range filter
      const findManyCall = mockPrisma.order.findMany.mock.calls[0][0] as any;
      expect(findManyCall.where.createdAt).toBeDefined();
      expect(findManyCall.where.createdAt.gte).toEqual(dateFrom);
      expect(findManyCall.where.createdAt.lte).toEqual(dateTo);
    });

    it("should support pagination", async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(100);

      await orderRepo.findWithFilters(testOrg1Id, testUserId, {
        limit: 10,
        offset: 20,
      });

      // Verify pagination parameters
      const findManyCall = mockPrisma.order.findMany.mock.calls[0][0] as any;
      expect(findManyCall.take).toBe(10);
      expect(findManyCall.skip).toBe(20);
    });

    it("should order by createdAt desc", async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      await orderRepo.findWithFilters(testOrg1Id, testUserId, {});

      // Verify orderBy clause
      const findManyCall = mockPrisma.order.findMany.mock.calls[0][0] as any;
      expect(findManyCall.orderBy).toEqual({ createdAt: "desc" });
    });

    it("should combine multiple filters", async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      await orderRepo.findWithFilters(testOrg1Id, testUserId, {
        status: "PAID",
        search: "alice",
        eventId: testEventId,
        dateFrom: new Date("2025-01-01"),
      });

      // Verify all filters are applied
      const findManyCall = mockPrisma.order.findMany.mock.calls[0][0] as any;
      expect(findManyCall.where.status).toBe("PAID");
      expect(findManyCall.where.OR).toBeDefined(); // Search
      expect(findManyCall.where.eventId).toBe(testEventId);
      expect(findManyCall.where.createdAt.gte).toBeDefined();
    });

    it("should return both orders array and total count", async () => {
      const mockOrders = [
        {
          id: "order-1",
          organizationId: testOrg1Id,
          eventId: testEventId,
          orderNumber: "ORD-20250101-ABCDE",
          buyerEmail: "buyer1@example.com",
          buyerName: null,
          status: "PAID",
          ticketTotal: 2500,
          serviceFee: 99,
          totalAmount: 2599,
          paymentId: "pay_123",
          paymentMethod: "ideal",
          paidAt: new Date("2025-01-01"),
          refundedAt: null,
          expiresAt: null,
          createdAt: new Date("2025-01-01"),
          updatedAt: new Date("2025-01-01"),
          event: {
            id: testEventId,
            title: "Test Event",
            slug: "test-event",
            startsAt: new Date("2025-06-01"),
            endsAt: new Date("2025-06-01"),
            location: "Test Location",
          },
          orderItems: [
            {
              ticketType: {
                id: "tt-1",
                name: "General",
              },
              quantity: 1,
            },
          ],
        },
      ];

      mockPrisma.order.findMany.mockResolvedValue(mockOrders);
      mockPrisma.order.count.mockResolvedValue(5);

      const result = await orderRepo.findWithFilters(testOrg1Id, testUserId, {
        limit: 1,
      });

      expect(result.orders).toHaveLength(1);
      expect(result.total).toBe(5);
    });
  });
});
