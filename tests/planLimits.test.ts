import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Prisma client
vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    event: {
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    ticket: {
      count: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    usageRecord: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

// Mock the subscription repo
vi.mock("@/server/repos/subscriptionRepo", () => ({
  subscriptionRepo: {
    findByOrganizationId: vi.fn(),
    findCurrentUsageRecord: vi.fn(),
    incrementTicketsSold: vi.fn(),
    getOrCreateUsageRecord: vi.fn(),
  },
}));

import { prisma } from "@/server/lib/prisma";
import { subscriptionRepo } from "@/server/repos/subscriptionRepo";
import { planLimitsService } from "@/server/services/planLimitsService";
import { feeService } from "@/server/services/feeService";

const mockPrisma = prisma as unknown as {
  organization: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  event: {
    count: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  ticket: {
    count: ReturnType<typeof vi.fn>;
  };
};

const mockSubscriptionRepo = subscriptionRepo as unknown as {
  findByOrganizationId: ReturnType<typeof vi.fn>;
  findCurrentUsageRecord: ReturnType<typeof vi.fn>;
  incrementTicketsSold: ReturnType<typeof vi.fn>;
};

describe("Plan Limits Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("canCreateEvent", () => {
    it("should allow event creation for ORGANIZER plan (unlimited)", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: "org-1",
        currentPlan: "ORGANIZER",
      });
      mockPrisma.event.count.mockResolvedValue(5);

      const result = await planLimitsService.canCreateEvent("org-1");

      expect(result.allowed).toBe(true);
      expect(result.limit).toBeNull();
    });

    it("should allow event creation for NON_PROFIT with 0 active events", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: "org-1",
        currentPlan: "NON_PROFIT",
      });
      mockPrisma.event.count.mockResolvedValue(0);

      const result = await planLimitsService.canCreateEvent("org-1");

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(1);
      expect(result.currentActiveEvents).toBe(0);
    });

    it("should block event creation for NON_PROFIT with 1 active event", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: "org-1",
        currentPlan: "NON_PROFIT",
      });
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await planLimitsService.canCreateEvent("org-1");

      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(1);
      expect(result.currentActiveEvents).toBe(1);
      expect(result.reason).toContain("maximum");
    });

    it("should return error for organization without plan", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: "org-1",
        currentPlan: null,
      });

      const result = await planLimitsService.canCreateEvent("org-1");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("no plan");
    });
  });

  describe("canPublishEvent", () => {
    it("should allow publishing when all checks pass", async () => {
      mockPrisma.organization.findUnique
        .mockResolvedValueOnce({
          id: "org-1",
          currentPlan: "ORGANIZER",
          mollieOnboardingStatus: "COMPLETED",
          nonProfitStatus: "NOT_APPLICABLE",
          subscription: { status: "ACTIVE" },
        })
        .mockResolvedValueOnce({
          id: "org-1",
          currentPlan: "ORGANIZER",
        });
      mockPrisma.event.count.mockResolvedValue(0);

      const result = await planLimitsService.canPublishEvent("org-1");

      expect(result.allowed).toBe(true);
      expect(result.checklist.hasMollieOnboarding).toBe(true);
      expect(result.checklist.hasActiveSubscription).toBe(true);
      expect(result.checklist.hasVerifiedNonProfit).toBe(true);
      expect(result.checklist.withinEventLimit).toBe(true);
    });

    it("should block publishing without Mollie onboarding", async () => {
      mockPrisma.organization.findUnique
        .mockResolvedValueOnce({
          id: "org-1",
          currentPlan: "ORGANIZER",
          mollieOnboardingStatus: "PENDING",
          nonProfitStatus: "NOT_APPLICABLE",
          subscription: { status: "ACTIVE" },
        })
        .mockResolvedValueOnce({
          id: "org-1",
          currentPlan: "ORGANIZER",
        });
      mockPrisma.event.count.mockResolvedValue(0);

      const result = await planLimitsService.canPublishEvent("org-1");

      expect(result.allowed).toBe(false);
      expect(result.checklist.hasMollieOnboarding).toBe(false);
      expect(result.reason).toContain("Mollie");
    });

    it("should block publishing without active subscription", async () => {
      mockPrisma.organization.findUnique
        .mockResolvedValueOnce({
          id: "org-1",
          currentPlan: "ORGANIZER",
          mollieOnboardingStatus: "COMPLETED",
          nonProfitStatus: "NOT_APPLICABLE",
          subscription: null,
        })
        .mockResolvedValueOnce({
          id: "org-1",
          currentPlan: "ORGANIZER",
        });
      mockPrisma.event.count.mockResolvedValue(0);

      const result = await planLimitsService.canPublishEvent("org-1");

      expect(result.allowed).toBe(false);
      expect(result.checklist.hasActiveSubscription).toBe(false);
      expect(result.reason).toContain("abonnement");
    });

    it("should require KVK verification for NON_PROFIT plan", async () => {
      mockPrisma.organization.findUnique
        .mockResolvedValueOnce({
          id: "org-1",
          currentPlan: "NON_PROFIT",
          mollieOnboardingStatus: "COMPLETED",
          nonProfitStatus: "PENDING",
          subscription: { status: "ACTIVE" },
        })
        .mockResolvedValueOnce({
          id: "org-1",
          currentPlan: "NON_PROFIT",
        });
      mockPrisma.event.count.mockResolvedValue(0);

      const result = await planLimitsService.canPublishEvent("org-1");

      expect(result.allowed).toBe(false);
      expect(result.checklist.hasVerifiedNonProfit).toBe(false);
      expect(result.reason).toContain("KVK");
    });
  });

  describe("canSellTickets", () => {
    it("should allow ticket sales within limit", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: "org-1",
        currentPlan: "NON_PROFIT",
      });
      mockPrisma.ticket.count.mockResolvedValue(100);

      const result = await planLimitsService.canSellTickets("org-1", "event-1", 10);

      expect(result.allowed).toBe(true);
      expect(result.currentTicketsSold).toBe(100);
      expect(result.limit).toBe(500);
      expect(result.overageAllowed).toBe(false);
    });

    it("should block ticket sales exceeding NON_PROFIT limit (no overage)", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: "org-1",
        currentPlan: "NON_PROFIT",
      });
      mockPrisma.ticket.count.mockResolvedValue(495);

      const result = await planLimitsService.canSellTickets("org-1", "event-1", 10);

      expect(result.allowed).toBe(false);
      expect(result.overageAllowed).toBe(false);
      expect(result.reason).toContain("maximum");
    });

    it("should allow ticket sales with overage for PAY_PER_EVENT", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: "org-1",
        currentPlan: "PAY_PER_EVENT",
      });
      mockPrisma.ticket.count.mockResolvedValue(995);

      const result = await planLimitsService.canSellTickets("org-1", "event-1", 10);

      expect(result.allowed).toBe(true);
      expect(result.overageAllowed).toBe(true);
      expect(result.overageTickets).toBe(5); // 1005 - 1000 = 5 over limit
      expect(result.overageFee).toBe(50); // 5 tickets * 10 cents
    });

    it("should calculate overage correctly for monthly plan", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: "org-1",
        currentPlan: "ORGANIZER",
      });
      mockSubscriptionRepo.findCurrentUsageRecord.mockResolvedValue({
        ticketsSold: 2990,
        overageTickets: 0,
        overageFeeTotal: 0,
      });

      const result = await planLimitsService.canSellTickets("org-1", "event-1", 20);

      expect(result.allowed).toBe(true);
      expect(result.currentTicketsSold).toBe(2990);
      expect(result.limit).toBe(3000);
      expect(result.overageTickets).toBe(10); // 3010 - 3000 = 10 over
      expect(result.overageFee).toBe(80); // 10 tickets * 8 cents
    });
  });

  describe("canDowngradeTo", () => {
    it("should allow downgrade when usage is within limits", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: "org-1",
        currentPlan: "ORGANIZER",
      });
      mockPrisma.event.count.mockResolvedValue(1);
      mockSubscriptionRepo.findCurrentUsageRecord.mockResolvedValue({
        ticketsSold: 400,
        overageTickets: 0,
        overageFeeTotal: 0,
      });

      const result = await planLimitsService.canDowngradeTo("org-1", "NON_PROFIT");

      expect(result.allowed).toBe(true);
    });

    it("should block downgrade when active events exceed limit", async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: "org-1",
        currentPlan: "ORGANIZER",
      });
      mockPrisma.event.count.mockResolvedValue(3);
      mockSubscriptionRepo.findCurrentUsageRecord.mockResolvedValue({
        ticketsSold: 100,
        overageTickets: 0,
        overageFeeTotal: 0,
      });

      const result = await planLimitsService.canDowngradeTo("org-1", "NON_PROFIT");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("actieve evenementen");
    });
  });
});

