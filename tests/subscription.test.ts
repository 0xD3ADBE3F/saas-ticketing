import { describe, it, expect } from "vitest";
import {
  getPlanLimits,
  isOverageAllowed,
  getPlanOverageFee,
  isMonthlyPlan,
  isPayPerEventPlan,
  getPlanDisplayName,
  getPlanPriceDescription,
  PLAN_LIMITS,
  DEFAULT_PLATFORM_FEE_BPS,
  BRANDING_REMOVAL_FEE_BPS,
} from "@/server/domain/plans";

describe("Plan Configuration", () => {
  describe("getPlanLimits", () => {
    it("should return correct limits for NON_PROFIT plan", () => {
      const limits = getPlanLimits("NON_PROFIT");
      expect(limits.activeEvents).toBe(1);
      expect(limits.ticketLimit).toBe(500);
      expect(limits.limitPeriod).toBe("event");
      expect(limits.overageFee).toBeNull();
      expect(limits.monthlyPrice).toBe(0);
      expect(limits.whitelabelIncluded).toBe(false);
    });

    it("should return correct limits for PAY_PER_EVENT plan", () => {
      const limits = getPlanLimits("PAY_PER_EVENT");
      expect(limits.activeEvents).toBe(1);
      expect(limits.ticketLimit).toBe(1000);
      expect(limits.limitPeriod).toBe("event");
      expect(limits.overageFee).toBe(10); // €0.10
      expect(limits.eventPrice).toBe(4900); // €49
    });

    it("should return correct limits for ORGANIZER plan", () => {
      const limits = getPlanLimits("ORGANIZER");
      expect(limits.activeEvents).toBeNull(); // Unlimited
      expect(limits.ticketLimit).toBe(3000);
      expect(limits.limitPeriod).toBe("month");
      expect(limits.overageFee).toBe(8); // €0.08
      expect(limits.monthlyPrice).toBe(4900); // €49/month
    });

    it("should return correct limits for PRO_ORGANIZER plan", () => {
      const limits = getPlanLimits("PRO_ORGANIZER");
      expect(limits.activeEvents).toBeNull(); // Unlimited
      expect(limits.ticketLimit).toBe(10000);
      expect(limits.limitPeriod).toBe("month");
      expect(limits.overageFee).toBe(5); // €0.05
      expect(limits.monthlyPrice).toBe(9900); // €99/month
      expect(limits.whitelabelIncluded).toBe(true);
    });
  });

  describe("isOverageAllowed", () => {
    it("should return false for NON_PROFIT (hard limit)", () => {
      expect(isOverageAllowed("NON_PROFIT")).toBe(false);
    });

    it("should return true for PAY_PER_EVENT", () => {
      expect(isOverageAllowed("PAY_PER_EVENT")).toBe(true);
    });

    it("should return true for ORGANIZER", () => {
      expect(isOverageAllowed("ORGANIZER")).toBe(true);
    });

    it("should return true for PRO_ORGANIZER", () => {
      expect(isOverageAllowed("PRO_ORGANIZER")).toBe(true);
    });
  });

  describe("getPlanOverageFee", () => {
    it("should return 0 for NON_PROFIT (no overage)", () => {
      expect(getPlanOverageFee("NON_PROFIT")).toBe(0);
    });

    it("should return 10 cents for PAY_PER_EVENT", () => {
      expect(getPlanOverageFee("PAY_PER_EVENT")).toBe(10);
    });

    it("should return 8 cents for ORGANIZER", () => {
      expect(getPlanOverageFee("ORGANIZER")).toBe(8);
    });

    it("should return 5 cents for PRO_ORGANIZER", () => {
      expect(getPlanOverageFee("PRO_ORGANIZER")).toBe(5);
    });
  });

  describe("isMonthlyPlan", () => {
    it("should return false for NON_PROFIT (free)", () => {
      expect(isMonthlyPlan("NON_PROFIT")).toBe(false);
    });

    it("should return false for PAY_PER_EVENT (one-time)", () => {
      expect(isMonthlyPlan("PAY_PER_EVENT")).toBe(false);
    });

    it("should return true for ORGANIZER", () => {
      expect(isMonthlyPlan("ORGANIZER")).toBe(true);
    });

    it("should return true for PRO_ORGANIZER", () => {
      expect(isMonthlyPlan("PRO_ORGANIZER")).toBe(true);
    });
  });

  describe("isPayPerEventPlan", () => {
    it("should return true only for PAY_PER_EVENT", () => {
      expect(isPayPerEventPlan("NON_PROFIT")).toBe(false);
      expect(isPayPerEventPlan("PAY_PER_EVENT")).toBe(true);
      expect(isPayPerEventPlan("ORGANIZER")).toBe(false);
      expect(isPayPerEventPlan("PRO_ORGANIZER")).toBe(false);
    });
  });

  describe("getPlanDisplayName", () => {
    it("should return Dutch display names", () => {
      expect(getPlanDisplayName("NON_PROFIT")).toBe("Non-profit & Stichtingen");
      expect(getPlanDisplayName("PAY_PER_EVENT")).toBe("Pay-Per-Event");
      expect(getPlanDisplayName("ORGANIZER")).toBe("Organizer");
      expect(getPlanDisplayName("PRO_ORGANIZER")).toBe("Pro Organizer");
    });
  });

  describe("getPlanPriceDescription", () => {
    it("should return Gratis for NON_PROFIT", () => {
      expect(getPlanPriceDescription("NON_PROFIT")).toBe("Gratis");
    });

    it("should return per-event price for PAY_PER_EVENT", () => {
      expect(getPlanPriceDescription("PAY_PER_EVENT")).toBe("€49/evenement");
    });

    it("should return monthly price for ORGANIZER", () => {
      expect(getPlanPriceDescription("ORGANIZER")).toBe("€49/maand");
    });

    it("should return monthly price for PRO_ORGANIZER", () => {
      expect(getPlanPriceDescription("PRO_ORGANIZER")).toBe("€99/maand");
    });
  });

  describe("Fee constants", () => {
    it("should have correct default platform fee (2%)", () => {
      expect(DEFAULT_PLATFORM_FEE_BPS).toBe(200);
    });

    it("should have correct branding removal fee (+2%)", () => {
      expect(BRANDING_REMOVAL_FEE_BPS).toBe(200);
    });
  });
});

