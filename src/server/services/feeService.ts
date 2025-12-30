import { prisma } from "@/server/lib/prisma";
import {
  DEFAULT_PLATFORM_FEE_BPS,
  BRANDING_REMOVAL_FEE_BPS,
  getPlanOverageFee,
  getPlanLimits,
} from "@/server/domain/plans";
import type { Event, PricingPlan } from "@/generated/prisma";

export type FeeCalculation = {
  platformFeeBps: number; // Basis points (200 = 2%)
  platformFeePercent: number; // Percentage (2.0 = 2%)
  overageFeeCents: number; // Cents per ticket
  brandingRemoved: boolean;
  hasOverride: boolean;
  overrideReason?: string;
};

export type PayoutFeeBreakdown = {
  grossRevenue: number; // Total ticket revenue in cents
  platformFee: number; // Platform fee in cents
  overageFee: number; // Overage fee in cents
  totalFees: number; // Total fees in cents
  netPayout: number; // Amount to pay out in cents
};

/**
 * Service for calculating fees (platform fee, overage fee)
 * Supports event-level overrides set by platform admins
 */
export const feeService = {
  /**
   * Get the effective platform fee for an event
   * Checks for event-level override, then organization branding, then default
   */
  getPlatformFee: async (
    eventId: string
  ): Promise<FeeCalculation> => {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        platformFeeOverride: true,
        overageFeeOverride: true,
        feeOverrideReason: true,
        organization: {
          select: {
            currentPlan: true,
            subscription: {
              select: { brandingRemoved: true },
            },
          },
        },
      },
    });

    if (!event) {
      // Return default if event not found
      return {
        platformFeeBps: DEFAULT_PLATFORM_FEE_BPS,
        platformFeePercent: DEFAULT_PLATFORM_FEE_BPS / 100,
        overageFeeCents: 0,
        brandingRemoved: false,
        hasOverride: false,
      };
    }

    const plan = event.organization.currentPlan ?? "NON_PROFIT";
    const brandingRemoved = event.organization.subscription?.brandingRemoved ?? false;
    const planLimits = getPlanLimits(plan);

    // Check for event-level platform fee override
    if (event.platformFeeOverride !== null) {
      return {
        platformFeeBps: event.platformFeeOverride,
        platformFeePercent: event.platformFeeOverride / 100,
        overageFeeCents: event.overageFeeOverride ?? getPlanOverageFee(plan),
        brandingRemoved,
        hasOverride: true,
        overrideReason: event.feeOverrideReason ?? undefined,
      };
    }

    // Calculate platform fee based on plan and branding
    let platformFeeBps = DEFAULT_PLATFORM_FEE_BPS;

    // Add branding removal fee if applicable (not for PRO_ORGANIZER which includes whitelabel)
    if (brandingRemoved && !planLimits.whitelabelIncluded) {
      platformFeeBps += BRANDING_REMOVAL_FEE_BPS;
    }

    return {
      platformFeeBps,
      platformFeePercent: platformFeeBps / 100,
      overageFeeCents: event.overageFeeOverride ?? getPlanOverageFee(plan),
      brandingRemoved,
      hasOverride: event.overageFeeOverride !== null,
      overrideReason: event.feeOverrideReason ?? undefined,
    };
  },

  /**
   * Get the effective overage fee for an event
   * Checks for event-level override, then uses plan default
   */
  getOverageFee: async (
    eventId: string,
    plan: PricingPlan
  ): Promise<number> => {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { overageFeeOverride: true },
    });

    if (event?.overageFeeOverride !== null && event?.overageFeeOverride !== undefined) {
      return event.overageFeeOverride;
    }

    return getPlanOverageFee(plan);
  },

  /**
   * Calculate payout breakdown for an event or order
   */
  calculatePayoutFees: async (
    eventId: string,
    grossRevenue: number,
    overageTicketCount: number = 0
  ): Promise<PayoutFeeBreakdown> => {
    const feeCalc = await feeService.getPlatformFee(eventId);

    // Platform fee: percentage of gross revenue
    const platformFee = Math.round(grossRevenue * (feeCalc.platformFeeBps / 10000));

    // Overage fee: per ticket charge
    const overageFee = overageTicketCount * feeCalc.overageFeeCents;

    const totalFees = platformFee + overageFee;
    const netPayout = grossRevenue - totalFees;

    return {
      grossRevenue,
      platformFee,
      overageFee,
      totalFees,
      netPayout,
    };
  },

  /**
   * Set fee override for an event (Platform Admin only)
   */
  setFeeOverride: async (
    eventId: string,
    adminUserId: string,
    override: {
      platformFeeBps?: number | null;
      overageFeeCents?: number | null;
      reason: string;
    }
  ): Promise<Event> => {
    // Validate fee ranges
    if (override.platformFeeBps !== null && override.platformFeeBps !== undefined) {
      if (override.platformFeeBps < 0 || override.platformFeeBps > 1000) {
        throw new Error("Platform fee must be between 0% and 10% (0-1000 basis points)");
      }
    }

    if (override.overageFeeCents !== null && override.overageFeeCents !== undefined) {
      if (override.overageFeeCents < 0 || override.overageFeeCents > 100) {
        throw new Error("Overage fee must be between €0.00 and €1.00 (0-100 cents)");
      }
    }

    if (!override.reason || override.reason.trim().length < 5) {
      throw new Error("A reason is required when setting fee overrides");
    }

    return prisma.event.update({
      where: { id: eventId },
      data: {
        platformFeeOverride: override.platformFeeBps,
        overageFeeOverride: override.overageFeeCents,
        feeOverrideReason: override.reason,
        feeOverrideSetBy: adminUserId,
        feeOverrideSetAt: new Date(),
      },
    });
  },

  /**
   * Clear fee override for an event (Platform Admin only)
   */
  clearFeeOverride: async (eventId: string, adminUserId: string): Promise<Event> => {
    return prisma.event.update({
      where: { id: eventId },
      data: {
        platformFeeOverride: null,
        overageFeeOverride: null,
        feeOverrideReason: null,
        feeOverrideSetBy: adminUserId, // Track who cleared it
        feeOverrideSetAt: new Date(),
      },
    });
  },

  /**
   * Get fee summary for display in admin UI
   */
  getFeeSummary: async (eventId: string): Promise<{
    effective: FeeCalculation;
    planDefault: {
      platformFeeBps: number;
      overageFeeCents: number;
    };
    organization: {
      plan: PricingPlan | null;
      brandingRemoved: boolean;
    };
  }> => {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        organization: {
          select: {
            currentPlan: true,
            subscription: {
              select: { brandingRemoved: true },
            },
          },
        },
      },
    });

    const plan = event?.organization.currentPlan ?? "NON_PROFIT";
    const brandingRemoved = event?.organization.subscription?.brandingRemoved ?? false;
    const planLimits = getPlanLimits(plan);

    // Calculate plan default (with branding if applicable)
    let planDefaultBps = DEFAULT_PLATFORM_FEE_BPS;
    if (brandingRemoved && !planLimits.whitelabelIncluded) {
      planDefaultBps += BRANDING_REMOVAL_FEE_BPS;
    }

    const effective = await feeService.getPlatformFee(eventId);

    return {
      effective,
      planDefault: {
        platformFeeBps: planDefaultBps,
        overageFeeCents: getPlanOverageFee(plan),
      },
      organization: {
        plan: event?.organization.currentPlan ?? null,
        brandingRemoved,
      },
    };
  },
};
