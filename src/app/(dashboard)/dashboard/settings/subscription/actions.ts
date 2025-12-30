"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/server/lib/supabase";
import { getUserOrganizations } from "@/server/services/organizationService";
import { subscriptionRepo } from "@/server/repos/subscriptionRepo";
import { createSubscriptionPayment } from "@/server/services/mollieSubscriptionService";
import { env } from "@/server/lib/env";
import { prisma } from "@/server/lib/prisma";
import {
  PLAN_LIMITS,
  getPlanDisplayName,
  getPlanPriceDescription,
  isOverageAllowed,
} from "@/server/domain/plans";
import type { PricingPlan, SubscriptionStatus } from "@/generated/prisma";

export type SubscriptionData = {
  // Organization info
  organizationId: string;
  organizationName: string;

  // Plan info (null = no plan active)
  plan: PricingPlan | null;
  planDisplayName: string | null;
  planPriceDescription: string | null;
  status: SubscriptionStatus;

  // Plan limits (null when no plan)
  ticketLimit: number | null;
  limitPeriod: "event" | "month" | null;
  activeEventsLimit: number | null;
  overageFee: number | null;
  overageAllowed: boolean;

  // Billing info
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  brandingRemoved: boolean;

  // Usage info
  ticketsSold: number;
  overageTickets: number;
  overageFeeTotal: number;
  usagePercentage: number;

  // Features
  features: PlanFeature[];
};

export type PlanFeature = {
  name: string;
  included: boolean;
  note?: string;
};

/**
 * Get the current user's organization subscription data
 */
export async function getSubscriptionAction(): Promise<SubscriptionData | null> {
  const user = await getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const organizations = await getUserOrganizations(user.id);

  if (organizations.length === 0) {
    redirect("/onboarding");
  }

  const currentOrg = organizations[0];
  const plan = currentOrg.currentPlan; // Can be null = no plan active

  // Get subscription details
  const subscription = await subscriptionRepo.findByOrganizationId(currentOrg.id);

  // If no plan, return minimal data
  if (!plan) {
    return {
      organizationId: currentOrg.id,
      organizationName: currentOrg.name,

      plan: null,
      planDisplayName: null,
      planPriceDescription: null,
      status: "CANCELLED" as SubscriptionStatus,

      ticketLimit: null,
      limitPeriod: null,
      activeEventsLimit: null,
      overageFee: null,
      overageAllowed: false,

      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      brandingRemoved: false,

      ticketsSold: 0,
      overageTickets: 0,
      overageFeeTotal: 0,
      usagePercentage: 0,

      features: [],
    };
  }

  // Plan exists - get limits and features
  const planLimits = PLAN_LIMITS[plan];

  // Calculate usage based on plan type
  let ticketsSold = 0;
  let overageTickets = 0;
  let overageFeeTotal = 0;

  if (planLimits.limitPeriod === "month") {
    // For monthly plans, use usage records
    const now = new Date();
    const usage = await subscriptionRepo.getOrCreateUsageRecord(
      currentOrg.id,
      getMonthStart(now),
      getMonthEnd(now)
    );
    ticketsSold = usage.ticketsSold;
    overageTickets = usage.overageTickets;
    overageFeeTotal = usage.overageFeeTotal;
  } else {
    // For event-based plans, count tickets from all LIVE events
    ticketsSold = await prisma.ticket.count({
      where: {
        event: {
          organizationId: currentOrg.id,
          status: "LIVE",
        },
        order: {
          status: "PAID",
        },
      },
    });

    // Calculate overage if applicable
    if (ticketsSold > planLimits.ticketLimit && isOverageAllowed(plan)) {
      overageTickets = ticketsSold - planLimits.ticketLimit;
      overageFeeTotal = overageTickets * (planLimits.overageFee ?? 0);
    }
  }

  // Calculate usage percentage
  const usagePercentage = Math.round((ticketsSold / planLimits.ticketLimit) * 100);

  // Build features list based on plan
  const features = getPlanFeatures(plan, subscription?.brandingRemoved ?? false);

  return {
    organizationId: currentOrg.id,
    organizationName: currentOrg.name,

    plan,
    planDisplayName: getPlanDisplayName(plan),
    planPriceDescription: getPlanPriceDescription(plan),
    status: subscription?.status ?? "ACTIVE",

    ticketLimit: planLimits.ticketLimit,
    limitPeriod: planLimits.limitPeriod,
    activeEventsLimit: planLimits.activeEvents,
    overageFee: planLimits.overageFee,
    overageAllowed: isOverageAllowed(plan),

    currentPeriodStart: subscription?.currentPeriodStart ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    brandingRemoved: subscription?.brandingRemoved ?? false,

    ticketsSold,
    overageTickets,
    overageFeeTotal,
    usagePercentage,

    features,
  };
}

