import { prisma } from "@/server/lib/prisma";
import type {
  Subscription,
  UsageRecord,
  SubscriptionInvoice,
  PricingPlan,
  SubscriptionStatus,
  InvoiceType,
  InvoiceStatus,
} from "@/generated/prisma";

export type CreateSubscriptionInput = {
  organizationId: string;
  plan: PricingPlan;
  status?: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  mollieSubscriptionId?: string;
  mollieCustomerId?: string;
  brandingRemoved?: boolean;
};

export type UpdateSubscriptionInput = {
  plan?: PricingPlan;
  status?: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  mollieSubscriptionId?: string;
  mollieCustomerId?: string;
  cancelAtPeriodEnd?: boolean;
  brandingRemoved?: boolean;
};

export type CreateUsageRecordInput = {
  organizationId: string;
  periodStart: Date;
  periodEnd: Date;
};

export type CreateInvoiceInput = {
  organizationId: string;
  subscriptionId?: string;
  type: InvoiceType;
  amount: number;
  description?: string;
  molliePaymentId?: string;
};

export const subscriptionRepo = {
  // ==========================================================================
  // SUBSCRIPTION CRUD
  // ==========================================================================

  /**
   * Create a new subscription for an organization
   */
  create: async (data: CreateSubscriptionInput): Promise<Subscription> => {
    return prisma.subscription.create({
      data: {
        organizationId: data.organizationId,
        plan: data.plan,
        status: data.status ?? "ACTIVE",
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        mollieSubscriptionId: data.mollieSubscriptionId,
        mollieCustomerId: data.mollieCustomerId,
        brandingRemoved: data.brandingRemoved ?? false,
      },
    });
  },

  /**
   * Find subscription by organization ID
   */
  findByOrganizationId: async (organizationId: string): Promise<Subscription | null> => {
    return prisma.subscription.findUnique({
      where: { organizationId },
    });
  },

  /**
   * Find subscription by Mollie subscription ID
   */
  findByMollieSubscriptionId: async (mollieSubscriptionId: string): Promise<Subscription | null> => {
    return prisma.subscription.findUnique({
      where: { mollieSubscriptionId },
    });
  },

  /**
   * Update a subscription
   */
  update: async (id: string, data: UpdateSubscriptionInput): Promise<Subscription> => {
    return prisma.subscription.update({
      where: { id },
      data,
    });
  },

  /**
   * Update subscription by organization ID
   */
  updateByOrganizationId: async (
    organizationId: string,
    data: UpdateSubscriptionInput
  ): Promise<Subscription> => {
    return prisma.subscription.update({
      where: { organizationId },
      data,
    });
  },

  /**
   * Delete a subscription
   */
  delete: async (id: string): Promise<void> => {
    await prisma.subscription.delete({
      where: { id },
    });
  },

  // ==========================================================================
  // USAGE RECORDS
  // ==========================================================================

  /**
   * Create or get usage record for current period
   */
  getOrCreateUsageRecord: async (
    organizationId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<UsageRecord> => {
    const existing = await prisma.usageRecord.findUnique({
      where: {
        organizationId_periodStart_periodEnd: {
          organizationId,
          periodStart,
          periodEnd,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return prisma.usageRecord.create({
      data: {
        organizationId,
        periodStart,
        periodEnd,
        ticketsSold: 0,
        overageTickets: 0,
        overageFeeTotal: 0,
      },
    });
  },

  /**
   * Find usage record for a specific period
   */
  findUsageRecord: async (
    organizationId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<UsageRecord | null> => {
    return prisma.usageRecord.findUnique({
      where: {
        organizationId_periodStart_periodEnd: {
          organizationId,
          periodStart,
          periodEnd,
        },
      },
    });
  },

  /**
   * Find the current usage record (period that contains today)
   */
  findCurrentUsageRecord: async (organizationId: string): Promise<UsageRecord | null> => {
    const now = new Date();
    return prisma.usageRecord.findFirst({
      where: {
        organizationId,
        periodStart: { lte: now },
        periodEnd: { gt: now },
      },
    });
  },

  /**
   * Increment tickets sold in usage record
   */
  incrementTicketsSold: async (
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
    quantity: number,
    overageTickets: number,
    overageFeeTotal: number
  ): Promise<UsageRecord> => {
    return prisma.usageRecord.upsert({
      where: {
        organizationId_periodStart_periodEnd: {
          organizationId,
          periodStart,
          periodEnd,
        },
      },
      create: {
        organizationId,
        periodStart,
        periodEnd,
        ticketsSold: quantity,
        overageTickets,
        overageFeeTotal,
      },
      update: {
        ticketsSold: { increment: quantity },
        overageTickets: { increment: overageTickets },
        overageFeeTotal: { increment: overageFeeTotal },
      },
    });
  },

  /**
   * Get usage records for an organization (with pagination)
   */
  findUsageRecordsByOrganization: async (
    organizationId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<UsageRecord[]> => {
    return prisma.usageRecord.findMany({
      where: { organizationId },
      orderBy: { periodStart: "desc" },
      take: options?.limit ?? 12,
      skip: options?.offset ?? 0,
    });
  },

  // ==========================================================================
  // INVOICES
  // ==========================================================================

  /**
   * Create a subscription invoice
   */
  createInvoice: async (data: CreateInvoiceInput): Promise<SubscriptionInvoice> => {
    return prisma.subscriptionInvoice.create({
      data: {
        organizationId: data.organizationId,
        subscriptionId: data.subscriptionId,
        type: data.type,
        amount: data.amount,
        description: data.description,
        molliePaymentId: data.molliePaymentId,
        status: "PENDING",
      },
    });
  },

  /**
   * Find invoice by ID
   */
  findInvoiceById: async (id: string): Promise<SubscriptionInvoice | null> => {
    return prisma.subscriptionInvoice.findUnique({
      where: { id },
    });
  },

  /**
   * Find invoice by Mollie payment ID
   */
  findInvoiceByMolliePaymentId: async (
    molliePaymentId: string
  ): Promise<SubscriptionInvoice | null> => {
    return prisma.subscriptionInvoice.findUnique({
      where: { molliePaymentId },
    });
  },

  /**
   * Update invoice status
   */
  updateInvoiceStatus: async (
    id: string,
    status: InvoiceStatus,
    paidAt?: Date
  ): Promise<SubscriptionInvoice> => {
    return prisma.subscriptionInvoice.update({
      where: { id },
      data: {
        status,
        paidAt,
      },
    });
  },

  /**
   * Get invoices for an organization
   */
  findInvoicesByOrganization: async (
    organizationId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: InvoiceStatus;
      type?: InvoiceType;
    }
  ): Promise<SubscriptionInvoice[]> => {
    return prisma.subscriptionInvoice.findMany({
      where: {
        organizationId,
        ...(options?.status && { status: options.status }),
        ...(options?.type && { type: options.type }),
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });
  },

  /**
   * Get pending invoices for an organization
   */
  findPendingInvoices: async (organizationId: string): Promise<SubscriptionInvoice[]> => {
    return prisma.subscriptionInvoice.findMany({
      where: {
        organizationId,
        status: "PENDING",
      },
      orderBy: { createdAt: "asc" },
    });
  },

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Count active subscriptions by plan
   */
  countByPlan: async (): Promise<Record<PricingPlan, number>> => {
    const counts = await prisma.subscription.groupBy({
      by: ["plan"],
      where: { status: "ACTIVE" },
      _count: true,
    });

    const result: Record<PricingPlan, number> = {
      NON_PROFIT: 0,
      PAY_PER_EVENT: 0,
      ORGANIZER: 0,
      PRO_ORGANIZER: 0,
    };

    for (const count of counts) {
      result[count.plan] = count._count;
    }

    return result;
  },

  /**
   * Calculate MRR (Monthly Recurring Revenue) from active subscriptions
   */
  calculateMRR: async (): Promise<number> => {
    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        plan: { in: ["ORGANIZER", "PRO_ORGANIZER"] },
      },
      select: { plan: true },
    });

    // Import plan limits to get monthly prices
    const { PLAN_LIMITS } = await import("@/server/domain/plans");

    return subscriptions.reduce((total, sub) => {
      const planLimits = PLAN_LIMITS[sub.plan];
      return total + (planLimits.monthlyPrice ?? 0);
    }, 0);
  },
};