describe("Plan Limits Validation", () => {
  it("should ensure all plans have required fields", () => {
    const plans: Array<keyof typeof PLAN_LIMITS> = [
      "NON_PROFIT",
      "PAY_PER_EVENT",
      "ORGANIZER",
      "PRO_ORGANIZER",
    ];

    for (const plan of plans) {
      const limits = PLAN_LIMITS[plan];
      expect(typeof limits.ticketLimit).toBe("number");
      expect(["event", "month"]).toContain(limits.limitPeriod);
      expect(typeof limits.brandingRemovalAllowed).toBe("boolean");
      expect(typeof limits.whitelabelIncluded).toBe("boolean");
    }
  });

  it("should ensure PRO_ORGANIZER has highest limits", () => {
    const proLimits = getPlanLimits("PRO_ORGANIZER");
    const organizerLimits = getPlanLimits("ORGANIZER");
    const payPerEventLimits = getPlanLimits("PAY_PER_EVENT");
    const nonProfitLimits = getPlanLimits("NON_PROFIT");

    expect(proLimits.ticketLimit).toBeGreaterThan(organizerLimits.ticketLimit);
    expect(organizerLimits.ticketLimit).toBeGreaterThan(payPerEventLimits.ticketLimit);
    expect(payPerEventLimits.ticketLimit).toBeGreaterThan(nonProfitLimits.ticketLimit);
  });

  it("should ensure overage fees decrease with higher plans", () => {
    const proOverage = getPlanOverageFee("PRO_ORGANIZER");
    const organizerOverage = getPlanOverageFee("ORGANIZER");
    const payPerEventOverage = getPlanOverageFee("PAY_PER_EVENT");

    expect(proOverage).toBeLessThan(organizerOverage);
    expect(organizerOverage).toBeLessThan(payPerEventOverage);
  });
});
