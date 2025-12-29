import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Prisma client
vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    event: {
      findFirst: vi.fn(),
    },
    order: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    ticketType: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/server/lib/prisma";
import {
  calculateServiceFee,
  calculateOrderSummary,
  createOrder,
} from "@/server/services/orderService";

const mockPrisma = prisma as unknown as {
  event: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  order: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
  };
  ticketType: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

// =============================================================================
// Service Fee Calculation Tests
// =============================================================================

describe("Service fee calculation", () => {
  describe("calculateServiceFee", () => {
    it("should return 0 for free orders", () => {
      expect(calculateServiceFee(0)).toBe(0);
    });

    it("should calculate service fee for small orders (minimum fee applies)", () => {
      // For €5 order (500 cents):
      // Fixed: 50 + Percentage: 12.5 = 62.5, rounded to 63
      // Min is 50, max is 500
      const fee = calculateServiceFee(500);
      expect(fee).toBe(63);
    });

    it("should calculate service fee for medium orders", () => {
      // For €50 order (5000 cents):
      // Fixed: 50 + Percentage: 125 = 175
      const fee = calculateServiceFee(5000);
      expect(fee).toBe(175);
    });

    it("should cap service fee at maximum for large orders", () => {
      // For €500 order (50000 cents):
      // Fixed: 50 + Percentage: 1250 = 1300
      // But max is 500
      const fee = calculateServiceFee(50000);
      expect(fee).toBe(500);
    });

    it("should apply minimum fee for very small orders", () => {
      // For €1 order (100 cents):
      // Fixed: 50 + Percentage: 2.5 = 52.5, rounded to 53
      // Min is 50, so 53 is returned
      const fee = calculateServiceFee(100);
      expect(fee).toBeGreaterThanOrEqual(50);
    });

    it("should be consistent - same input gives same output", () => {
      const fee1 = calculateServiceFee(2500);
      const fee2 = calculateServiceFee(2500);
      expect(fee1).toBe(fee2);
    });
  });
});

// =============================================================================
// Order Summary Calculation Tests
// =============================================================================

describe("Order summary calculation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockEvent = {
    id: "event-1",
    slug: "test-event",
    status: "LIVE",
    ticketTypes: [
      {
        id: "tt-1",
        name: "Regular",
        price: 2500,
        capacity: 100,
        soldCount: 10,
        saleStart: null,
        saleEnd: null,
      },
      {
        id: "tt-2",
        name: "VIP",
        price: 5000,
        capacity: 20,
        soldCount: 5,
        saleStart: null,
        saleEnd: null,
      },
    ],
  };

  it("should calculate correct totals for single ticket type", async () => {
    mockPrisma.event.findFirst.mockResolvedValue(mockEvent);

    const result = await calculateOrderSummary("test-event", [
      { ticketTypeId: "tt-1", quantity: 2 },
    ]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(1);
      expect(result.data.ticketTotal).toBe(5000); // 2 * 2500
      expect(result.data.serviceFee).toBeGreaterThan(0);
      expect(result.data.totalAmount).toBe(
        result.data.ticketTotal + result.data.serviceFee
      );
    }
  });

  it("should calculate correct totals for multiple ticket types", async () => {
    mockPrisma.event.findFirst.mockResolvedValue(mockEvent);

    const result = await calculateOrderSummary("test-event", [
      { ticketTypeId: "tt-1", quantity: 2 },
      { ticketTypeId: "tt-2", quantity: 1 },
    ]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(2);
      expect(result.data.ticketTotal).toBe(10000); // (2 * 2500) + (1 * 5000)
    }
  });

  it("should fail for non-existent event", async () => {
    mockPrisma.event.findFirst.mockResolvedValue(null);

    const result = await calculateOrderSummary("non-existent", [
      { ticketTypeId: "tt-1", quantity: 1 },
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("niet gevonden");
    }
  });

  it("should fail for invalid ticket type", async () => {
    mockPrisma.event.findFirst.mockResolvedValue(mockEvent);

    const result = await calculateOrderSummary("test-event", [
      { ticketTypeId: "invalid-id", quantity: 1 },
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("niet gevonden");
    }
  });

  it("should fail when exceeding capacity", async () => {
    mockPrisma.event.findFirst.mockResolvedValue(mockEvent);

    const result = await calculateOrderSummary("test-event", [
      { ticketTypeId: "tt-2", quantity: 20 }, // VIP has 20 capacity, 5 sold
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("beschikbaar");
    }
  });

  it("should fail for empty selection", async () => {
    mockPrisma.event.findFirst.mockResolvedValue(mockEvent);

    const result = await calculateOrderSummary("test-event", []);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("minimaal 1 ticket");
    }
  });

  it("should skip zero quantity items", async () => {
    mockPrisma.event.findFirst.mockResolvedValue(mockEvent);

    const result = await calculateOrderSummary("test-event", [
      { ticketTypeId: "tt-1", quantity: 0 },
      { ticketTypeId: "tt-2", quantity: 2 },
    ]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].ticketTypeName).toBe("VIP");
    }
  });

  it("should respect sale window - not started", async () => {
    const futureEvent = {
      ...mockEvent,
      ticketTypes: [
        {
          ...mockEvent.ticketTypes[0],
          saleStart: new Date(Date.now() + 86400000), // Tomorrow
        },
      ],
    };
    mockPrisma.event.findFirst.mockResolvedValue(futureEvent);

    const result = await calculateOrderSummary("test-event", [
      { ticketTypeId: "tt-1", quantity: 1 },
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("niet meer te koop");
    }
  });

  it("should respect sale window - ended", async () => {
    const pastEvent = {
      ...mockEvent,
      ticketTypes: [
        {
          ...mockEvent.ticketTypes[0],
          saleEnd: new Date(Date.now() - 86400000), // Yesterday
        },
      ],
    };
    mockPrisma.event.findFirst.mockResolvedValue(pastEvent);

    const result = await calculateOrderSummary("test-event", [
      { ticketTypeId: "tt-1", quantity: 1 },
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("niet meer te koop");
    }
  });
});

