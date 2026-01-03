import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatPrice, centsToEuros, eurosToCents } from "@/lib/currency";

// Mock the Prisma client
vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    event: {
      findFirst: vi.fn(),
    },
    ticketType: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

import { prisma } from "@/server/lib/prisma";
import {
  createTicketType,
  updateTicketType,
  deleteTicketType,
  getEventTicketStats,
  canPurchase,
} from "@/server/services/ticketTypeService";

const mockPrisma = prisma as unknown as {
  event: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  ticketType: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

describe("Currency utilities", () => {
  describe("formatPrice", () => {
    it("should format 0 cents as €0,00", () => {
      // Note: Intl.NumberFormat uses non-breaking space (U+00A0)
      expect(formatPrice(0)).toBe("€\u00A00,00");
    });

    it("should format 1000 cents as €10,00", () => {
      expect(formatPrice(1000)).toBe("€\u00A010,00");
    });

    it("should format 2550 cents as €25,50", () => {
      expect(formatPrice(2550)).toBe("€\u00A025,50");
    });

    it("should format 99 cents as €0,99", () => {
      expect(formatPrice(99)).toBe("€\u00A00,99");
    });

    it("should handle large amounts", () => {
      expect(formatPrice(1000000)).toBe("€\u00A010.000,00");
    });
  });

  describe("centsToEuros", () => {
    it("should convert 0 cents to 0 euros", () => {
      expect(centsToEuros(0)).toBe(0);
    });

    it("should convert 100 cents to 1 euro", () => {
      expect(centsToEuros(100)).toBe(1);
    });

    it("should convert 250 cents to 2.50 euros", () => {
      expect(centsToEuros(250)).toBe(2.5);
    });

    it("should convert 99 cents to 0.99 euros", () => {
      expect(centsToEuros(99)).toBe(0.99);
    });
  });

  describe("eurosToCents", () => {
    it("should convert 0 euros to 0 cents", () => {
      expect(eurosToCents(0)).toBe(0);
    });

    it("should convert 1 euro to 100 cents", () => {
      expect(eurosToCents(1)).toBe(100);
    });

    it("should convert 2.50 euros to 250 cents", () => {
      expect(eurosToCents(2.5)).toBe(250);
    });

    it("should convert 0.99 euros to 99 cents", () => {
      expect(eurosToCents(0.99)).toBe(99);
    });

    it("should round floating point errors correctly", () => {
      // 19.99 * 100 = 1998.9999999999998 in JS
      expect(eurosToCents(19.99)).toBe(1999);
    });
  });
});

describe("Ticket type service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock event access for all tests
    mockPrisma.event.findFirst.mockResolvedValue({
      id: "event-1",
      organizationId: "org-1",
      isPaid: true,
      vatRate: "VAT_21" as const,
    });
  });

  describe("Validation rules", () => {
    it("should require name to be at least 1 character", async () => {
      const result = await createTicketType("event-1", "user-1", {
        name: "",
        description: "Test description",
        price: 10,
        capacity: 100,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Naam");
    });

    it("should reject negative prices", async () => {
      const result = await createTicketType("event-1", "user-1", {
        name: "Test Ticket",
        description: "Test description",
        price: -5,
        capacity: 100,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("negatief");
    });

    it("should reject zero capacity", async () => {
      const result = await createTicketType("event-1", "user-1", {
        name: "Test Ticket",
        description: "Test description",
        price: 10,
        capacity: 0,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("minimaal 1");
    });

    it("should reject invalid sale window (end before start)", async () => {
      const result = await createTicketType("event-1", "user-1", {
        name: "Test Ticket",
        description: "Test description",
        price: 10,
        capacity: 100,
        saleStart: new Date("2025-12-31"),
        saleEnd: new Date("2025-01-01"),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("startdatum");
    });
  });

  describe("Capacity rules", () => {
    it("should not allow capacity below sold count when updating", async () => {
      // Mock finding an existing ticket type with sold tickets
      mockPrisma.ticketType.findFirst.mockResolvedValue({
        id: "tt-1",
        eventId: "event-1",
        name: "Test",
        description: "Test description",
        price: 1000,
        capacity: 100,
        soldCount: 50, // 50 already sold
      });

      const result = await updateTicketType("tt-1", "user-1", {
        capacity: 25, // Try to reduce below 50
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("50");
    });
  });

  describe("Delete rules", () => {
    it("should not allow deletion if tickets are sold", async () => {
      // Mock finding an existing ticket type with sold tickets
      mockPrisma.ticketType.findFirst.mockResolvedValue({
        id: "tt-1",
        eventId: "event-1",
        name: "Test",
        description: "Test description",
        price: 1000,
        capacity: 100,
        soldCount: 10, // 10 sold
      });

      const result = await deleteTicketType("tt-1", "user-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("10");
      expect(result.error).toContain("verwijderd");
    });
  });

  describe("Purchase availability", () => {
    it("should reject purchase when not on sale", async () => {
      // Mock the getAvailability response via findUnique
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        capacity: 100,
        soldCount: 50,
        saleStart: new Date("2099-01-01"), // Not started yet
        saleEnd: new Date("2099-12-31"),
        event: {
          status: "LIVE",
        },
      });

      const result = await canPurchase("tt-1", 2);

      expect(result.success).toBe(false);
      expect(result.error).toContain("niet te koop");
    });

    it("should reject purchase when sold out", async () => {
      const now = new Date();
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        capacity: 100,
        soldCount: 100, // All sold
        saleStart: new Date(now.getTime() - 86400000), // Yesterday
        saleEnd: new Date(now.getTime() + 86400000), // Tomorrow
        event: {
          status: "LIVE",
        },
      });

      const result = await canPurchase("tt-1", 1);

      expect(result.success).toBe(false);
      expect(result.error).toContain("uitverkocht");
    });

    it("should reject when quantity exceeds available", async () => {
      const now = new Date();
      mockPrisma.ticketType.findUnique.mockResolvedValue({
        id: "tt-1",
        capacity: 100,
        soldCount: 95, // Only 5 left
        saleStart: new Date(now.getTime() - 86400000),
        saleEnd: new Date(now.getTime() + 86400000),
        event: {
          status: "LIVE",
        },
      });

      const result = await canPurchase("tt-1", 10);

      expect(result.success).toBe(false);
      expect(result.error).toContain("5");
    });
  });

  describe("Event ticket stats", () => {
    it("should calculate totals correctly", async () => {
      // Mock access check for event
      mockPrisma.event.findFirst.mockResolvedValue({
        id: "event-1",
        title: "Test Event",
        organizationId: "org-1",
      });

      // Mock ticket types for the event
      mockPrisma.ticketType.findMany.mockResolvedValue([
        { id: "tt-1", price: 2000, capacity: 100, soldCount: 50 }, // €20 x 50 = €1000
        { id: "tt-2", price: 1500, capacity: 50, soldCount: 25 },  // €15 x 25 = €375
        { id: "tt-3", price: 0, capacity: 200, soldCount: 100 },   // Free x 100 = €0
      ]);

      const stats = await getEventTicketStats("event-1", "user-1");

      expect(stats.totalCapacity).toBe(350); // 100 + 50 + 200
      expect(stats.totalSold).toBe(175); // 50 + 25 + 100
      expect(stats.totalRevenue).toBe(137500); // (2000*50) + (1500*25) + (0*100) = 100000 + 37500 + 0
      expect(stats.ticketTypes).toBe(3);
    });
  });
});
