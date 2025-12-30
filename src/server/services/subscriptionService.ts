import { prisma } from "@/server/lib/prisma";
import { subscriptionRepo } from "@/server/repos/subscriptionRepo";
import { planLimitsService } from "@/server/services/planLimitsService";
import { getPlanLimits } from "@/server/domain/plans";
import type {
  PricingPlan,
  Subscription,
} from "@/generated/prisma";

export type SubscriptionCreateInput = {
  organizationId: string;
  plan: PricingPlan;
  mollieCustomerId?: string;
  mollieSubscriptionId?: string;
};

export type SubscriptionUpgradeResult = {
  success: boolean;
  subscription?: Subscription;
  error?: string;
  prorationAmount?: number; // Amount to charge for upgrade (in cents)
};

export type SubscriptionDowngradeResult = {
  success: boolean;
  subscription?: Subscription;
  error?: string;
  effectiveDate?: Date; // When the downgrade takes effect
};

/**
 * Calculate billing period dates
 */
function getBillingPeriod(startDate: Date = new Date()): {
  periodStart: Date;
  periodEnd: Date;
} {
  const periodStart = new Date(startDate);
  periodStart.setHours(0, 0, 0, 0);

  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  return { periodStart, periodEnd };
}

/**
 * Calculate prorated amount for upgrade
 */
function calculateProratedAmount(
  currentPlan: PricingPlan,
  newPlan: PricingPlan,
  daysRemaining: number
): number {
  const currentLimits = getPlanLimits(currentPlan);
  const newLimits = getPlanLimits(newPlan);

  const currentMonthly = currentLimits.monthlyPrice ?? 0;
  const newMonthly = newLimits.monthlyPrice ?? 0;

  if (newMonthly <= currentMonthly) return 0;

  const difference = newMonthly - currentMonthly;
  const dailyRate = difference / 30; // Approximate monthly days

  return Math.round(dailyRate * daysRemaining);
}

/**
 * Service for managing subscriptions
 */
