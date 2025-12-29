import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getEventScanningStats,
  getRecentScans,
  searchTicketsByEmail,
} from "@/server/services/scanningStatsService";
import {
  overrideTicketStatus,
  getTicketForOverride,
} from "@/server/services/ticketOverrideService";
import { eventRepo } from "@/server/repos/eventRepo";
import { prisma } from "@/server/lib/prisma";

// Mock the dependencies
vi.mock("@/server/repos/eventRepo", () => ({
  eventRepo: {
    findById: vi.fn(),
    findByIdInOrg: vi.fn(),
  },
}));

vi.mock("@/server/repos/ticketRepo", () => ({
  ticketRepo: {
    findByIdForScanning: vi.fn(),
  },
}));

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    ticket: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    scanLog: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("scanningStatsService", () => {
  const mockOrganizationId = "org-123";
  const mockEventId = "event-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getEventScanningStats", () => {
    it("calculates scanning statistics correctly", async () => {
      const mockEvent = {
        id: mockEventId,
        organizationId: mockOrganizationId,
        title: "Test Event",
      };

      vi.mocked(eventRepo.findByIdInOrg).mockResolvedValue(mockEvent as never);
      vi.mocked(prisma.ticket.count).mockResolvedValue(100); // Total sold

      vi.mocked(prisma.ticket.groupBy).mockResolvedValue([
        { status: "VALID", _count: { status: 30 } },
        { status: "USED", _count: { status: 65 } },
        { status: "REFUNDED", _count: { status: 5 } },
      ] as never);

      vi.mocked(prisma.scanLog.count).mockResolvedValue(12); // Duplicates

      const stats = await getEventScanningStats(mockEventId, mockOrganizationId);

      expect(stats.eventId).toBe(mockEventId);
      expect(stats.eventTitle).toBe("Test Event");
      expect(stats.totalSold).toBe(100);
      expect(stats.totalScanned).toBe(65); // USED tickets
      expect(stats.totalDuplicates).toBe(12);
      expect(stats.scanPercentage).toBe(65); // 65/100 * 100
      expect(stats.byStatus).toEqual({
        valid: 30,
        used: 65,
        refunded: 5,
      });
    });

    it("handles zero tickets sold", async () => {
      const mockEvent = {
        id: mockEventId,
        organizationId: mockOrganizationId,
        title: "Empty Event",
      };

      vi.mocked(eventRepo.findByIdInOrg).mockResolvedValue(mockEvent as never);
      vi.mocked(prisma.ticket.count).mockResolvedValue(0);
      vi.mocked(prisma.ticket.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.scanLog.count).mockResolvedValue(0);

      const stats = await getEventScanningStats(mockEventId, mockOrganizationId);

      expect(stats.totalSold).toBe(0);
      expect(stats.totalScanned).toBe(0);
      expect(stats.scanPercentage).toBe(0);
    });

    it("throws error for non-existent event", async () => {
      vi.mocked(eventRepo.findByIdInOrg).mockResolvedValue(null);

      await expect(
        getEventScanningStats(mockEventId, mockOrganizationId)
      ).rejects.toThrow("Event not found or access denied");
    });
  });

  describe("getRecentScans", () => {
    it("returns recent scans with ticket info", async () => {
      const mockEvent = {
        id: mockEventId,
        organizationId: mockOrganizationId,
        title: "Test Event",
      };

      const mockScans = [
        {
          id: "scan-1",
          ticketId: "ticket-1",
          result: "VALID",
          scannedAt: new Date("2024-06-01T19:00:00Z"),
          scannedBy: "user-1",
          deviceId: "device-1",
          ticket: {
            code: "ABC123",
            ticketType: { name: "General Admission" },
            order: { buyerEmail: "buyer@example.com" },
          },
        },
        {
          id: "scan-2",
          ticketId: "ticket-2",
          result: "ALREADY_USED",
          scannedAt: new Date("2024-06-01T19:05:00Z"),
          scannedBy: "user-2",
          deviceId: null,
          ticket: {
            code: "DEF456",
            ticketType: { name: "VIP" },
            order: { buyerEmail: "vip@example.com" },
          },
        },
      ];

      vi.mocked(eventRepo.findByIdInOrg).mockResolvedValue(mockEvent as never);
      vi.mocked(prisma.scanLog.findMany).mockResolvedValue(mockScans as never);

      const scans = await getRecentScans(mockEventId, mockOrganizationId, 50);

      expect(scans).toHaveLength(2);
      expect(scans[0].ticketCode).toBe("ABC123");
      expect(scans[0].result).toBe("VALID");
      expect(scans[0].buyerEmail).toBe("buyer@example.com");
      expect(scans[1].ticketCode).toBe("DEF456");
      expect(scans[1].deviceId).toBeNull();
    });

    it("respects limit parameter", async () => {
      const mockEvent = {
        id: mockEventId,
        organizationId: mockOrganizationId,
        title: "Test Event",
      };

      vi.mocked(eventRepo.findByIdInOrg).mockResolvedValue(mockEvent as never);
      vi.mocked(prisma.scanLog.findMany).mockResolvedValue([]);

      await getRecentScans(mockEventId, mockOrganizationId, 10);

      expect(prisma.scanLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });
  });

  describe("searchTicketsByEmail", () => {
    it("searches tickets by email (case insensitive)", async () => {
      const mockTickets = [
        {
          id: "ticket-1",
          code: "ABC123",
          status: "VALID",
          ticketType: { name: "General Admission" },
          order: {
            orderNumber: "ORD-001",
            buyerEmail: "john@example.com",
            event: { title: "Test Event" },
          },
          scanLogs: [],
        },
        {
          id: "ticket-2",
          code: "DEF456",
          status: "USED",
          ticketType: { name: "VIP" },
          order: {
            orderNumber: "ORD-001",
            buyerEmail: "john@example.com",
            event: { title: "Test Event" },
          },
          scanLogs: [{ scannedAt: new Date("2024-06-01T19:00:00Z") }],
        },
      ];

      vi.mocked(prisma.ticket.findMany).mockResolvedValue(mockTickets as never);

      const results = await searchTicketsByEmail("john", mockOrganizationId);

      expect(results).toHaveLength(2);
      expect(results[0].buyerEmail).toBe("john@example.com");
      expect(results[0].scannedAt).toBeNull();
      expect(results[1].scannedAt).toEqual(new Date("2024-06-01T19:00:00Z"));

      // Verify case-insensitive search
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            order: expect.objectContaining({
              buyerEmail: expect.objectContaining({
                contains: "john",
                mode: "insensitive",
              }),
            }),
          }),
        })
      );
    });

    it("scopes search to organization", async () => {
      vi.mocked(prisma.ticket.findMany).mockResolvedValue([]);

      await searchTicketsByEmail("test@example.com", mockOrganizationId);

      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            order: expect.objectContaining({
              event: expect.objectContaining({
                organizationId: mockOrganizationId,
              }),
            }),
          }),
        })
      );
    });
  });
});

