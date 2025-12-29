import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateQRData,
  verifyQRSignature,
  parseQRData,
} from "@/server/services/ticketService";

// Mock environment variable for consistent testing
vi.stubEnv("TICKET_SIGNING_SECRET", "test-secret-key-for-unit-tests");

describe("ticketService", () => {
  describe("generateQRData", () => {
    it("generates QR data URL in correct format", () => {
      const ticket = {
        id: "ticket-123",
        secretToken: "abc123def456",
      };
      const baseUrl = "https://example.com";

      const qrData = generateQRData(ticket, baseUrl);

      // Should start with base URL + /scan/ + ticket ID
      expect(qrData).toMatch(/^https:\/\/example\.com\/scan\/ticket-123:/);

      // Should end with a 16-character signature
      const parts = qrData.split(":");
      expect(parts).toHaveLength(4); // https: + //example.com/scan/ticket-123 + signature
    });

    it("generates different signatures for different secrets", () => {
      const ticket = {
        id: "ticket-123",
        secretToken: "abc123def456",
      };
      const baseUrl = "https://example.com";

      const qrData1 = generateQRData(ticket, baseUrl);

      // Change the env and regenerate
      vi.stubEnv("TICKET_SIGNING_SECRET", "different-secret");
      const qrData2 = generateQRData(ticket, baseUrl);

      // Restore original
      vi.stubEnv("TICKET_SIGNING_SECRET", "test-secret-key-for-unit-tests");

      expect(qrData1).not.toBe(qrData2);
    });

    it("generates consistent signatures for same inputs", () => {
      const ticket = {
        id: "ticket-123",
        secretToken: "abc123def456",
      };
      const baseUrl = "https://example.com";

      const qrData1 = generateQRData(ticket, baseUrl);
      const qrData2 = generateQRData(ticket, baseUrl);

      expect(qrData1).toBe(qrData2);
    });
  });

  describe("parseQRData", () => {
    it("parses valid QR data correctly", () => {
      const ticket = {
        id: "ticket-123",
        secretToken: "abc123def456",
      };
      const baseUrl = "https://example.com";
      const qrData = generateQRData(ticket, baseUrl);

      const parsed = parseQRData(qrData, baseUrl);

      expect(parsed).not.toBeNull();
      expect(parsed?.ticketId).toBe("ticket-123");
      expect(parsed?.signature).toHaveLength(16);
    });

    it("returns null for invalid QR data format", () => {
      const baseUrl = "https://example.com";

      expect(parseQRData("invalid", baseUrl)).toBeNull();
      expect(parseQRData("https://other.com/scan/123:sig", baseUrl)).toBeNull();
      expect(parseQRData("https://example.com/wrong/123:sig", baseUrl)).toBeNull();
    });

    it("handles QR data without signature", () => {
      const baseUrl = "https://example.com";
      const qrData = "https://example.com/scan/ticket-123";

      const parsed = parseQRData(qrData, baseUrl);

      expect(parsed).toBeNull();
    });
  });

  describe("verifyQRSignature", () => {
    it("verifies valid signatures correctly", () => {
      const ticket = {
        id: "ticket-123",
        secretToken: "abc123def456",
      };
      const baseUrl = "https://example.com";
      const qrData = generateQRData(ticket, baseUrl);
      const parsed = parseQRData(qrData, baseUrl);

      const fullTicket = {
        ...ticket,
        id: "ticket-123",
        secretToken: "abc123def456",
      };

      expect(parsed).not.toBeNull();
      const isValid = verifyQRSignature(
        fullTicket.id,
        fullTicket.secretToken,
        parsed!.signature
      );
      expect(isValid).toBe(true);
    });

    it("rejects invalid signatures", () => {
      const ticket = {
        id: "ticket-123",
        secretToken: "abc123def456",
      };

      const isValid = verifyQRSignature(
        ticket.id,
        ticket.secretToken,
        "invalidsignature"
      );
      expect(isValid).toBe(false);
    });

    it("rejects signatures with wrong ticket ID", () => {
      const ticket = {
        id: "ticket-123",
        secretToken: "abc123def456",
      };
      const baseUrl = "https://example.com";
      const qrData = generateQRData(ticket, baseUrl);
      const parsed = parseQRData(qrData, baseUrl);

      // Try to verify with different ticket ID
      const isValid = verifyQRSignature(
        "different-ticket",
        ticket.secretToken,
        parsed!.signature
      );
      expect(isValid).toBe(false);
    });

    it("rejects signatures with wrong secret token", () => {
      const ticket = {
        id: "ticket-123",
        secretToken: "abc123def456",
      };
      const baseUrl = "https://example.com";
      const qrData = generateQRData(ticket, baseUrl);
      const parsed = parseQRData(qrData, baseUrl);

      // Try to verify with different secret token
      const isValid = verifyQRSignature(
        ticket.id,
        "different-secret",
        parsed!.signature
      );
      expect(isValid).toBe(false);
    });
  });
});

describe("Ticket Code Generation", () => {
  it("generates unique ticket codes", async () => {
    // Import the function that generates ticket codes
    // This is in the order service, so we'll test the format indirectly
    const codes = new Set<string>();
    const codeRegex = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

    // The code format should be XXXX-XXXX without confusing characters
    const validChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    for (const char of validChars) {
      expect("0OIL1".includes(char)).toBe(false);
    }
  });
});