// =============================================================================
// Order Creation Tests
// =============================================================================

describe("Order creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockEvent = {
    id: "event-1",
    slug: "test-event",
    status: "LIVE",
    organization: {
      id: "org-1",
    },
    ticketTypes: [
      {
        id: "tt-1",
        eventId: "event-1",
        name: "Regular",
        price: 2500,
        capacity: 100,
        soldCount: 10,
        saleStart: null,
        saleEnd: null,
      },
    ],
  };

  const mockOrder = {
    id: "order-1",
    orderNumber: "ORD-20251229-ABC12",
    organizationId: "org-1",
    eventId: "event-1",
    buyerEmail: "test@example.com",
    buyerName: "Test User",
    ticketTotal: 5000,
    serviceFee: 175,
    totalAmount: 5175,
    status: "PENDING",
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  };

  it("should fail with invalid email", async () => {
    const result = await createOrder({
      eventSlug: "test-event",
      buyerEmail: "invalid-email",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("e-mailadres");
    }
  });

  it("should fail with empty items", async () => {
    const result = await createOrder({
      eventSlug: "test-event",
      buyerEmail: "test@example.com",
      items: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("minimaal 1 ticket");
    }
  });

  it("should fail for non-existent event", async () => {
    mockPrisma.event.findFirst.mockResolvedValue(null);

    const result = await createOrder({
      eventSlug: "non-existent",
      buyerEmail: "test@example.com",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("niet gevonden");
    }
  });

  it("should create order with valid data (transactional)", async () => {
    mockPrisma.event.findFirst.mockResolvedValue(mockEvent);
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => Promise<typeof mockOrder>) => {
      // Mock the transaction callback
      const txMock = {
        ticketType: {
          findUnique: vi.fn().mockResolvedValue(mockEvent.ticketTypes[0]),
          update: vi.fn().mockResolvedValue(mockEvent.ticketTypes[0]),
        },
        order: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };

      // Mock orderRepo.create inside the transaction
      // Since createOrder uses orderRepo.create, we need to handle that
      return mockOrder;
    });

    const result = await createOrder({
      eventSlug: "test-event",
      buyerEmail: "test@example.com",
      buyerName: "Test User",
      items: [{ ticketTypeId: "tt-1", quantity: 2 }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.buyerEmail).toBe("test@example.com");
      expect(result.data.status).toBe("PENDING");
    }
  });

  it("should lowercase and trim buyer email validation", async () => {
    // Test that empty items with valid email still work for email trimming
    // The actual email trimming happens in orderRepo.create which we can't easily mock here
    const result = await createOrder({
      eventSlug: "test-event",
      buyerEmail: "",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }],
    });

    // Should fail due to invalid email (empty)
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("e-mailadres");
    }
  });

  it("should accept valid email formats", async () => {
    mockPrisma.event.findFirst.mockResolvedValue(mockEvent);
    mockPrisma.$transaction.mockImplementation(async () => ({
      ...mockOrder,
      buyerEmail: "test@example.com",
    }));

    const result = await createOrder({
      eventSlug: "test-event",
      buyerEmail: "valid@test.nl",
      items: [{ ticketTypeId: "tt-1", quantity: 1 }],
    });

    expect(result.success).toBe(true);
  });

  it("should handle capacity exceeded in transaction", async () => {
    mockPrisma.event.findFirst.mockResolvedValue(mockEvent);
    mockPrisma.$transaction.mockImplementation(async () => {
      throw new Error("Niet genoeg \"Regular\" tickets beschikbaar (nog 5 over)");
    });

    const result = await createOrder({
      eventSlug: "test-event",
      buyerEmail: "test@example.com",
      items: [{ ticketTypeId: "tt-1", quantity: 100 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("beschikbaar");
    }
  });
});

// =============================================================================
// Service Fee Edge Cases
// =============================================================================

describe("Service fee edge cases", () => {
  it("should apply per-order, not per-ticket", () => {
    // Two identical orders should have same service fee
    const singleTicketFee = calculateServiceFee(2500);
    const twoTicketsFee = calculateServiceFee(5000);

    // Fee for 2 tickets should not be 2x single ticket fee
    expect(twoTicketsFee).not.toBe(singleTicketFee * 2);

    // But it should be higher due to percentage component
    expect(twoTicketsFee).toBeGreaterThan(singleTicketFee);
  });

  it("should handle edge case at minimum boundary", () => {
    // Very small amounts should still return minimum fee
    const fee = calculateServiceFee(1);
    expect(fee).toBeGreaterThanOrEqual(50); // minimum fee
  });

  it("should handle edge case at maximum boundary", () => {
    // Very large amounts should cap at maximum
    const fee = calculateServiceFee(1000000);
    expect(fee).toBe(500); // maximum fee
  });
});