export const subscriptionService = {
  /**
   * Create a new subscription for an organization
   * Used for initial plan selection
   */
  createSubscription: async (input: SubscriptionCreateInput): Promise<Subscription> => {
    const { periodStart, periodEnd } = getBillingPeriod();

    // Create subscription record
    const subscription = await subscriptionRepo.create({
      organizationId: input.organizationId,
      plan: input.plan,
      status: "ACTIVE",
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      mollieCustomerId: input.mollieCustomerId,
      mollieSubscriptionId: input.mollieSubscriptionId,
    });

    // Update organization's current plan
    await prisma.organization.update({
      where: { id: input.organizationId },
      data: { currentPlan: input.plan },
    });

    // Create initial usage record for monthly plans
    const planLimits = getPlanLimits(input.plan);
    if (planLimits.limitPeriod === "month") {
      await subscriptionRepo.getOrCreateUsageRecord(
        input.organizationId,
        periodStart,
        periodEnd
      );
    }

    return subscription;
  },

  /**
   * Initialize a free subscription (NON_PROFIT plan)
   * No payment required
   */
  initializeFreeSubscription: async (organizationId: string): Promise<Subscription> => {
    return subscriptionService.createSubscription({
      organizationId,
      plan: "NON_PROFIT",
    });
  },

  /**
   * Upgrade to a higher plan
   * Takes effect immediately with prorated billing
   */
  upgradePlan: async (
    organizationId: string,
    newPlan: PricingPlan
  ): Promise<SubscriptionUpgradeResult> => {
    const subscription = await subscriptionRepo.findByOrganizationId(organizationId);

    if (!subscription) {
      // No existing subscription, create new one
      const newSub = await subscriptionService.createSubscription({
        organizationId,
        plan: newPlan,
      });
      return { success: true, subscription: newSub };
    }

    const currentPlan = subscription.plan;

    // Validate upgrade path (can't upgrade to same or lower plan)
    const planOrder: PricingPlan[] = ["NON_PROFIT", "PAY_PER_EVENT", "ORGANIZER", "PRO_ORGANIZER"];
    const currentIndex = planOrder.indexOf(currentPlan);
    const newIndex = planOrder.indexOf(newPlan);

    if (newIndex <= currentIndex) {
      return {
        success: false,
        error: "Je kunt alleen upgraden naar een hoger plan. Gebruik downgrade voor lagere plannen.",
      };
    }

    // Calculate days remaining in current period
    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (subscription.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    // Calculate proration
    const prorationAmount = calculateProratedAmount(currentPlan, newPlan, daysRemaining);

    // Update subscription
    const updatedSubscription = await subscriptionRepo.update(subscription.id, {
      plan: newPlan,
      cancelAtPeriodEnd: false, // Clear any pending cancellation
    });

    // Update organization's current plan
    await prisma.organization.update({
      where: { id: organizationId },
      data: { currentPlan: newPlan },
    });

    // Create invoice for proration if applicable
    if (prorationAmount > 0) {
      await subscriptionRepo.createInvoice({
        organizationId,
        subscriptionId: subscription.id,
        type: "SUBSCRIPTION",
        amount: prorationAmount,
        description: `Plan upgrade: ${currentPlan} → ${newPlan} (prorated)`,
      });
    }

    return {
      success: true,
      subscription: updatedSubscription,
      prorationAmount,
    };
  },

  /**
   * Downgrade to a lower plan
   * Takes effect at end of current billing cycle
   */
  downgradePlan: async (
    organizationId: string,
    newPlan: PricingPlan
  ): Promise<SubscriptionDowngradeResult> => {
    const subscription = await subscriptionRepo.findByOrganizationId(organizationId);

    if (!subscription) {
      return {
        success: false,
        error: "Geen actief abonnement gevonden",
      };
    }

    // Check if downgrade is allowed based on current usage
    const canDowngrade = await planLimitsService.canDowngradeTo(organizationId, newPlan);
    if (!canDowngrade.allowed) {
      return {
        success: false,
        error: canDowngrade.reason,
      };
    }

    // Mark subscription to change at period end
    // Note: The actual plan change happens via webhook/cron when period ends
    await subscriptionRepo.update(subscription.id, {
      cancelAtPeriodEnd: true,
    });

    // Store pending plan change in metadata (we'd need a field for this)
    // For now, we'll handle it in the billing webhook

    return {
      success: true,
      subscription,
      effectiveDate: subscription.currentPeriodEnd,
    };
  },

  /**
   * Cancel subscription
   * Takes effect at end of current billing cycle
   * Downgrades to NON_PROFIT if eligible
   */
  cancelSubscription: async (
    organizationId: string
  ): Promise<{ success: boolean; error?: string; effectiveDate?: Date }> => {
    const subscription = await subscriptionRepo.findByOrganizationId(organizationId);

    if (!subscription) {
      return {
        success: false,
        error: "Geen actief abonnement gevonden",
      };
    }

    // Check if can downgrade to NON_PROFIT
    const canDowngrade = await planLimitsService.canDowngradeTo(organizationId, "NON_PROFIT");
    if (!canDowngrade.allowed) {
      return {
        success: false,
        error: `Kan niet annuleren: ${canDowngrade.reason}`,
      };
    }

    // Mark for cancellation at period end
    await subscriptionRepo.update(subscription.id, {
      cancelAtPeriodEnd: true,
    });

    return {
      success: true,
      effectiveDate: subscription.currentPeriodEnd,
    };
  },

  /**
   * Process billing cycle end (called by webhook or cron)
   * Handles plan changes, renewals, and cancellations
   */
  processSubscriptionRenewal: async (subscriptionId: string): Promise<void> => {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) return;

    const { periodStart, periodEnd } = getBillingPeriod(subscription.currentPeriodEnd);

    if (subscription.cancelAtPeriodEnd) {
      // Downgrade to NON_PROFIT
      await subscriptionRepo.update(subscription.id, {
        plan: "NON_PROFIT",
        status: "ACTIVE",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        mollieSubscriptionId: undefined, // Clear Mollie subscription
      });

      await prisma.organization.update({
        where: { id: subscription.organizationId },
        data: { currentPlan: "NON_PROFIT" },
      });
    } else {
      // Renew subscription
      await subscriptionRepo.update(subscription.id, {
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      });

      // Create new usage record for the new period
      const planLimits = getPlanLimits(subscription.plan);
      if (planLimits.limitPeriod === "month") {
        await subscriptionRepo.getOrCreateUsageRecord(
          subscription.organizationId,
          periodStart,
          periodEnd
        );
      }
    }
  },

  /**
   * Handle payment failure (called by Mollie webhook)
   */
  handlePaymentFailure: async (subscriptionId: string): Promise<void> => {
    await subscriptionRepo.update(subscriptionId, {
      status: "PAST_DUE",
    });
  },

  /**
   * Handle successful payment (called by Mollie webhook)
   */
  handlePaymentSuccess: async (subscriptionId: string): Promise<void> => {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) return;

    // If was past due, restore to active
    if (subscription.status === "PAST_DUE") {
      await subscriptionRepo.update(subscriptionId, {
        status: "ACTIVE",
      });
    }
  },

  /**
   * Toggle branding removal for an organization
   */
  setBrandingRemoved: async (
    organizationId: string,
    removed: boolean
  ): Promise<Subscription | null> => {
    const subscription = await subscriptionRepo.findByOrganizationId(organizationId);

    if (!subscription) return null;

    const planLimits = getPlanLimits(subscription.plan);

    // PRO_ORGANIZER already has whitelabel
    if (planLimits.whitelabelIncluded) {
      return subscription;
    }

    // Can't remove branding on plans that don't allow it
    if (removed && !planLimits.brandingRemovalAllowed) {
      return null;
    }

    return subscriptionRepo.update(subscription.id, {
      brandingRemoved: removed,
    });
  },

  /**
   * Get subscription status with full details
   */
  getSubscriptionStatus: async (organizationId: string): Promise<{
    hasSubscription: boolean;
    subscription: Subscription | null;
    usageSummary: Awaited<ReturnType<typeof planLimitsService.getUsageSummary>>;
    isPastDue: boolean;
    pendingCancellation: boolean;
  }> => {
    const subscription = await subscriptionRepo.findByOrganizationId(organizationId);
    const usageSummary = await planLimitsService.getUsageSummary(organizationId);

    return {
      hasSubscription: !!subscription,
      subscription,
      usageSummary,
      isPastDue: subscription?.status === "PAST_DUE",
      pendingCancellation: subscription?.cancelAtPeriodEnd ?? false,
    };
  },

  /**
   * Create a Pay-Per-Event subscription
   * One-time payment that expires when event ends
   */
  createPayPerEventSubscription: async (
    organizationId: string,
    eventId: string,
    molliePaymentId?: string
  ): Promise<Subscription> => {
    // Get event end date to set as subscription end
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { endsAt: true },
    });

    const periodStart = new Date();
    const periodEnd = event?.endsAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

    const subscription = await subscriptionRepo.create({
      organizationId,
      plan: "PAY_PER_EVENT",
      status: "ACTIVE",
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    });

    // Update organization's current plan
    await prisma.organization.update({
      where: { id: organizationId },
      data: { currentPlan: "PAY_PER_EVENT" },
    });

    // Create invoice for the event payment
    if (molliePaymentId) {
      const planLimits = getPlanLimits("PAY_PER_EVENT");
      await subscriptionRepo.createInvoice({
        organizationId,
        subscriptionId: subscription.id,
        type: "PAY_PER_EVENT",
        amount: planLimits.eventPrice ?? 4900,
        description: "Pay-Per-Event ticket purchase",
        molliePaymentId,
      });
    }

    return subscription;
  },
};
