import { prisma } from "@/server/lib/prisma";
import { subscriptionRepo } from "@/server/repos/subscriptionRepo";
import {
  getPlanLimits,
  isOverageAllowed,
  getPlanOverageFee,
} from "@/server/domain/plans";
import type { PricingPlan } from "@/generated/prisma";

export type CanCreateEventResult = {
  allowed: boolean;
  reason?: string;
  currentActiveEvents: number;
  limit: number | null;
};

export type CanSellTicketsResult = {
  allowed: boolean;
  reason?: string;
  currentTicketsSold: number;
  limit: number;
  overageAllowed: boolean;
  overageTickets: number;
  overageFee: number;
};

export type UsageSummary = {
  plan: PricingPlan;
  ticketsSold: number;
  ticketLimit: number;
  limitPeriod: "event" | "month";
  percentUsed: number;
  overageTickets: number;
  overageFee: number;
  activeEvents: number;
  activeEventLimit: number | null;
};

/**
 * Service for enforcing plan limits
 */
export const planLimitsService = {
  /**
   * Check if organization can create a new event
   * Note: This checks for ACTIVE events (LIVE status), not drafts
   */
  canCreateEvent: async (organizationId: string): Promise<CanCreateEventResult> => {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { currentPlan: true },
    });

    if (!org || !org.currentPlan) {
      return {
        allowed: false,
        reason: "Organization not found or has no plan",
        currentActiveEvents: 0,
        limit: null,
      };
    }

    const planLimits = getPlanLimits(org.currentPlan);

    // Unlimited events
    if (planLimits.activeEvents === null) {
      return {
        allowed: true,
        currentActiveEvents: 0,
        limit: null,
      };
    }

    // Count active (LIVE) events
    const activeEventCount = await prisma.event.count({
      where: {
        organizationId,
        status: "LIVE",
      },
    });

    const allowed = activeEventCount < planLimits.activeEvents;

    return {
      allowed,
      reason: allowed
        ? undefined
        : `Je hebt het maximum aantal actieve evenementen bereikt (${planLimits.activeEvents}). Upgrade je plan voor meer evenementen.`,
      currentActiveEvents: activeEventCount,
      limit: planLimits.activeEvents,
    };
  },

  /**
   * Check if organization can publish an event (DRAFT → LIVE)
   * This is the gating check for event publishing
   */
  canPublishEvent: async (
    organizationId: string
  ): Promise<{ allowed: boolean; reason?: string; checklist: PublishChecklist }> => {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        currentPlan: true,
        mollieOnboardingStatus: true,
        nonProfitStatus: true,
        subscription: {
          select: { status: true },
        },
      },
    });

    const checklist: PublishChecklist = {
      hasMollieOnboarding: false,
      hasActiveSubscription: false,
      hasVerifiedNonProfit: true, // Default to true unless on NON_PROFIT plan
      withinEventLimit: false,
    };

    if (!org) {
      return {
        allowed: false,
        reason: "Organization not found",
        checklist,
      };
    }

    // Check 1: Mollie onboarding completed
    checklist.hasMollieOnboarding = org.mollieOnboardingStatus === "COMPLETED";

    // Check 2: Has active subscription (all plans including NON_PROFIT need a subscription record)
    checklist.hasActiveSubscription =
      org.subscription?.status === "ACTIVE" || org.subscription?.status === "TRIALING";

    // Check 3: NON_PROFIT requires KVK verification
    if (org.currentPlan === "NON_PROFIT") {
      checklist.hasVerifiedNonProfit = org.nonProfitStatus === "VERIFIED";
    }

    // Check 4: Within active event limit
    const eventLimitCheck = await planLimitsService.canCreateEvent(organizationId);
    checklist.withinEventLimit = eventLimitCheck.allowed;

    const allowed =
      checklist.hasMollieOnboarding &&
      checklist.hasActiveSubscription &&
      checklist.hasVerifiedNonProfit &&
      checklist.withinEventLimit;

    let reason: string | undefined;
    if (!checklist.hasMollieOnboarding) {
      reason = "Verbind eerst je Mollie account om betalingen te kunnen ontvangen.";
    } else if (!checklist.hasActiveSubscription) {
      reason = "Kies een abonnement om je evenement te kunnen publiceren.";
    } else if (!checklist.hasVerifiedNonProfit) {
      reason = "Je KVK-nummer moet geverifieerd zijn voor het Non-profit plan.";
    } else if (!checklist.withinEventLimit) {
      reason = eventLimitCheck.reason;
    }

    return { allowed, reason, checklist };
  },

  /**
   * Check if organization can sell more tickets
   * Returns overage info if applicable
   */
  canSellTickets: async (
    organizationId: string,
    eventId: string,
    quantity: number
  ): Promise<CanSellTicketsResult> => {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { currentPlan: true },
    });

    if (!org || !org.currentPlan) {
      return {
        allowed: false,
        reason: "Organization not found or has no plan",
        currentTicketsSold: 0,
        limit: 0,
        overageAllowed: false,
        overageTickets: 0,
        overageFee: 0,
      };
    }

    const planLimits = getPlanLimits(org.currentPlan);
    const overageAllowed = isOverageAllowed(org.currentPlan);

    // Get current usage based on limit period
    let currentTicketsSold: number;

    if (planLimits.limitPeriod === "event") {
      // Count tickets sold for this specific event
      currentTicketsSold = await prisma.ticket.count({
        where: {
          eventId,
          order: {
            status: "PAID",
          },
        },
      });
    } else {
      // Count tickets sold this billing month
      const usageRecord = await subscriptionRepo.findCurrentUsageRecord(organizationId);
      currentTicketsSold = usageRecord?.ticketsSold ?? 0;
    }

    const newTotal = currentTicketsSold + quantity;
    const overLimit = newTotal > planLimits.ticketLimit;

    // Calculate overage
    let overageTickets = 0;
    let overageFee = 0;

    if (overLimit) {
      if (overageAllowed) {
        // Calculate how many tickets are over the limit
        overageTickets = Math.max(0, newTotal - planLimits.ticketLimit);
        // Only charge for newly added overage tickets
        const previousOverage = Math.max(0, currentTicketsSold - planLimits.ticketLimit);
        const newOverageTickets = overageTickets - previousOverage;
        overageFee = newOverageTickets * getPlanOverageFee(org.currentPlan);
      }
    }

    const allowed = !overLimit || overageAllowed;

    return {
      allowed,
      reason: allowed
        ? undefined
        : `Je hebt het maximum aantal tickets bereikt (${planLimits.ticketLimit}). Upgrade je plan voor meer tickets.`,
      currentTicketsSold,
      limit: planLimits.ticketLimit,
      overageAllowed,
      overageTickets,
      overageFee,
    };
  },

  /**
   * Record ticket sale in usage tracking
   */
  recordTicketSale: async (
    organizationId: string,
    eventId: string,
    quantity: number
  ): Promise<void> => {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { currentPlan: true },
    });

    if (!org?.currentPlan) return;

    const planLimits = getPlanLimits(org.currentPlan);

    // For per-event limits, we don't need separate usage tracking
    // The ticket count is already stored with the tickets themselves
    if (planLimits.limitPeriod === "event") return;

    // For monthly limits, use calendar month for tracking
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Calculate overage
    const usageRecord = await subscriptionRepo.getOrCreateUsageRecord(
      organizationId,
      periodStart,
      periodEnd
    );
    const currentSold = usageRecord.ticketsSold;
    const newTotal = currentSold + quantity;

    let overageTickets = 0;
    let overageFee = 0;

    if (newTotal > planLimits.ticketLimit && isOverageAllowed(org.currentPlan)) {
      const previousOverage = Math.max(0, currentSold - planLimits.ticketLimit);
      const newOverage = Math.max(0, newTotal - planLimits.ticketLimit);
      overageTickets = newOverage - previousOverage;
      overageFee = overageTickets * getPlanOverageFee(org.currentPlan);
    }

    await subscriptionRepo.incrementTicketsSold(
      organizationId,
      periodStart,
      periodEnd,
      quantity,
      overageTickets,
      overageFee
    );
  },

  /**
   * Get usage summary for an organization
   */
  getUsageSummary: async (organizationId: string): Promise<UsageSummary | null> => {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { currentPlan: true },
    });

    if (!org?.currentPlan) return null;

    const planLimits = getPlanLimits(org.currentPlan);

    // Count active events
    const activeEvents = await prisma.event.count({
      where: {
        organizationId,
        status: "LIVE",
      },
    });

    // Get ticket usage
    let ticketsSold = 0;
    let overageTickets = 0;
    let overageFee = 0;

    if (planLimits.limitPeriod === "month") {
      const usageRecord = await subscriptionRepo.findCurrentUsageRecord(organizationId);
      if (usageRecord) {
        ticketsSold = usageRecord.ticketsSold;
        overageTickets = usageRecord.overageTickets;
        overageFee = usageRecord.overageFeeTotal;
      }
    } else {
      // For per-event plans, we'd need to sum across active events
      // For now, just get total tickets sold for all active events
      ticketsSold = await prisma.ticket.count({
        where: {
          event: {
            organizationId,
            status: "LIVE",
          },
          order: {
            status: "PAID",
          },
        },
      });

      // Calculate overage if applicable
      if (ticketsSold > planLimits.ticketLimit && isOverageAllowed(org.currentPlan)) {
        overageTickets = ticketsSold - planLimits.ticketLimit;
        overageFee = overageTickets * getPlanOverageFee(org.currentPlan);
      }
    }

    const percentUsed = Math.min(100, (ticketsSold / planLimits.ticketLimit) * 100);

    return {
      plan: org.currentPlan,
      ticketsSold,
      ticketLimit: planLimits.ticketLimit,
      limitPeriod: planLimits.limitPeriod,
      percentUsed,
      overageTickets,
      overageFee,
      activeEvents,
      activeEventLimit: planLimits.activeEvents,
    };
  },

  /**
   * Check if organization can downgrade to a specific plan
   */
  canDowngradeTo: async (
    organizationId: string,
    targetPlan: PricingPlan
  ): Promise<{ allowed: boolean; reason?: string }> => {
    const targetLimits = getPlanLimits(targetPlan);
    const summary = await planLimitsService.getUsageSummary(organizationId);

    if (!summary) {
      return { allowed: false, reason: "Could not determine current usage" };
    }

    // Check active event limit
    if (targetLimits.activeEvents !== null && summary.activeEvents > targetLimits.activeEvents) {
      return {
        allowed: false,
        reason: `Je hebt ${summary.activeEvents} actieve evenementen, maar het ${targetPlan} plan staat maximaal ${targetLimits.activeEvents} toe. Beëindig eerst enkele evenementen.`,
      };
    }

    // For monthly plans downgrading, check ticket usage
    if (summary.limitPeriod === "month" && targetLimits.limitPeriod === "month") {
      if (summary.ticketsSold > targetLimits.ticketLimit && !isOverageAllowed(targetPlan)) {
        return {
          allowed: false,
          reason: `Je hebt deze maand ${summary.ticketsSold} tickets verkocht, maar het ${targetPlan} plan heeft een limiet van ${targetLimits.ticketLimit} tickets zonder overage mogelijkheid.`,
        };
      }
    }

    return { allowed: true };
  },
};

export type PublishChecklist = {
  hasMollieOnboarding: boolean;
  hasActiveSubscription: boolean;
  hasVerifiedNonProfit: boolean;
  withinEventLimit: boolean;
};
