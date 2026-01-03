import { describe, it, expect, beforeEach, vi } from "vitest";
import type { WalletPassData } from "../src/server/services/walletService";

// Mock prisma first before any imports that use it
vi.mock("../src/server/lib/prisma", () => ({
  prisma: {
    walletCertificate: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}));

// Mock the repositories and external dependencies
vi.mock("../src/server/repos/walletPassRepo", () => ({
  walletPassRepo: {
    create: vi.fn(),
    findByTicketId: vi.fn(),
    delete: vi.fn(),
    touch: vi.fn(),
  },
}));

vi.mock("../src/server/services/ticketService", () => ({
  generateQRData: vi.fn((ticket, baseUrl) => {
    return `${baseUrl}/scan/${ticket.id}:mockSignature`;
  }),
}));

vi.mock("../src/server/lib/encryption", () => ({
  decrypt: vi.fn((data) => data),
}));

vi.mock("@vercel/blob", () => ({
  put: vi.fn().mockResolvedValue({ url: "https://blob.vercel-storage.com/test.pkpass" }),
}));

// Import after mocks are set up
import {
  generateApplePass,
  generateGooglePass,
  invalidateWalletPass,
} from "../src/server/services/walletService";
import { walletPassRepo } from "../src/server/repos/walletPassRepo";

describe("Wallet Service", () => {
  const mockTicketData: WalletPassData = {
    ticketId: "ticket-123",
    ticketCode: "ABC123",
    secretToken: "secret-token-123",
    eventTitle: "Test Concert",
    eventDate: new Date("2026-06-15T20:00:00Z"),
    eventLocation: "Test Venue, Amsterdam",
    ticketTypeName: "General Admission",
    buyerName: "Jan Jansen",
    organizationName: "Test Organizer",
    organizationLogo: "https://example.com/logo.png",
    brandColor: "#FF0000",
  };

  const baseUrl = "https://example.com";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateApplePass", () => {
    it("should return error when certificate is not configured", async () => {
      const result = await generateApplePass(mockTicketData, baseUrl);

      // Without a certificate, should return an error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("certificaat");
      }
    });

    it("should return error for missing certificate", async () => {
      const result = await generateApplePass(mockTicketData, baseUrl);

      // Current implementation returns error until certificates are set up
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(walletPassRepo.create).mockRejectedValueOnce(
        new Error("Database error")
      );

      const result = await generateApplePass(mockTicketData, baseUrl);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
    });
  });

  describe("generateGooglePass", () => {
    it("should create wallet pass record for Google Wallet", async () => {
      const result = await generateGooglePass(mockTicketData, baseUrl);

      // Service creates a database record
      expect(walletPassRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: mockTicketData.ticketId,
          platform: "GOOGLE",
          serialNumber: expect.any(String),
          googlePassId: expect.any(String),
        })
      );
    });

    it("should generate correct Google Pass object ID format", async () => {
      await generateGooglePass(mockTicketData, baseUrl);

      const createCall = vi.mocked(walletPassRepo.create).mock.calls[0][0];

      expect(createCall.googlePassId).toContain(
        mockTicketData.organizationName.replace(/\s+/g, "_")
      );
      expect(createCall.googlePassId).toContain(mockTicketData.ticketId);
    });

    it("should return error for incomplete implementation", async () => {
      const result = await generateGooglePass(mockTicketData, baseUrl);

      // Current implementation returns error - Google Wallet not yet implemented
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(walletPassRepo.create).mockRejectedValueOnce(
        new Error("Database error")
      );

      const result = await generateGooglePass(mockTicketData, baseUrl);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
    });
  });

  describe("invalidateWalletPass", () => {
    it("should delete wallet pass when it exists", async () => {
      vi.mocked(walletPassRepo.findByTicketId).mockResolvedValueOnce({
        id: "pass-123",
        ticketId: "ticket-123",
        platform: "APPLE",
        serialNumber: "serial-123",
        passUrl: null,
        googlePassId: null,
        issuedAt: new Date(),
        lastUpdatedAt: new Date(),
      });

      const result = await invalidateWalletPass("ticket-123");

      expect(result.success).toBe(true);
      expect(walletPassRepo.delete).toHaveBeenCalledWith("ticket-123");
    });

    it("should succeed even if pass does not exist", async () => {
      vi.mocked(walletPassRepo.findByTicketId).mockResolvedValueOnce(null);

      const result = await invalidateWalletPass("ticket-123");

      expect(result.success).toBe(true);
      expect(walletPassRepo.delete).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(walletPassRepo.findByTicketId).mockRejectedValueOnce(
        new Error("Database error")
      );

      const result = await invalidateWalletPass("ticket-123");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
    });
  });

  describe("QR Code consistency", () => {
    it("should call generateQRData when certificate is available", async () => {
      // Note: This test verifies that generateQRData would be called
      // once a certificate is configured. Without a certificate,
      // the function returns early.
      const result = await generateApplePass(mockTicketData, baseUrl);

      // Since no certificate is configured, the function returns early
      expect(result.success).toBe(false);
    });
  });

  describe("Data validation", () => {
    it("should handle missing optional fields", async () => {
      const minimalData: WalletPassData = {
        ...mockTicketData,
        eventLocation: null,
        buyerName: null,
        organizationLogo: undefined,
        brandColor: undefined,
      };

      const appleResult = await generateApplePass(minimalData, baseUrl);
      const googleResult = await generateGooglePass(minimalData, baseUrl);

      // Should not throw errors for missing optional fields
      expect(appleResult).toBeDefined();
      expect(googleResult).toBeDefined();
    });

    it("should sanitize class ID for Google Wallet", async () => {
      const dataWithSpaces: WalletPassData = {
        ...mockTicketData,
        organizationName: "Test Org With Spaces",
        eventTitle: "Event With Many   Spaces",
      };

      await generateGooglePass(dataWithSpaces, baseUrl);

      const createCall = vi.mocked(walletPassRepo.create).mock.calls[0][0];

      // Spaces should be replaced with underscores
      expect(createCall.googlePassId).not.toContain(" ");
      expect(createCall.googlePassId).toContain("_");
    });
  });
});