/**
 * Get all available plans for comparison
 */
export async function getAvailablePlansAction(): Promise<PlanInfo[]> {
  const plans: PricingPlan[] = ["NON_PROFIT", "PAY_PER_EVENT", "ORGANIZER", "PRO_ORGANIZER"];

  return plans.map((plan) => {
    const limits = PLAN_LIMITS[plan];
    return {
      plan,
      displayName: getPlanDisplayName(plan),
      priceDescription: getPlanPriceDescription(plan),
      monthlyPrice: limits.monthlyPrice,
      eventPrice: limits.eventPrice,
      ticketLimit: limits.ticketLimit,
      limitPeriod: limits.limitPeriod,
      activeEventsLimit: limits.activeEvents,
      overageFee: limits.overageFee,
      overageAllowed: isOverageAllowed(plan),
      features: getPlanFeatures(plan, false),
      isPopular: plan === "PRO_ORGANIZER",
    };
  });
}

export type PlanInfo = {
  plan: PricingPlan;
  displayName: string;
  priceDescription: string;
  monthlyPrice: number | null;
  eventPrice: number | null;
  ticketLimit: number;
  limitPeriod: "event" | "month";
  activeEventsLimit: number | null;
  overageFee: number | null;
  overageAllowed: boolean;
  features: PlanFeature[];
  isPopular: boolean;
};

export type UpgradeResult = {
  success: boolean;
  checkoutUrl?: string;
  error?: string;
};

export type DowngradeResult = {
  success: boolean;
  effectiveDate?: Date;
  checkoutUrl?: string; // Present when downgrading to another paid plan
  error?: string;
};

/**
 * Upgrade to a new plan
 * Returns a checkout URL for paid plans
 */
export async function upgradePlanAction(targetPlan: PricingPlan): Promise<UpgradeResult> {
  const user = await getUser();

  if (!user) {
    return { success: false, error: "Niet ingelogd" };
  }

  const organizations = await getUserOrganizations(user.id);

  if (organizations.length === 0) {
    return { success: false, error: "Geen organisatie gevonden" };
  }

  const currentOrg = organizations[0];
  const currentPlan = currentOrg.currentPlan;

  // Validate upgrade direction (null plan can upgrade to anything)
  if (currentPlan !== null) {
    const currentOrder = getPlanOrder(currentPlan);
    const targetOrder = getPlanOrder(targetPlan);

    if (targetOrder <= currentOrder) {
      return { success: false, error: "Dit is geen upgrade" };
    }
  }

  const targetLimits = PLAN_LIMITS[targetPlan];

  // For free plan or pay-per-event (no monthly fee), just update the plan directly
  if (targetLimits.monthlyPrice === 0 || targetLimits.monthlyPrice === null) {
    await updateOrganizationPlan(currentOrg.id, targetPlan);

    // Create subscription record for tracking
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const subscription = await subscriptionRepo.findByOrganizationId(currentOrg.id);

    if (subscription) {
      await subscriptionRepo.update(subscription.id, {
        plan: targetPlan,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      });
    } else {
      await subscriptionRepo.create({
        organizationId: currentOrg.id,
        plan: targetPlan,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });
    }

    return { success: true };
  }

  // For paid monthly plans, create Mollie checkout
  // Uses Entro's platform Mollie account (NOT org's connected account)
  const baseUrl = env.NEXT_PUBLIC_APP_URL;
  const email = user.email ?? "";

  const result = await createSubscriptionPayment(
    currentOrg.id,
    targetPlan,
    email,
    baseUrl
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, checkoutUrl: result.checkoutUrl };
}

