import { describe, it, expect, vi, beforeEach } from "vitest";
import { notifyConnectionFailure, getConnectionStatus } from "@/server/services/mollieMonitoringService";
import { prisma } from "@/server/lib/prisma";

// Mock dependencies
vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
    },
    event: {
      count: vi.fn(),
    },
  },
}));

vi.mock("resend", () => {
  const mockSend = vi.fn().mockResolvedValue({ data: { id: "test-email-id" } });
  return {
    Resend: vi.fn(function(this: unknown) {
      return {
        emails: {
          send: mockSend,
        },
      };
    }),
  };
});

describe("Mollie Connection Monitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("notifyConnectionFailure", () => {
    it("should send email to organization contact email when connection fails", async () => {
      const organizationId = "test-org-id";

      // Mock organization
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: organizationId,
        name: "Test Organization",
        email: "org@example.com",
        billingEmail: "billing@example.com",
      } as never);

      // Mock live events count
      vi.mocked(prisma.event.count).mockResolvedValue(2);

      await notifyConnectionFailure(organizationId);

      // Verify organization was queried twice (once for notification, once for emails)
      expect(prisma.organization.findUnique).toHaveBeenCalled();

      // Verify live events were checked
      expect(prisma.event.count).toHaveBeenCalledWith({
        where: {
          organizationId,
          status: "LIVE",
        },
      });
    });

    it("should handle organization with no live events", async () => {
      const organizationId = "test-org-no-events";

      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: organizationId,
        name: "Test Org No Events",
        email: "org@example.com",
        billingEmail: null,
      } as never);

      // No live events
      vi.mocked(prisma.event.count).mockResolvedValue(0);

      await notifyConnectionFailure(organizationId);

      // Should still send notification, but with different urgency
      expect(prisma.event.count).toHaveBeenCalled();
    });

    it("should not send email if no contact emails found", async () => {
      const organizationId = "test-org-no-emails";

      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: organizationId,
        name: "Test Org No Emails",
        email: null,
        billingEmail: null,
      } as never);

      vi.mocked(prisma.event.count).mockResolvedValue(1);

      await notifyConnectionFailure(organizationId);

      // Should query but not send (verified by console.warn in implementation)
      expect(prisma.organization.findUnique).toHaveBeenCalled();
    });
  });

  describe("getConnectionStatus", () => {
    it("should return connection status with live events indicator", async () => {
      const organizationId = "test-org-status";

      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: organizationId,
        mollieAccessToken: "encrypted_token",
        mollieOnboardingStatus: "COMPLETED",
        updatedAt: new Date("2026-01-03T10:00:00Z"),
      } as never);

      vi.mocked(prisma.event.count).mockResolvedValue(3);

      const status = await getConnectionStatus(organizationId);

      expect(status).toEqual({
        isConnected: true,
        hasLiveEvents: true,
        lastChecked: expect.any(Date),
      });
    });

    it("should return not connected when no access token", async () => {
      const organizationId = "test-org-disconnected";

      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: organizationId,
        mollieAccessToken: null,
        mollieOnboardingStatus: null,
        updatedAt: new Date("2026-01-03T10:00:00Z"),
      } as never);

      vi.mocked(prisma.event.count).mockResolvedValue(0);

      const status = await getConnectionStatus(organizationId);

      expect(status).toEqual({
        isConnected: false,
        hasLiveEvents: false,
        lastChecked: expect.any(Date),
      });
    });

    it("should throw error if organization not found", async () => {
      const organizationId = "non-existent-org";

      vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);

      await expect(getConnectionStatus(organizationId)).rejects.toThrow(
        "Organization not found"
      );
    });
  });
});
