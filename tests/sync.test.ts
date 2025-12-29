import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prepareTicketDataset, processBatchScanLogs, type BatchScanLogInput } from "@/server/services/syncService";
import { eventRepo } from "@/server/repos/eventRepo";
import { ticketRepo } from "@/server/repos/ticketRepo";
import { scanRepo } from "@/server/repos/scanRepo";
import { scannerDeviceRepo } from "@/server/repos/scannerDeviceRepo";
import { prisma } from "@/server/lib/prisma";

// Mock the repos and prisma
vi.mock("@/server/repos/eventRepo", () => ({
  eventRepo: {
    findById: vi.fn(),
  },
}));

vi.mock("@/server/repos/ticketRepo", () => ({
  ticketRepo: {
    findByIdForScanning: vi.fn(),
  },
}));

vi.mock("@/server/repos/scanRepo", () => ({
  scanRepo: {
    create: vi.fn(),
    findFirstValidScan: vi.fn(),
  },
}));

vi.mock("@/server/repos/scannerDeviceRepo", () => ({
  scannerDeviceRepo: {
    upsert: vi.fn(),
  },
}));

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    ticket: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    scanLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("syncService", () => {
  const mockOrganizationId = "org-123";
  const mockUserId = "user-1";
  const mockDeviceId = "device-001";
  const mockEventId = "event-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("prepareTicketDataset", () => {
    it("prepares ticket dataset successfully", async () => {
      const mockEvent = {
        id: mockEventId,
        organizationId: mockOrganizationId,
        title: "Test Event",
        startsAt: new Date("2024-06-01T19:00:00Z"),
        endsAt: new Date("2024-06-01T23:00:00Z"),
        location: "Test Venue",
      };

      const mockTickets = [
        {
          id: "ticket-1",
          code: "ABC123",
          secretToken: "secret-1",
          status: "VALID",
          ticketType: {
            id: "type-1",
            name: "General Admission",
          },
        },
        {
          id: "ticket-2",
          code: "DEF456",
          secretToken: "secret-2",
          status: "VALID",
          ticketType: {
            id: "type-2",
            name: "VIP",
          },
        },
      ];

      vi.mocked(eventRepo.findById).mockResolvedValue(mockEvent as never);
      vi.mocked(prisma.ticket.findMany).mockResolvedValue(mockTickets as never);
      vi.mocked(scannerDeviceRepo.upsert).mockResolvedValue({
        id: "scanner-device-1",
        organizationId: mockOrganizationId,
        deviceId: mockDeviceId,
        name: null,
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const dataset = await prepareTicketDataset(
        mockEventId,
        mockOrganizationId,
        mockDeviceId,
        mockUserId
      );

      expect(dataset.event.id).toBe(mockEventId);
      expect(dataset.event.title).toBe("Test Event");
      expect(dataset.tickets).toHaveLength(2);
      expect(dataset.tickets[0].id).toBe("ticket-1");
      expect(dataset.tickets[0].code).toBe("ABC123");
      expect(dataset.tickets[1].id).toBe("ticket-2");
      expect(dataset.deviceId).toBe(mockDeviceId);
      expect(dataset.syncedAt).toBeInstanceOf(Date);

      // Verify device was registered
      expect(scannerDeviceRepo.upsert).toHaveBeenCalledWith({
        organizationId: mockOrganizationId,
        deviceId: mockDeviceId,
      });
    });

    it("throws error for non-existent event", async () => {
      vi.mocked(eventRepo.findById).mockResolvedValue(null);

      await expect(
        prepareTicketDataset(
          mockEventId,
          mockOrganizationId,
          mockDeviceId,
          mockUserId
        )
      ).rejects.toThrow("Event not found or access denied");
    });

    it("throws error for wrong organization", async () => {
      const mockEvent = {
        id: mockEventId,
        organizationId: "different-org",
        title: "Test Event",
        startsAt: new Date(),
        endsAt: new Date(),
        location: "Test Venue",
      };

      vi.mocked(eventRepo.findById).mockResolvedValue(mockEvent as never);

      await expect(
        prepareTicketDataset(
          mockEventId,
          mockOrganizationId,
          mockDeviceId,
          mockUserId
        )
      ).rejects.toThrow("Event not found or access denied");
    });
  });

  describe("processBatchScanLogs - successful scans", () => {
    it("processes valid scans successfully", async () => {
      const mockTicket = {
        id: "ticket-1",
        status: "VALID",
        event: {
          organizationId: mockOrganizationId,
        },
      };

      const logs: BatchScanLogInput[] = [
        {
          ticketId: "ticket-1",
          scannedAt: new Date("2024-06-01T19:30:00Z").toISOString(),
          result: "VALID",
          deviceId: mockDeviceId,
        },
      ];

      vi.mocked(ticketRepo.findByIdForScanning).mockResolvedValue(mockTicket as never);
      vi.mocked(scannerDeviceRepo.upsert).mockResolvedValue({
        id: "scanner-device-1",
        organizationId: mockOrganizationId,
        deviceId: mockDeviceId,
        name: null,
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock transaction
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          scanLog: {
            create: vi.fn().mockResolvedValue({}),
          },
          ticket: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const result = await processBatchScanLogs(
        logs,
        mockOrganizationId,
        mockUserId,
        mockDeviceId
      );

      expect(result.processed).toBe(1);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.conflicts).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("processBatchScanLogs - conflict resolution", () => {
    it("detects conflict when ticket already scanned earlier", async () => {
      const firstScanTime = new Date("2024-06-01T19:00:00Z");
      const laterScanTime = new Date("2024-06-01T19:30:00Z");

      const mockTicket = {
        id: "ticket-1",
        status: "USED",
        event: {
          organizationId: mockOrganizationId,
        },
      };

      const logs: BatchScanLogInput[] = [
        {
          ticketId: "ticket-1",
          scannedAt: laterScanTime.toISOString(),
          result: "VALID",
          deviceId: mockDeviceId,
        },
      ];

      vi.mocked(ticketRepo.findByIdForScanning).mockResolvedValue(mockTicket as never);
      vi.mocked(scanRepo.findFirstValidScan).mockResolvedValue({
        id: "scan-1",
        ticketId: "ticket-1",
        scannedBy: "other-user",
        deviceId: "other-device",
        result: "VALID",
        scannedAt: firstScanTime,
        syncedAt: null,
        offlineSync: false,
        createdAt: firstScanTime,
      });
      vi.mocked(scanRepo.create).mockResolvedValue({
        id: "scan-2",
        ticketId: "ticket-1",
        scannedBy: mockUserId,
        deviceId: mockDeviceId,
        result: "ALREADY_USED",
        scannedAt: laterScanTime,
        syncedAt: new Date(),
        offlineSync: true,
        createdAt: new Date(),
      });
      vi.mocked(scannerDeviceRepo.upsert).mockResolvedValue({
        id: "scanner-device-1",
        organizationId: mockOrganizationId,
        deviceId: mockDeviceId,
        name: null,
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await processBatchScanLogs(
        logs,
        mockOrganizationId,
        mockUserId,
        mockDeviceId
      );

      expect(result.processed).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.conflicts).toBe(1);
      expect(result.failed).toBe(0);
    });

    it("resolves conflict when offline scan was actually first", async () => {
      const offlineScanTime = new Date("2024-06-01T18:30:00Z");
      const onlineScanTime = new Date("2024-06-01T19:00:00Z");

      const mockTicket = {
        id: "ticket-1",
        status: "USED",
        event: {
          organizationId: mockOrganizationId,
        },
      };

      const logs: BatchScanLogInput[] = [
        {
          ticketId: "ticket-1",
          scannedAt: offlineScanTime.toISOString(),
          result: "VALID",
          deviceId: mockDeviceId,
        },
      ];

      vi.mocked(ticketRepo.findByIdForScanning).mockResolvedValue(mockTicket as never);
      vi.mocked(scanRepo.findFirstValidScan).mockResolvedValue({
        id: "scan-1",
        ticketId: "ticket-1",
        scannedBy: "other-user",
        deviceId: "other-device",
        result: "VALID",
        scannedAt: onlineScanTime, // Later than offline scan
        syncedAt: null,
        offlineSync: false,
        createdAt: onlineScanTime,
      });
      vi.mocked(scannerDeviceRepo.upsert).mockResolvedValue({
        id: "scanner-device-1",
        organizationId: mockOrganizationId,
        deviceId: mockDeviceId,
        name: null,
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock transaction to update ticket
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          scanLog: {
            create: vi.fn().mockResolvedValue({}),
          },
          ticket: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      const result = await processBatchScanLogs(
        logs,
        mockOrganizationId,
        mockUserId,
        mockDeviceId
      );

      expect(result.processed).toBe(1);
      expect(result.successful).toBe(1);
      expect(result.conflicts).toBe(1); // Still counted as conflict but resolved in offline scan's favor
      expect(result.failed).toBe(0);
    });
  });

  describe("processBatchScanLogs - error handling", () => {
    it("handles invalid timestamp", async () => {
      const logs: BatchScanLogInput[] = [
        {
          ticketId: "ticket-1",
          scannedAt: "invalid-date",
          result: "VALID",
          deviceId: mockDeviceId,
        },
      ];

      vi.mocked(scannerDeviceRepo.upsert).mockResolvedValue({
        id: "scanner-device-1",
        organizationId: mockOrganizationId,
        deviceId: mockDeviceId,
        name: null,
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await processBatchScanLogs(
        logs,
        mockOrganizationId,
        mockUserId,
        mockDeviceId
      );

      expect(result.processed).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe("Invalid scannedAt timestamp");
    });

    it("handles ticket not found", async () => {
      const logs: BatchScanLogInput[] = [
        {
          ticketId: "nonexistent",
          scannedAt: new Date().toISOString(),
          result: "VALID",
          deviceId: mockDeviceId,
        },
      ];

      vi.mocked(ticketRepo.findByIdForScanning).mockResolvedValue(null);
      vi.mocked(scanRepo.create).mockResolvedValue({
        id: "scan-1",
        ticketId: "nonexistent",
        scannedBy: mockUserId,
        deviceId: mockDeviceId,
        result: "INVALID",
        scannedAt: new Date(),
        syncedAt: new Date(),
        offlineSync: true,
        createdAt: new Date(),
      });
      vi.mocked(scannerDeviceRepo.upsert).mockResolvedValue({
        id: "scanner-device-1",
        organizationId: mockOrganizationId,
        deviceId: mockDeviceId,
        name: null,
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await processBatchScanLogs(
        logs,
        mockOrganizationId,
        mockUserId,
        mockDeviceId
      );

      expect(result.processed).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe("Ticket not found");

      // Still logs the attempt
      expect(scanRepo.create).toHaveBeenCalled();
    });

    it("handles wrong organization (multi-tenant security)", async () => {
      const mockTicket = {
        id: "ticket-1",
        status: "VALID",
        event: {
          organizationId: "different-org",
        },
      };

      const logs: BatchScanLogInput[] = [
        {
          ticketId: "ticket-1",
          scannedAt: new Date().toISOString(),
          result: "VALID",
          deviceId: mockDeviceId,
        },
      ];

      vi.mocked(ticketRepo.findByIdForScanning).mockResolvedValue(mockTicket as never);
      vi.mocked(scanRepo.create).mockResolvedValue({
        id: "scan-1",
        ticketId: "ticket-1",
        scannedBy: mockUserId,
        deviceId: mockDeviceId,
        result: "INVALID",
        scannedAt: new Date(),
        syncedAt: new Date(),
        offlineSync: true,
        createdAt: new Date(),
      });
      vi.mocked(scannerDeviceRepo.upsert).mockResolvedValue({
        id: "scanner-device-1",
        organizationId: mockOrganizationId,
        deviceId: mockDeviceId,
        name: null,
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await processBatchScanLogs(
        logs,
        mockOrganizationId,
        mockUserId,
        mockDeviceId
      );

      expect(result.processed).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toBe("Ticket does not belong to this organization");
    });

    it("handles refunded tickets", async () => {
      const mockTicket = {
        id: "ticket-1",
        status: "REFUNDED",
        event: {
          organizationId: mockOrganizationId,
        },
      };

      const logs: BatchScanLogInput[] = [
        {
          ticketId: "ticket-1",
          scannedAt: new Date().toISOString(),
          result: "VALID",
          deviceId: mockDeviceId,
        },
      ];

      vi.mocked(ticketRepo.findByIdForScanning).mockResolvedValue(mockTicket as never);
      vi.mocked(scanRepo.create).mockResolvedValue({
        id: "scan-1",
        ticketId: "ticket-1",
        scannedBy: mockUserId,
        deviceId: mockDeviceId,
        result: "REFUNDED",
        scannedAt: new Date(),
        syncedAt: new Date(),
        offlineSync: true,
        createdAt: new Date(),
      });
      vi.mocked(scannerDeviceRepo.upsert).mockResolvedValue({
        id: "scanner-device-1",
        organizationId: mockOrganizationId,
        deviceId: mockDeviceId,
        name: null,
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await processBatchScanLogs(
        logs,
        mockOrganizationId,
        mockUserId,
        mockDeviceId
      );

      expect(result.processed).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
    });
  });

  describe("processBatchScanLogs - batch processing", () => {
    it("processes multiple logs with mixed results", async () => {
      const mockTicket1 = {
        id: "ticket-1",
        status: "VALID",
        event: { organizationId: mockOrganizationId },
      };

      const mockTicket2 = {
        id: "ticket-2",
        status: "USED",
        event: { organizationId: mockOrganizationId },
      };

      const logs: BatchScanLogInput[] = [
        {
          ticketId: "ticket-1",
          scannedAt: new Date("2024-06-01T19:00:00Z").toISOString(),
          result: "VALID",
          deviceId: mockDeviceId,
        },
        {
          ticketId: "ticket-2",
          scannedAt: new Date("2024-06-01T19:01:00Z").toISOString(),
          result: "VALID",
          deviceId: mockDeviceId,
        },
        {
          ticketId: "nonexistent",
          scannedAt: new Date("2024-06-01T19:02:00Z").toISOString(),
          result: "VALID",
          deviceId: mockDeviceId,
        },
      ];

      vi.mocked(ticketRepo.findByIdForScanning)
        .mockResolvedValueOnce(mockTicket1 as never)
        .mockResolvedValueOnce(mockTicket2 as never)
        .mockResolvedValueOnce(null);

      vi.mocked(scanRepo.findFirstValidScan).mockResolvedValue({
        id: "scan-1",
        ticketId: "ticket-2",
        scannedBy: "other-user",
        deviceId: "other-device",
        result: "VALID",
        scannedAt: new Date("2024-06-01T18:00:00Z"),
        syncedAt: null,
        offlineSync: false,
        createdAt: new Date("2024-06-01T18:00:00Z"),
      });

      vi.mocked(scanRepo.create).mockResolvedValue({
        id: "scan-new",
        ticketId: "ticket-1",
        scannedBy: mockUserId,
        deviceId: mockDeviceId,
        result: "VALID",
        scannedAt: new Date(),
        syncedAt: new Date(),
        offlineSync: true,
        createdAt: new Date(),
      });

      vi.mocked(scannerDeviceRepo.upsert).mockResolvedValue({
        id: "scanner-device-1",
        organizationId: mockOrganizationId,
        deviceId: mockDeviceId,
        name: null,
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          scanLog: { create: vi.fn().mockResolvedValue({}) },
          ticket: { update: vi.fn().mockResolvedValue({}) },
        };
        return callback(tx);
      });

      const result = await processBatchScanLogs(
        logs,
        mockOrganizationId,
        mockUserId,
        mockDeviceId
      );

      expect(result.processed).toBe(3);
      expect(result.successful).toBe(1); // Only ticket-1 was valid
      expect(result.conflicts).toBe(1); // ticket-2 was already used
      expect(result.failed).toBe(1); // nonexistent ticket
      expect(result.errors).toHaveLength(1);
    });
  });
});