/**
 * Downgrade to a lower plan (takes effect at end of billing period)
 */
export async function downgradePlanAction(targetPlan: PricingPlan): Promise<DowngradeResult> {
  const user = await getUser();

  if (!user) {
    return { success: false, error: "Niet ingelogd" };
  }

  const organizations = await getUserOrganizations(user.id);

  if (organizations.length === 0) {
    return { success: false, error: "Geen organisatie gevonden" };
  }

  const currentOrg = organizations[0];
  const currentPlan = currentOrg.currentPlan ?? "NON_PROFIT";

  // Validate downgrade direction
  const currentOrder = getPlanOrder(currentPlan);
  const targetOrder = getPlanOrder(targetPlan);

  if (targetOrder >= currentOrder) {
    return { success: false, error: "Dit is geen downgrade" };
  }

  // Check usage limits - calculate based on plan type
  const targetLimits = PLAN_LIMITS[targetPlan];
  const currentLimits = PLAN_LIMITS[currentPlan];
  let currentTicketsSold = 0;

  if (currentLimits.limitPeriod === "month") {
    // For monthly plans, use usage records
    const now = new Date();
    const usage = await subscriptionRepo.getOrCreateUsageRecord(
      currentOrg.id,
      getMonthStart(now),
      getMonthEnd(now)
    );
    currentTicketsSold = usage.ticketsSold;
  } else {
    // For event-based plans, count tickets from all LIVE events
    currentTicketsSold = await prisma.ticket.count({
      where: {
        event: {
          organizationId: currentOrg.id,
          status: "LIVE",
        },
        order: {
          status: "PAID",
        },
      },
    });
  }

  // Block if usage exceeds limit and target plan doesn't allow overage
  if (currentTicketsSold > targetLimits.ticketLimit && !isOverageAllowed(targetPlan)) {
    return {
      success: false,
      error: `Je hebt ${currentTicketsSold} tickets verkocht ${currentLimits.limitPeriod === "month" ? "deze maand" : "voor je actieve evenement"}. ${getPlanDisplayName(targetPlan)} heeft een limiet van ${targetLimits.ticketLimit} tickets zonder overage mogelijkheid.`,
    };
  }

  // Get or create subscription
  const subscription = await subscriptionRepo.findByOrganizationId(currentOrg.id);

  if (subscription) {
    // Cancel Mollie subscription if exists
    if (subscription.mollieSubscriptionId && subscription.mollieCustomerId) {
      try {
        const { cancelMollieSubscription } = await import("@/server/services/mollieSubscriptionService");
        await cancelMollieSubscription(currentOrg.id);
      } catch (error) {
        console.error("Failed to cancel Mollie subscription during downgrade:", error);
        // Continue anyway - we'll mark it for cancellation in our DB
      }
    }

    // Check if target plan also needs a monthly subscription
    const targetLimits = PLAN_LIMITS[targetPlan];
    const targetNeedsSubscription = targetLimits.monthlyPrice !== null && targetLimits.monthlyPrice > 0;

    if (targetNeedsSubscription) {
      // Downgrading to another paid plan (e.g., PRO_ORGANIZER → ORGANIZER)
      // Create a new Mollie subscription for the target plan
      const baseUrl = env.NEXT_PUBLIC_APP_URL;
      const email = user.email ?? "";

      const result = await createSubscriptionPayment(
        currentOrg.id,
        targetPlan,
        email,
        baseUrl
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true, checkoutUrl: result.checkoutUrl };
    }

    // Downgrading to a free or pay-per-event plan
    // Update to target plan immediately and mark for cancellation at period end
    await updateOrganizationPlan(currentOrg.id, targetPlan);
    await subscriptionRepo.update(subscription.id, {
      plan: targetPlan,
      cancelAtPeriodEnd: true, // Mark that this is a scheduled downgrade
    });

    // If no paid subscription, apply immediately (no period to wait for)
    if (!subscription.mollieSubscriptionId) {
      const now = new Date();
      await subscriptionRepo.update(subscription.id, {
        cancelAtPeriodEnd: false,
      });
      return { success: true, effectiveDate: now };
    }

    return {
      success: true,
      effectiveDate: subscription.currentPeriodEnd ?? undefined,
    };
  } else {
    // No subscription, just update the plan
    const now = new Date();
    await updateOrganizationPlan(currentOrg.id, targetPlan);

    return { success: true, effectiveDate: now };
  }
}