describe("ticketOverrideService", () => {
  const mockOrganizationId = "org-123";
  const mockUserId = "user-1";
  const mockTicketId = "ticket-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("overrideTicketStatus", () => {
    it("marks ticket as USED and creates audit log", async () => {
      const mockTicket = {
        id: mockTicketId,
        code: "ABC123",
        status: "VALID",
        event: {
          id: "event-1",
          organizationId: mockOrganizationId,
          title: "Test Event",
        },
      };

      const { ticketRepo } = await import("@/server/repos/ticketRepo");
      vi.mocked(ticketRepo.findByIdForScanning).mockResolvedValue(
        mockTicket as never
      );

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          ticket: {
            update: vi.fn().mockResolvedValue({
              id: mockTicketId,
              code: "ABC123",
              status: "USED",
            }),
          },
          scanLog: {
            create: vi.fn().mockResolvedValue({}),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({
              id: "audit-1",
            }),
          },
        };
        return callback(tx as never);
      });

      const result = await overrideTicketStatus({
        ticketId: mockTicketId,
        newStatus: "USED",
        reason: "Ticket lost, manually validated at door",
        adminUserId: mockUserId,
        organizationId: mockOrganizationId,
      });

      expect(result.success).toBe(true);
      expect(result.ticket.status).toBe("USED");
      expect(result.ticket.previousStatus).toBe("VALID");
      expect(result.auditLogId).toBe("audit-1");
    });

    it("resets ticket to VALID and creates audit log", async () => {
      const mockTicket = {
        id: mockTicketId,
        code: "ABC123",
        status: "USED",
        event: {
          id: "event-1",
          organizationId: mockOrganizationId,
          title: "Test Event",
        },
      };

      const { ticketRepo } = await import("@/server/repos/ticketRepo");
      vi.mocked(ticketRepo.findByIdForScanning).mockResolvedValue(
        mockTicket as never
      );

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          ticket: {
            update: vi.fn().mockResolvedValue({
              id: mockTicketId,
              code: "ABC123",
              status: "VALID",
            }),
          },
          scanLog: {
            create: vi.fn().mockResolvedValue({}),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({
              id: "audit-2",
            }),
          },
        };
        return callback(tx as never);
      });

      const result = await overrideTicketStatus({
        ticketId: mockTicketId,
        newStatus: "VALID",
        reason: "Accidentally scanned wrong ticket, reverting",
        adminUserId: mockUserId,
        organizationId: mockOrganizationId,
      });

      expect(result.success).toBe(true);
      expect(result.ticket.status).toBe("VALID");
      expect(result.ticket.previousStatus).toBe("USED");
    });

    it("prevents override of refunded tickets", async () => {
      const mockTicket = {
        id: mockTicketId,
        code: "ABC123",
        status: "REFUNDED",
        event: {
          id: "event-1",
          organizationId: mockOrganizationId,
          title: "Test Event",
        },
      };

      const { ticketRepo } = await import("@/server/repos/ticketRepo");
      vi.mocked(ticketRepo.findByIdForScanning).mockResolvedValue(
        mockTicket as never
      );

      await expect(
        overrideTicketStatus({
          ticketId: mockTicketId,
          newStatus: "VALID",
          reason: "Trying to reset refunded ticket",
          adminUserId: mockUserId,
          organizationId: mockOrganizationId,
        })
      ).rejects.toThrow("Gerestitueerde tickets kunnen niet worden aangepast");
    });

    it("prevents no-op status changes", async () => {
      const mockTicket = {
        id: mockTicketId,
        code: "ABC123",
        status: "USED",
        event: {
          id: "event-1",
          organizationId: mockOrganizationId,
          title: "Test Event",
        },
      };

      const { ticketRepo } = await import("@/server/repos/ticketRepo");
      vi.mocked(ticketRepo.findByIdForScanning).mockResolvedValue(
        mockTicket as never
      );

      await expect(
        overrideTicketStatus({
          ticketId: mockTicketId,
          newStatus: "USED",
          reason: "Trying to set same status",
          adminUserId: mockUserId,
          organizationId: mockOrganizationId,
        })
      ).rejects.toThrow("Ticket heeft al status USED");
    });

    it("enforces multi-tenant security", async () => {
      const mockTicket = {
        id: mockTicketId,
        code: "ABC123",
        status: "VALID",
        event: {
          id: "event-1",
          organizationId: "different-org",
          title: "Test Event",
        },
      };

      const { ticketRepo } = await import("@/server/repos/ticketRepo");
      vi.mocked(ticketRepo.findByIdForScanning).mockResolvedValue(
        mockTicket as never
      );

      await expect(
        overrideTicketStatus({
          ticketId: mockTicketId,
          newStatus: "USED",
          reason: "Cross-tenant attack attempt",
          adminUserId: mockUserId,
          organizationId: mockOrganizationId,
        })
      ).rejects.toThrow("Ticket behoort niet tot deze organisatie");
    });

    it("creates scan log with manual-override device ID", async () => {
      const mockTicket = {
        id: mockTicketId,
        code: "ABC123",
        status: "VALID",
        event: {
          id: "event-1",
          organizationId: mockOrganizationId,
          title: "Test Event",
        },
      };

      const { ticketRepo } = await import("@/server/repos/ticketRepo");
      vi.mocked(ticketRepo.findByIdForScanning).mockResolvedValue(
        mockTicket as never
      );

      let scanLogData: { data: { deviceId: string; scannedBy: string } } | undefined;
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          ticket: {
            update: vi.fn().mockResolvedValue({
              id: mockTicketId,
              code: "ABC123",
              status: "USED",
            }),
          },
          scanLog: {
            create: vi.fn((data: { data: { deviceId: string; scannedBy: string } }) => {
              scanLogData = data;
              return Promise.resolve({});
            }),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({ id: "audit-1" }),
          },
        };
        return callback(tx as never);
      });

      await overrideTicketStatus({
        ticketId: mockTicketId,
        newStatus: "USED",
        reason: "Manual override test",
        adminUserId: mockUserId,
        organizationId: mockOrganizationId,
      });

      expect(scanLogData?.data).toEqual(
        expect.objectContaining({
          deviceId: "manual-override",
          scannedBy: mockUserId,
          ticketId: mockTicketId,
        })
      );
    });
  });

  describe("getTicketForOverride", () => {
    it("returns ticket details with scan history", async () => {
      const mockTicket = {
        id: mockTicketId,
        code: "ABC123",
        status: "USED",
        usedAt: new Date("2024-06-01T19:00:00Z"),
        ticketType: { name: "General Admission" },
        event: { title: "Test Event" },
        order: { buyerEmail: "buyer@example.com" },
        scanLogs: [
          { scannedAt: new Date("2024-06-01T19:00:00Z") },
          { scannedAt: new Date("2024-06-01T19:05:00Z") },
        ],
      };

      vi.mocked(prisma.ticket.findFirst).mockResolvedValue(mockTicket as never);

      const ticket = await getTicketForOverride(mockTicketId, mockOrganizationId);

      expect(ticket).not.toBeNull();
      expect(ticket!.code).toBe("ABC123");
      expect(ticket!.scanCount).toBe(2);
      expect(ticket!.lastScanAt).toEqual(new Date("2024-06-01T19:00:00Z"));
    });

    it("returns null for non-existent ticket", async () => {
      vi.mocked(prisma.ticket.findFirst).mockResolvedValue(null);

      const ticket = await getTicketForOverride(mockTicketId, mockOrganizationId);

      expect(ticket).toBeNull();
    });
  });
});
