import type { PricingPlan } from "@/generated/prisma";

/**
 * Plan configuration for subscription billing
 * See PRICING.md for full pricing documentation
 */

export type PlanLimits = {
  /** Maximum number of active events, null = unlimited */
  activeEvents: number | null;
  /** Maximum tickets allowed (per event or per month depending on limitPeriod) */
  ticketLimit: number;
  /** Whether the ticket limit applies per event or per billing month */
  limitPeriod: "event" | "month";
  /** Overage fee in cents per ticket, null = no overage allowed (hard limit) */
  overageFee: number | null;
  /** Monthly subscription price in cents (0 for free, null for one-time purchase) */
  monthlyPrice: number | null;
  /** One-time event price in cents (for PAY_PER_EVENT) */
  eventPrice: number | null;
  /** Whether Entro branding can be removed (with +2% fee) */
  brandingRemovalAllowed: boolean;
  /** Whether this plan includes whitelabel (no branding by default) */
  whitelabelIncluded: boolean;
};

/**
 * Plan configuration lookup table
 * Prices are in EUR cents
 */
export const PLAN_LIMITS: Record<PricingPlan, PlanLimits> = {
  NON_PROFIT: {
    activeEvents: 1,
    ticketLimit: 500,
    limitPeriod: "event",
    overageFee: null, // Hard limit, no overage
    monthlyPrice: 0,
    eventPrice: null,
    brandingRemovalAllowed: true,
    whitelabelIncluded: false,
  },
  PAY_PER_EVENT: {
    activeEvents: 1,
    ticketLimit: 1000,
    limitPeriod: "event",
    overageFee: 10, // €0.10 per ticket
    monthlyPrice: null,
    eventPrice: 4900, // €49 per event
    brandingRemovalAllowed: true,
    whitelabelIncluded: false,
  },
  ORGANIZER: {
    activeEvents: null, // Unlimited
    ticketLimit: 3000,
    limitPeriod: "month",
    overageFee: 8, // €0.08 per ticket
    monthlyPrice: 4900, // €49/month
    eventPrice: null,
    brandingRemovalAllowed: true,
    whitelabelIncluded: false,
  },
  PRO_ORGANIZER: {
    activeEvents: null, // Unlimited
    ticketLimit: 10000,
    limitPeriod: "month",
    overageFee: 5, // €0.05 per ticket
    monthlyPrice: 9900, // €99/month
    eventPrice: null,
    brandingRemovalAllowed: false, // Already whitelabel
    whitelabelIncluded: true,
  },
};

/**
 * Default platform fee in basis points (2% = 200)
 */
export const DEFAULT_PLATFORM_FEE_BPS = 200;

/**
 * Branding removal fee in basis points (+2% = 200)
 * Added to platform fee when branding is removed for non-Pro plans
 */
export const BRANDING_REMOVAL_FEE_BPS = 200;

/**
 * Service fee per order in cents (€0.35)
 * NOTE: PRICING.md says €0.35, but copilot-instructions.md says €0.99
 * Using €0.99 to match copilot-instructions.md (single source of truth)
 */
export const SERVICE_FEE_CENTS = 99;

/**
 * Get plan limits for a given plan
 */
export function getPlanLimits(plan: PricingPlan): PlanLimits {
  return PLAN_LIMITS[plan];
}

/**
 * Check if a plan allows overage (soft limit vs hard limit)
 */
export function isOverageAllowed(plan: PricingPlan): boolean {
  return PLAN_LIMITS[plan].overageFee !== null;
}

/**
 * Get the overage fee for a plan (returns 0 if not allowed)
 */
export function getPlanOverageFee(plan: PricingPlan): number {
  return PLAN_LIMITS[plan].overageFee ?? 0;
}

/**
 * Check if a plan has a monthly subscription
 */
export function isMonthlyPlan(plan: PricingPlan): boolean {
  return PLAN_LIMITS[plan].monthlyPrice !== null && PLAN_LIMITS[plan].monthlyPrice > 0;
}

/**
 * Check if a plan is the pay-per-event model
 */
export function isPayPerEventPlan(plan: PricingPlan): boolean {
  return plan === "PAY_PER_EVENT";
}

/**
 * Get display name for a plan
 */
export function getPlanDisplayName(plan: PricingPlan): string {
  const names: Record<PricingPlan, string> = {
    NON_PROFIT: "Non-profit & Stichtingen",
    PAY_PER_EVENT: "Pay-Per-Event",
    ORGANIZER: "Organizer",
    PRO_ORGANIZER: "Pro Organizer",
  };
  return names[plan];
}

/**
 * Get plan price description
 */
export function getPlanPriceDescription(plan: PricingPlan): string {
  const limits = PLAN_LIMITS[plan];

  if (limits.monthlyPrice === 0) {
    return "Gratis";
  }
  if (limits.eventPrice !== null) {
    return `€${(limits.eventPrice / 100).toFixed(0)}/evenement`;
  }
  if (limits.monthlyPrice !== null) {
    return `€${(limits.monthlyPrice / 100).toFixed(0)}/maand`;
  }
  return "Gratis";
}
