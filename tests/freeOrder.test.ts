import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Prisma client
vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    ticket: {
      count: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    orderItem: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock the payment service
vi.mock("@/server/services/paymentService", () => ({
  generateAndSendTickets: vi.fn(),
}));

import { prisma } from "@/server/lib/prisma";
import { completeFreeOrder } from "@/server/services/orderService";
import { generateAndSendTickets } from "@/server/services/paymentService";

const mockPrisma = prisma as unknown as {
  order: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  ticket: {
    count: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  orderItem: {
    findMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

describe("completeFreeOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should complete a free order successfully", async () => {
    const mockOrder = {
      id: "order-1",
      totalAmount: 0,
      status: "PENDING",
      organizationId: "org-1",
      eventId: "event-1",
    };

    mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);
    mockPrisma.order.update.mockResolvedValue({
      ...mockOrder,
      status: "PAID",
      paidAt: new Date(),
      paymentMethod: "free",
    } as any);

    vi.mocked(generateAndSendTickets).mockResolvedValue({
      success: true,
      data: { ticketCount: 2 },
    } as any);

    const result = await completeFreeOrder("order-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ticketCount).toBe(2);
    }

    // Verify order was updated
    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: {
        status: "PAID",
        paidAt: expect.any(Date),
        paymentMethod: "free",
        paymentId: null,
      },
    });

    // Verify tickets were generated
    expect(generateAndSendTickets).toHaveBeenCalledWith("order-1");
  });

  it("should fail if order not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);

    const result = await completeFreeOrder("non-existent");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Bestelling niet gevonden");
    }
  });

  it("should fail if order is not free (totalAmount > 0)", async () => {
    const mockOrder = {
      id: "order-1",
      totalAmount: 1000, // €10.00 - not free!
      status: "PENDING",
    };

    mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);

    const result = await completeFreeOrder("order-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Deze functie is alleen voor gratis bestellingen");
    }

    // Should not attempt to update
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
  });

  it("should be idempotent - return success if already paid", async () => {
    const mockOrder = {
      id: "order-1",
      totalAmount: 0,
      status: "PAID", // Already paid!
    };

    mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);
    mockPrisma.ticket.count.mockResolvedValue(2);

    const result = await completeFreeOrder("order-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ticketCount).toBe(2);
    }

    // Should not attempt to update again
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
    expect(generateAndSendTickets).not.toHaveBeenCalled();
  });

  it("should fail if order has invalid status (not PENDING or PAID)", async () => {
    const mockOrder = {
      id: "order-1",
      totalAmount: 0,
      status: "CANCELLED",
    };

    mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);

    const result = await completeFreeOrder("order-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("status CANCELLED");
    }

    // Should not attempt to update
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
  });

  it("should handle ticket generation failure", async () => {
    const mockOrder = {
      id: "order-1",
      totalAmount: 0,
      status: "PENDING",
    };

    mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);
    mockPrisma.order.update.mockResolvedValue({
      ...mockOrder,
      status: "PAID",
    } as any);

    vi.mocked(generateAndSendTickets).mockResolvedValue({
      success: false,
      error: "Failed to send email",
    } as any);

    const result = await completeFreeOrder("order-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to send email");
    }

    // Order should still be updated to PAID
    expect(mockPrisma.order.update).toHaveBeenCalled();
  });
});