/**
 * Helper to update organization's current plan
 */
async function updateOrganizationPlan(orgId: string, plan: PricingPlan): Promise<void> {
  const { prisma } = await import("@/server/lib/prisma");
  await prisma.organization.update({
    where: { id: orgId },
    data: { currentPlan: plan },
  });
}

/**
 * Get the order of a plan for comparison
 */
function getPlanOrder(plan: PricingPlan): number {
  const order: Record<PricingPlan, number> = {
    NON_PROFIT: 0,
    PAY_PER_EVENT: 1,
    ORGANIZER: 2,
    PRO_ORGANIZER: 3,
  };
  return order[plan];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function getPlanFeatures(plan: PricingPlan, brandingRemoved: boolean): PlanFeature[] {
  const baseFeatures: PlanFeature[] = [
    { name: "Online ticketverkoop", included: true },
    { name: "QR-code scanning", included: true },
    { name: "iDEAL betalingen", included: true },
    { name: "Real-time tracking", included: true },
    { name: "E-mail notificaties", included: true },
  ];

  const planSpecificFeatures: Record<PricingPlan, PlanFeature[]> = {
    NON_PROFIT: [
      { name: "1 actief evenement", included: true },
      { name: "500 tickets per evenement", included: true },
      { name: "Basis support", included: true },
      {
        name: "Entro-branding",
        included: true,
        note: brandingRemoved ? "Verwijderd (+2%)" : "Verwijdering mogelijk (+2%)",
      },
    ],
    PAY_PER_EVENT: [
      { name: "1 evenement per aankoop", included: true },
      { name: "1.000 tickets per evenement", included: true },
      { name: "Onbeperkte ticket types", included: true },
      { name: "Aangepaste vragen", included: true },
      { name: "Priority support", included: true },
      {
        name: "Entro-branding",
        included: true,
        note: brandingRemoved ? "Verwijderd (+2%)" : "Verwijdering mogelijk (+2%)",
      },
    ],
    ORGANIZER: [
      { name: "Onbeperkt evenementen", included: true },
      { name: "3.000 tickets per maand", included: true },
      { name: "Analytics dashboard", included: true },
      { name: "API toegang", included: true },
      { name: "Dedicated support", included: true },
      {
        name: "Entro-branding",
        included: true,
        note: brandingRemoved ? "Verwijderd (+2%)" : "Verwijdering mogelijk (+2%)",
      },
    ],
    PRO_ORGANIZER: [
      { name: "Onbeperkt evenementen", included: true },
      { name: "10.000 tickets per maand", included: true },
      { name: "Premium analytics", included: true },
      { name: "Priority API limits", included: true },
      { name: "Dedicated account manager", included: true },
      { name: "SLA garantie", included: true },
      { name: "Whitelabel (geen branding)", included: true },
    ],
  };

  return [...baseFeatures, ...planSpecificFeatures[plan]];
}