describe("Fee Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPlatformFee", () => {
    it("should return default 2% for standard organization", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        platformFeeOverride: null,
        overageFeeOverride: null,
        feeOverrideReason: null,
        organization: {
          currentPlan: "ORGANIZER",
          subscription: { brandingRemoved: false },
        },
      });

      const result = await feeService.getPlatformFee("event-1");

      expect(result.platformFeeBps).toBe(200);
      expect(result.platformFeePercent).toBe(2);
      expect(result.brandingRemoved).toBe(false);
      expect(result.hasOverride).toBe(false);
    });

    it("should add +2% for branding removal", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        platformFeeOverride: null,
        overageFeeOverride: null,
        feeOverrideReason: null,
        organization: {
          currentPlan: "ORGANIZER",
          subscription: { brandingRemoved: true },
        },
      });

      const result = await feeService.getPlatformFee("event-1");

      expect(result.platformFeeBps).toBe(400); // 2% + 2%
      expect(result.platformFeePercent).toBe(4);
      expect(result.brandingRemoved).toBe(true);
    });

    it("should not add branding fee for PRO_ORGANIZER (whitelabel included)", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        platformFeeOverride: null,
        overageFeeOverride: null,
        feeOverrideReason: null,
        organization: {
          currentPlan: "PRO_ORGANIZER",
          subscription: { brandingRemoved: true },
        },
      });

      const result = await feeService.getPlatformFee("event-1");

      expect(result.platformFeeBps).toBe(200); // Still 2%, whitelabel is included
    });

    it("should use event-level override when set", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        platformFeeOverride: 100, // 1% override
        overageFeeOverride: 5,
        feeOverrideReason: "Partnership deal",
        organization: {
          currentPlan: "ORGANIZER",
          subscription: { brandingRemoved: false },
        },
      });

      const result = await feeService.getPlatformFee("event-1");

      expect(result.platformFeeBps).toBe(100);
      expect(result.platformFeePercent).toBe(1);
      expect(result.hasOverride).toBe(true);
      expect(result.overrideReason).toBe("Partnership deal");
      expect(result.overageFeeCents).toBe(5);
    });
  });

  describe("calculatePayoutFees", () => {
    it("should calculate payout breakdown correctly", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        platformFeeOverride: null,
        overageFeeOverride: null,
        feeOverrideReason: null,
        organization: {
          currentPlan: "ORGANIZER",
          subscription: { brandingRemoved: false },
        },
      });

      const result = await feeService.calculatePayoutFees("event-1", 100000, 50);

      expect(result.grossRevenue).toBe(100000); // €1000
      expect(result.platformFee).toBe(2000); // 2% of €1000 = €20
      expect(result.overageFee).toBe(400); // 50 tickets * 8 cents
      expect(result.totalFees).toBe(2400); // €24
      expect(result.netPayout).toBe(97600); // €976
    });

    it("should calculate with custom override", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        platformFeeOverride: 100, // 1%
        overageFeeOverride: 3, // 3 cents
        feeOverrideReason: "Charity event",
        organization: {
          currentPlan: "ORGANIZER",
          subscription: { brandingRemoved: false },
        },
      });

      const result = await feeService.calculatePayoutFees("event-1", 100000, 100);

      expect(result.platformFee).toBe(1000); // 1% of €1000 = €10
      expect(result.overageFee).toBe(300); // 100 tickets * 3 cents
      expect(result.netPayout).toBe(98700); // €987
    });
  });

  describe("setFeeOverride", () => {
    it("should set fee override with valid values", async () => {
      mockPrisma.event.update.mockResolvedValue({
        id: "event-1",
        platformFeeOverride: 150,
        overageFeeOverride: 6,
        feeOverrideReason: "Special partnership",
        feeOverrideSetBy: "admin-1",
        feeOverrideSetAt: new Date(),
      });

      const result = await feeService.setFeeOverride("event-1", "admin-1", {
        platformFeeBps: 150,
        overageFeeCents: 6,
        reason: "Special partnership",
      });

      expect(result.platformFeeOverride).toBe(150);
      expect(result.overageFeeOverride).toBe(6);
    });

    it("should reject platform fee above 10%", async () => {
      await expect(
        feeService.setFeeOverride("event-1", "admin-1", {
          platformFeeBps: 1500, // 15%
          reason: "Test reason",
        })
      ).rejects.toThrow("between 0% and 10%");
    });

    it("should reject overage fee above €1.00", async () => {
      await expect(
        feeService.setFeeOverride("event-1", "admin-1", {
          overageFeeCents: 150, // €1.50
          reason: "Test reason",
        })
      ).rejects.toThrow("between €0.00 and €1.00");
    });

    it("should require a reason", async () => {
      await expect(
        feeService.setFeeOverride("event-1", "admin-1", {
          platformFeeBps: 100,
          reason: "",
        })
      ).rejects.toThrow("reason is required");
    });

    it("should reject reason that is too short", async () => {
      await expect(
        feeService.setFeeOverride("event-1", "admin-1", {
          platformFeeBps: 100,
          reason: "Hi",
        })
      ).rejects.toThrow("reason is required");
    });
  });
});
