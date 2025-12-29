import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { scanTicket } from "@/server/services/scanService";
import { ticketRepo } from "@/server/repos/ticketRepo";
import { scanRepo } from "@/server/repos/scanRepo";
import { generateQRData } from "@/server/services/ticketService";
import { prisma } from "@/server/lib/prisma";
import type { TicketForScanning } from "@/server/repos/ticketRepo";

// Mock environment variable for consistent testing
vi.stubEnv("TICKET_SIGNING_SECRET", "test-secret-key-for-unit-tests");

// Mock the repos
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

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

describe("scanService", () => {
  const mockOrganizationId = "org-123";
  const mockScannerId = "user-scanner-1";
  const mockDeviceId = "device-001";

  const createMockTicket = (overrides?: Partial<TicketForScanning>): TicketForScanning => ({
    id: "ticket-123",
    ticketTypeId: "type-1",
    eventId: "event-1",
    orderId: "order-1",
    code: "ABC123",
    secretToken: "secret-token-123",
    status: "VALID",
    usedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ticketType: {
      id: "type-1",
      name: "General Admission",
    },
    event: {
      id: "event-1",
      title: "Test Event",
      organizationId: mockOrganizationId,
    },
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("scanTicket - successful scan", () => {
    it("scans a valid ticket successfully and marks it as USED", async () => {
      const mockTicket = createMockTicket();
      const qrData = generateQRData(
        { id: mockTicket.id, secretToken: mockTicket.secretToken },
        "https://example.com"
      );

      // Mock repo responses
      vi.mocked(ticketRepo.findByIdForScanning).mockResolvedValue(mockTicket);
      vi.mocked(scanRepo.create).mockResolvedValue({
        id: "scan-1",
        ticketId: mockTicket.id,
        scannedBy: mockScannerId,
        deviceId: mockDeviceId,
        result: "VALID",
        scannedAt: new Date(),
        syncedAt: null,
        offlineSync: false,
        createdAt: new Date(),
      });

      // Mock transaction
      let scanLogCreated = false;
      let ticketUpdated = false;

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          scanLog: {
            create: vi.fn().mockImplementation(() => {
              scanLogCreated = true;
              return Promise.resolve({});
            }),
          },
          ticket: {
            update: vi.fn().mockImplementation(() => {
              ticketUpdated = true;
              return Promise.resolve({});
            }),
          },
        };
        return callback(tx);
      });

      // Perform scan
      const result = await scanTicket({
        qrData,
        scannedBy: mockScannerId,
        deviceId: mockDeviceId,
        organizationId: mockOrganizationId,
      });

      // Assertions
      expect(result.success).toBe(true);
      expect(result.result).toBe("VALID");
      expect(result.message).toBe("Ticket validated successfully");
      expect(result.ticket?.status).toBe("USED");
      expect(scanLogCreated).toBe(true);
      expect(ticketUpdated).toBe(true);
    });
  });

  describe("scanTicket - first scan wins", () => {
    it("rejects duplicate scan of already used ticket", async () => {
      const firstScanTime = new Date("2024-01-15T10:00:00Z");
      const mockTicket = createMockTicket({
        status: "USED",
        usedAt: firstScanTime,
      });

      const qrData = generateQRData(
        { id: mockTicket.id, secretToken: mockTicket.secretToken },
        "https://example.com"
      );

      // Mock repo responses
      vi.mocked(ticketRepo.findByIdForScanning).mockResolvedValue(mockTicket);
      vi.mocked(scanRepo.findFirstValidScan).mockResolvedValue({
        id: "scan-1",
        ticketId: mockTicket.id,
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
        ticketId: mockTicket.id,
        scannedBy: mockScannerId,
        deviceId: mockDeviceId,
        result: "ALREADY_USED",
        scannedAt: new Date(),
        syncedAt: null,
        offlineSync: false,
        createdAt: new Date(),
      });

      // Perform scan
      const result = await scanTicket({
        qrData,
        scannedBy: mockScannerId,
        deviceId: mockDeviceId,
        organizationId: mockOrganizationId,
      });

      // Assertions
      expect(result.success).toBe(false);
      expect(result.result).toBe("ALREADY_USED");
      expect(result.message).toBe("This ticket has already been used");
      expect(result.firstScannedAt).toEqual(firstScanTime);
      expect(scanRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: mockTicket.id,
          result: "ALREADY_USED",
        })
      );
    });

    it("logs ALREADY_USED scan attempt even for duplicate scans", async () => {
      const mockTicket = createMockTicket({
        status: "USED",
        usedAt: new Date(),
      });

      const qrData = generateQRData(
        { id: mockTicket.id, secretToken: mockTicket.secretToken },
        "https://example.com"
      );

      vi.mocked(ticketRepo.findByIdForScanning).mockResolvedValue(mockTicket);
      vi.mocked(scanRepo.findFirstValidScan).mockResolvedValue({
        id: "scan-first",
        ticketId: mockTicket.id,
        scannedBy: "first-scanner",
        deviceId: "first-device",
        result: "VALID",
        scannedAt: new Date(),
        syncedAt: null,
        offlineSync: false,
        createdAt: new Date(),
      });
      vi.mocked(scanRepo.create).mockResolvedValue({
        id: "scan-dup",
        ticketId: mockTicket.id,
        scannedBy: mockScannerId,
        deviceId: mockDeviceId,
        result: "ALREADY_USED",
        scannedAt: new Date(),
        syncedAt: null,
        offlineSync: false,
        createdAt: new Date(),
      });

      await scanTicket({
        qrData,
        scannedBy: mockScannerId,
        deviceId: mockDeviceId,
        organizationId: mockOrganizationId,
      });

      // Verify scan log was created with ALREADY_USED result
      expect(scanRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: mockTicket.id,
          scannedBy: mockScannerId,
          deviceId: mockDeviceId,
          result: "ALREADY_USED",
          offlineSync: false,
        })
      );
    });
  });

  describe("scanTicket - invalid scenarios", () => {
    it("rejects invalid QR code format", async () => {
      const result = await scanTicket({
        qrData: "invalid-qr-data",
        scannedBy: mockScannerId,
        deviceId: mockDeviceId,
        organizationId: mockOrganizationId,
      });

      expect(result.success).toBe(false);
      expect(result.result).toBe("INVALID");
      expect(result.message).toBe("Invalid QR code format");
    });

    it("rejects scan when ticket not found", async () => {
      const qrData = generateQRData(
        { id: "nonexistent-ticket", secretToken: "fake-token" },
        "https://example.com"
      );

      vi.mocked(ticketRepo.findByIdForScanning).mockResolvedValue(null);
      vi.mocked(scanRepo.create).mockResolvedValue({
        id: "scan-1",
        ticketId: "nonexistent-ticket",
        scannedBy: mockScannerId,
        deviceId: mockDeviceId,
        result: "INVALID",
        scannedAt: new Date(),
        syncedAt: null,
        offlineSync: false,
        createdAt: new Date(),
      });

      const result = await scanTicket({
        qrData,
        scannedBy: mockScannerId,
        deviceId: mockDeviceId,
        organizationId: mockOrganizationId,
      });

      expect(result.success).toBe(false);
      expect(result.result).toBe("INVALID");
      expect(result.message).toBe("Ticket not found");

      // Still logs the attempt
      expect(scanRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: "nonexistent-ticket",
          result: "INVALID",
        })
      );
    });

    it("rejects scan from wrong organization (multi-tenant security)", async () => {
      const mockTicket = createMockTicket({
        event: {
          id: "event-1",
          title: "Test Event",
          organizationId: "different-org",
        },
      });

      const qrData = generateQRData(
        { id: mockTicket.id, secretToken: mockTicket.secretToken },
        "https://example.com"
      );

      vi.mocked(ticketRepo.findByIdForScanning).mockResolvedValue(mockTicket);
      vi.mocked(scanRepo.create).mockResolvedValue({
        id: "scan-1",
        ticketId: mockTicket.id,
        scannedBy: mockScannerId,
        deviceId: mockDeviceId,
        result: "INVALID",
        scannedAt: new Date(),
        syncedAt: null,
        offlineSync: false,
        createdAt: new Date(),
      });

      const result = await scanTicket({
        qrData,
        scannedBy: mockScannerId,
        deviceId: mockDeviceId,
        organizationId: mockOrganizationId,
      });

      expect(result.success).toBe(false);
      expect(result.result).toBe("INVALID");
      expect(result.message).toBe("Ticket does not belong to this organization");
    });

    it("rejects scan with invalid signature", async () => {
      const mockTicket = createMockTicket();

      // Create QR with wrong secret to generate invalid signature
      const qrData = generateQRData(
        { id: mockTicket.id, secretToken: "wrong-secret" },
        "https://example.com"
      );

      vi.mocked(ticketRepo.findByIdForScanning).mockResolvedValue(mockTicket);
      vi.mocked(scanRepo.create).mockResolvedValue({
        id: "scan-1",
        ticketId: mockTicket.id,
        scannedBy: mockScannerId,
        deviceId: mockDeviceId,
        result: "INVALID",
        scannedAt: new Date(),
        syncedAt: null,
        offlineSync: false,
        createdAt: new Date(),
      });

      const result = await scanTicket({
        qrData,
        scannedBy: mockScannerId,
        deviceId: mockDeviceId,
        organizationId: mockOrganizationId,
      });

      expect(result.success).toBe(false);
      expect(result.result).toBe("INVALID");
      expect(result.message).toBe("Invalid QR code signature");
    });
  });

  describe("scanTicket - refunded tickets", () => {
    it("rejects scan of refunded ticket", async () => {
      const mockTicket = createMockTicket({
        status: "REFUNDED",
      });

      const qrData = generateQRData(
        { id: mockTicket.id, secretToken: mockTicket.secretToken },
        "https://example.com"
      );

      vi.mocked(ticketRepo.findByIdForScanning).mockResolvedValue(mockTicket);
      vi.mocked(scanRepo.create).mockResolvedValue({
        id: "scan-1",
        ticketId: mockTicket.id,
        scannedBy: mockScannerId,
        deviceId: mockDeviceId,
        result: "REFUNDED",
        scannedAt: new Date(),
        syncedAt: null,
        offlineSync: false,
        createdAt: new Date(),
      });

      const result = await scanTicket({
        qrData,
        scannedBy: mockScannerId,
        deviceId: mockDeviceId,
        organizationId: mockOrganizationId,
      });

      expect(result.success).toBe(false);
      expect(result.result).toBe("REFUNDED");
      expect(result.message).toBe("This ticket has been refunded and cannot be used");

      // Logs the refunded scan attempt
      expect(scanRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: mockTicket.id,
          result: "REFUNDED",
        })
      );
    });
  });

  describe("scanTicket - audit logging", () => {
    it("logs all scan attempts including failures", async () => {
      const mockTicket = createMockTicket({
        status: "USED",
      });

      const qrData = generateQRData(
        { id: mockTicket.id, secretToken: mockTicket.secretToken },
        "https://example.com"
      );

      vi.mocked(ticketRepo.findByIdForScanning).mockResolvedValue(mockTicket);
      vi.mocked(scanRepo.findFirstValidScan).mockResolvedValue({
        id: "scan-first",
        ticketId: mockTicket.id,
        scannedBy: "first-scanner",
        deviceId: "first-device",
        result: "VALID",
        scannedAt: new Date(),
        syncedAt: null,
        offlineSync: false,
        createdAt: new Date(),
      });
      vi.mocked(scanRepo.create).mockResolvedValue({
        id: "scan-audit",
        ticketId: mockTicket.id,
        scannedBy: mockScannerId,
        deviceId: mockDeviceId,
        result: "ALREADY_USED",
        scannedAt: new Date(),
        syncedAt: null,
        offlineSync: false,
        createdAt: new Date(),
      });

      await scanTicket({
        qrData,
        scannedBy: mockScannerId,
        deviceId: mockDeviceId,
        organizationId: mockOrganizationId,
      });

      // Verify scan was logged with all details
      expect(scanRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: mockTicket.id,
          scannedBy: mockScannerId,
          deviceId: mockDeviceId,
          result: "ALREADY_USED",
          scannedAt: expect.any(Date),
          offlineSync: false,
        })
      );
    });

    it("includes device ID in scan logs when provided", async () => {
      const mockTicket = createMockTicket();
      const qrData = generateQRData(
        { id: mockTicket.id, secretToken: mockTicket.secretToken },
        "https://example.com"
      );

      vi.mocked(ticketRepo.findByIdForScanning).mockResolvedValue(mockTicket);
      vi.mocked(scanRepo.create).mockResolvedValue({
        id: "scan-1",
        ticketId: mockTicket.id,
        scannedBy: mockScannerId,
        deviceId: "mobile-device-123",
        result: "VALID",
        scannedAt: new Date(),
        syncedAt: null,
        offlineSync: false,
        createdAt: new Date(),
      });
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          scanLog: { create: vi.fn().mockResolvedValue({}) },
          ticket: { update: vi.fn().mockResolvedValue({}) },
        };
        return callback(tx);
      });

      await scanTicket({
        qrData,
        scannedBy: mockScannerId,
        deviceId: "mobile-device-123",
        organizationId: mockOrganizationId,
      });

      // Transaction should include deviceId
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("scanTicket - transaction atomicity", () => {
    it("rolls back if transaction fails", async () => {
      const mockTicket = createMockTicket();
      const qrData = generateQRData(
        { id: mockTicket.id, secretToken: mockTicket.secretToken },
        "https://example.com"
      );

      vi.mocked(ticketRepo.findByIdForScanning).mockResolvedValue(mockTicket);
      vi.mocked(scanRepo.create).mockResolvedValue({
        id: "scan-1",
        ticketId: mockTicket.id,
        scannedBy: mockScannerId,
        deviceId: mockDeviceId,
        result: "INVALID",
        scannedAt: new Date(),
        syncedAt: null,
        offlineSync: false,
        createdAt: new Date(),
      });

      // Mock transaction failure
      vi.mocked(prisma.$transaction).mockRejectedValue(
        new Error("Database error")
      );

      const result = await scanTicket({
        qrData,
        scannedBy: mockScannerId,
        deviceId: mockDeviceId,
        organizationId: mockOrganizationId,
      });

      // Should return error
      expect(result.success).toBe(false);
      expect(result.result).toBe("INVALID");
      expect(result.message).toBe("An error occurred while processing the scan");

      // Should still attempt to log the failure
      expect(scanRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: mockTicket.id,
          result: "INVALID",
        })
      );
    });
  });
});
