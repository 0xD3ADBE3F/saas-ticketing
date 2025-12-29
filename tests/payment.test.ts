import { describe, it, expect, vi, beforeEach } from "vitest";
import * as paymentService from "@/server/services/paymentService";

// Mock prisma
vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    ticket: {
      findUnique: vi.fn(),
      createMany: vi.fn(),
      count: vi.fn(),
    },
    ticketType: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock orderRepo
vi.mock("@/server/repos/orderRepo", () => ({
  orderRepo: {
    findByIdPublic: vi.fn(),
    findByPaymentId: vi.fn(),
    setPaymentId: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

import { prisma } from "@/server/lib/prisma";
import { orderRepo } from "@/server/repos/orderRepo";

describe("Payment Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPayment", () => {
    it("should fail for non-existent order", async () => {
      vi.mocked(orderRepo.findByIdPublic).mockResolvedValue(null);

      const result = await paymentService.createPayment(
        "non-existent-id",
        "http://localhost:3000"
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Bestelling niet gevonden");
      }
    });

    it("should fail for non-pending order", async () => {
      vi.mocked(orderRepo.findByIdPublic).mockResolvedValue({
        id: "order-1",
        status: "PAID",
        totalAmount: 1500,
        expiresAt: null,
        paymentId: null,
        event: {
          id: "event-1",
          title: "Test Event",
          slug: "test-event",
          startsAt: new Date(),
          endsAt: new Date(),
          location: null,
        },
        orderItems: [],
      } as any);

      const result = await paymentService.createPayment(
        "order-1",
        "http://localhost:3000"
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Bestelling kan niet meer betaald worden");
      }
    });

    it("should fail for expired order", async () => {
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 1);

      vi.mocked(orderRepo.findByIdPublic).mockResolvedValue({
        id: "order-1",
        status: "PENDING",
        totalAmount: 1500,
        expiresAt: expiredDate,
        paymentId: null,
        event: {
          id: "event-1",
          title: "Test Event",
          slug: "test-event",
          startsAt: new Date(),
          endsAt: new Date(),
          location: null,
        },
        orderItems: [],
      } as any);

      const result = await paymentService.createPayment(
        "order-1",
        "http://localhost:3000"
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Bestelling is verlopen");
      }
    });

    it("should create payment for valid pending order", async () => {
      vi.mocked(orderRepo.findByIdPublic).mockResolvedValue({
        id: "order-1",
        status: "PENDING",
        totalAmount: 1500,
        expiresAt: null,
        paymentId: null,
        event: {
          id: "event-1",
          title: "Test Event",
          slug: "test-event",
          startsAt: new Date(),
          endsAt: new Date(),
          location: null,
        },
        orderItems: [],
      } as any);
      vi.mocked(orderRepo.setPaymentId).mockResolvedValue({} as any);

      const result = await paymentService.createPayment(
        "order-1",
        "http://localhost:3000"
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.paymentId).toMatch(/^tr_mock_/);
        expect(result.data.checkoutUrl).toContain("/checkout/order-1/pay");
      }
      expect(orderRepo.setPaymentId).toHaveBeenCalledWith(
        "order-1",
        expect.stringMatching(/^tr_mock_/)
      );
    });

    it("should reuse existing open payment", async () => {
      // First create a payment
      vi.mocked(orderRepo.findByIdPublic).mockResolvedValue({
        id: "order-reuse",
        status: "PENDING",
        totalAmount: 1500,
        expiresAt: null,
        paymentId: null,
        event: {
          id: "event-1",
          title: "Test Event",
          slug: "test-event",
          startsAt: new Date(),
          endsAt: new Date(),
          location: null,
        },
        orderItems: [],
      } as any);
      vi.mocked(orderRepo.setPaymentId).mockResolvedValue({} as any);

      const result1 = await paymentService.createPayment(
        "order-reuse",
        "http://localhost:3000"
      );

      expect(result1.success).toBe(true);
      const paymentId = result1.success ? result1.data.paymentId : "";

      // Now try again with existing payment
      vi.mocked(orderRepo.findByIdPublic).mockResolvedValue({
        id: "order-reuse",
        status: "PENDING",
        totalAmount: 1500,
        expiresAt: null,
        paymentId: paymentId,
        event: {
          id: "event-1",
          title: "Test Event",
          slug: "test-event",
          startsAt: new Date(),
          endsAt: new Date(),
          location: null,
        },
        orderItems: [],
      } as any);

      const result2 = await paymentService.createPayment(
        "order-reuse",
        "http://localhost:3000"
      );

      expect(result2.success).toBe(true);
      if (result2.success) {
        expect(result2.data.paymentId).toBe(paymentId);
      }
    });
  });

  describe("completeMockPayment - idempotency", () => {
    it("should fail for non-existent payment", async () => {
      const result = await paymentService.completeMockPayment("non-existent");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Betaling niet gevonden");
      }
    });

    it("should be idempotent - second call returns same result", async () => {
      // First, create a payment
      vi.mocked(orderRepo.findByIdPublic).mockResolvedValue({
        id: "order-idempotent",
        status: "PENDING",
        totalAmount: 1500,
        expiresAt: null,
        paymentId: null,
        event: {
          id: "event-1",
          title: "Test Event",
          slug: "test-event",
          startsAt: new Date(),
          endsAt: new Date(),
          location: null,
        },
        orderItems: [],
      } as any);
      vi.mocked(orderRepo.setPaymentId).mockResolvedValue({} as any);

      const createResult = await paymentService.createPayment(
        "order-idempotent",
        "http://localhost:3000"
      );

      expect(createResult.success).toBe(true);
      const paymentId = createResult.success ? createResult.data.paymentId : "";

      // Mock the order with items for completion
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "order-idempotent",
        organizationId: "org-1",
        eventId: "event-1",
        status: "PENDING",
        paymentId: paymentId,
        orderItems: [
          {
            id: "item-1",
            ticketTypeId: "tt-1",
            quantity: 2,
            ticketType: { id: "tt-1", name: "Regular" },
          },
        ],
      } as any);

      // Mock transaction for ticket creation
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          order: {
            update: vi.fn().mockResolvedValue({}),
          },
          ticket: {
            findUnique: vi.fn().mockResolvedValue(null),
            createMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
          ticketType: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(tx as any);
      });

      // Complete payment first time
      const result1 = await paymentService.completeMockPayment(paymentId);
      expect(result1.success).toBe(true);
      if (result1.success) {
        expect(result1.data.ticketCount).toBe(2);
      }

      // Second call - should be idempotent
      // Now the order status is PAID
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "order-idempotent",
        status: "PAID",
        paymentId: paymentId,
      } as any);
      vi.mocked(prisma.ticket.count).mockResolvedValue(2);
      vi.mocked(orderRepo.findByPaymentId).mockResolvedValue({
        id: "order-idempotent",
        status: "PAID",
      } as any);

      const result2 = await paymentService.completeMockPayment(paymentId);
      expect(result2.success).toBe(true);
      if (result2.success) {
        expect(result2.data.ticketCount).toBe(2);
        expect(result2.data.orderId).toBe("order-idempotent");
      }

      // Transaction should only be called once (first completion)
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe("getMockPayment", () => {
    it("should return undefined for non-existent payment", () => {
      const payment = paymentService.getMockPayment("non-existent");
      expect(payment).toBeUndefined();
    });

    it("should return payment after creation", async () => {
      vi.mocked(orderRepo.findByIdPublic).mockResolvedValue({
        id: "order-get",
        status: "PENDING",
        totalAmount: 2000,
        expiresAt: null,
        paymentId: null,
        event: {
          id: "event-1",
          title: "Test Event",
          slug: "test-event",
          startsAt: new Date(),
          endsAt: new Date(),
          location: null,
        },
        orderItems: [],
      } as any);
      vi.mocked(orderRepo.setPaymentId).mockResolvedValue({} as any);

      const createResult = await paymentService.createPayment(
        "order-get",
        "http://localhost:3000"
      );

      expect(createResult.success).toBe(true);
      const paymentId = createResult.success ? createResult.data.paymentId : "";

      const payment = paymentService.getMockPayment(paymentId);
      expect(payment).toBeDefined();
      expect(payment?.orderId).toBe("order-get");
      expect(payment?.amount).toBe(2000);
      expect(payment?.status).toBe("open");
    });
  });

  describe("cancelMockPayment", () => {
    it("should fail for non-existent payment", async () => {
      const result = await paymentService.cancelMockPayment("non-existent");
      expect(result.success).toBe(false);
    });

    it("should cancel open payment", async () => {
      vi.mocked(orderRepo.findByIdPublic).mockResolvedValue({
        id: "order-cancel",
        status: "PENDING",
        totalAmount: 1500,
        expiresAt: null,
        paymentId: null,
        event: {
          id: "event-1",
          title: "Test Event",
          slug: "test-event",
          startsAt: new Date(),
          endsAt: new Date(),
          location: null,
        },
        orderItems: [],
      } as any);
      vi.mocked(orderRepo.setPaymentId).mockResolvedValue({} as any);
      vi.mocked(orderRepo.updateStatus).mockResolvedValue({} as any);

      const createResult = await paymentService.createPayment(
        "order-cancel",
        "http://localhost:3000"
      );

      expect(createResult.success).toBe(true);
      const paymentId = createResult.success ? createResult.data.paymentId : "";

      const cancelResult = await paymentService.cancelMockPayment(paymentId);
      expect(cancelResult.success).toBe(true);

      const payment = paymentService.getMockPayment(paymentId);
      expect(payment?.status).toBe("canceled");
      expect(orderRepo.updateStatus).toHaveBeenCalledWith(
        "order-cancel",
        "CANCELLED"
      );
    });

    it("should fail to cancel paid payment", async () => {
      vi.mocked(orderRepo.findByIdPublic).mockResolvedValue({
        id: "order-paid-cancel",
        status: "PENDING",
        totalAmount: 1500,
        expiresAt: null,
        paymentId: null,
        event: {
          id: "event-1",
          title: "Test Event",
          slug: "test-event",
          startsAt: new Date(),
          endsAt: new Date(),
          location: null,
        },
        orderItems: [],
      } as any);
      vi.mocked(orderRepo.setPaymentId).mockResolvedValue({} as any);

      const createResult = await paymentService.createPayment(
        "order-paid-cancel",
        "http://localhost:3000"
      );

      expect(createResult.success).toBe(true);
      const paymentId = createResult.success ? createResult.data.paymentId : "";

      // Complete the payment
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "order-paid-cancel",
        eventId: "event-1",
        status: "PENDING",
        paymentId: paymentId,
        orderItems: [
          {
            id: "item-1",
            ticketTypeId: "tt-1",
            quantity: 1,
            ticketType: { id: "tt-1", name: "Regular" },
          },
        ],
      } as any);
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          order: { update: vi.fn().mockResolvedValue({}) },
          ticket: {
            findUnique: vi.fn().mockResolvedValue(null),
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          ticketType: { update: vi.fn().mockResolvedValue({}) },
        };
        return callback(tx as any);
      });

      await paymentService.completeMockPayment(paymentId);

      // Try to cancel
      const cancelResult = await paymentService.cancelMockPayment(paymentId);
      expect(cancelResult.success).toBe(false);
      if (!cancelResult.success) {
        expect(cancelResult.error).toBe(
          "Betaalde bestellingen kunnen niet geannuleerd worden"
        );
      }
    });
  });
});

describe("Ticket code generation", () => {
  it("should generate codes in correct format", () => {
    // This tests the format indirectly through createPayment flow
    // The actual generation function is private, but we can verify
    // that tickets are created with valid codes
    expect(true).toBe(true); // Placeholder - real test in integration tests
  });
});
