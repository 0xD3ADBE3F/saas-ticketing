import createMollieClient from "@mollie/api-client";
import { mollieConnectService } from "./mollieConnectService";

/**
 * Mollie Settlement types
 */
interface MollieAmount {
  currency: string;
  value: string;
}

interface MolliePeriod {
  year: number;
  month: number;
}

interface MollieSettlement {
  resource: "settlement";
  id: string;
  reference: string;
  createdAt: string;
  settledAt: string | null;
  status: "open" | "pending" | "paidout" | "failed";
  amount: MollieAmount;
  periods: Record<string, Record<string, MolliePeriodRevenue>>;
  invoiceId: string | null;
  _links: {
    self: { href: string };
    payments: { href: string };
    refunds: { href: string };
    chargebacks: { href: string };
  };
}

interface MolliePeriodRevenue {
  revenue: MollieRevenueItem[];
  costs: MollieCostItem[];
  invoiceId?: string;
}

interface MollieRevenueItem {
  description: string;
  method: string;
  count: number;
  amountNet: MollieAmount;
  amountVat: MollieAmount | null;
  amountGross: MollieAmount;
}

interface MollieCostItem {
  description: string;
  method: string;
  count: number;
  rate: {
    fixed: MollieAmount;
    percentage: string | null;
  };
  amountNet: MollieAmount;
  amountVat: MollieAmount | null;
  amountGross: MollieAmount;
}

interface MollieBalance {
  resource: "balance";
  id: string;
  mode: "live" | "test";
  createdAt: string;
  currency: string;
  status: "active" | "inactive";
  availableAmount: MollieAmount;
  pendingAmount: MollieAmount;
  transferFrequency: "daily" | "twice-a-week" | "every-monday" | "every-tuesday" | "every-wednesday" | "every-thursday" | "every-friday" | "monthly" | "never";
  transferThreshold: MollieAmount;
  transferReference: string;
  transferDestination: {
    type: "bank-account";
    beneficiaryName: string;
    bankAccount: string;
    bankAccountId: string;
  };
  _links: {
    self: { href: string };
  };
}

interface MollieBalanceReport {
  resource: "balance-report";
  balanceId: string;
  timeZone: string;
  from: string;
  until: string;
  grouping: "transaction-categories" | "status-balances";
  totals: {
    open?: MollieBalanceSubtotals;
    pending?: MollieBalanceSubtotals;
    available?: MollieBalanceSubtotals;
  };
  _links: {
    self: { href: string };
  };
}

interface MollieBalanceSubtotals {
  subtotals: MollieBalanceSubtotal[];
}

interface MollieBalanceSubtotal {
  transactionType?: string;
  method?: string;
  count: number;
  amount: MollieAmount;
  subtotals?: MollieBalanceSubtotal[];
}

/**
 * Our parsed settlement data
 */
export interface Settlement {
  id: string;
  reference: string;
  status: "open" | "pending" | "paidout" | "failed";
  amount: {
    currency: string;
    value: number;
  };
  settledAt: Date | null;
  createdAt: Date;
}

export interface SettlementDetails extends Settlement {
  periods: SettlementPeriod[];
}

export interface SettlementPeriod {
  year: number;
  month: number;
  revenue: {
    description: string;
    method: string;
    count: number;
    net: number;
    gross: number;
  }[];
  costs: {
    description: string;
    method: string;
    count: number;
    net: number;
    gross: number;
  }[];
}

export interface Balance {
  id: string;
  currency: string;
  status: "active" | "inactive";
  availableAmount: number;
  pendingAmount: number;
  transferFrequency: string;
}

export interface BalanceReport {
  balanceId: string;
  from: Date;
  until: Date;
  open: number;
  pending: number;
  available: number;
  transactionSummary: {
    type: string;
    count: number;
    amount: number;
  }[];
}

/**
 * Parse Mollie amount string to cents
 */
function parseAmount(amount: MollieAmount): number {
  return Math.round(parseFloat(amount.value) * 100);
}

/**
 * Mollie Settlement Service
 * Provides access to settlement and balance data for connected organizations
 */
export const mollieSettlementService = {
  /**
   * Get list of settlements for an organization
   */
  async listSettlements(
    organizationId: string,
    options?: {
      from?: string;
      limit?: number;
    }
  ): Promise<{ settlements: Settlement[]; hasMore: boolean }> {
    const accessToken = await mollieConnectService.getValidToken(organizationId);

    const client = createMollieClient({ accessToken });

    const params: Record<string, string> = {};
    if (options?.from) params.from = options.from;
    if (options?.limit) params.limit = options.limit.toString();

    const response = await client.settlements.page(params);

    const settlements: Settlement[] = response.map((s) => ({
      id: s.id,
      reference: s.reference,
      status: s.status as Settlement["status"],
      amount: {
        currency: s.amount.currency,
        value: parseAmount(s.amount),
      },
      settledAt: s.settledAt ? new Date(s.settledAt) : null,
      createdAt: new Date(s.createdAt),
    }));

    return {
      settlements,
      hasMore: response.nextPageCursor !== undefined,
    };
  },

  /**
   * Get details of a specific settlement
   */
  async getSettlement(
    organizationId: string,
    settlementId: string
  ): Promise<SettlementDetails | null> {
    const accessToken = await mollieConnectService.getValidToken(organizationId);

    const client = createMollieClient({ accessToken });

    try {
      const settlement = await client.settlements.get(settlementId);

      // Parse periods from raw response (not directly available in SDK types)
      const raw = settlement as unknown as MollieSettlement;
      const periods: SettlementPeriod[] = [];

      if (raw.periods) {
        for (const [year, months] of Object.entries(raw.periods)) {
          for (const [month, data] of Object.entries(months)) {
            periods.push({
              year: parseInt(year),
              month: parseInt(month),
              revenue: data.revenue.map((r) => ({
                description: r.description,
                method: r.method,
                count: r.count,
                net: parseAmount(r.amountNet),
                gross: parseAmount(r.amountGross),
              })),
              costs: data.costs.map((c) => ({
                description: c.description,
                method: c.method,
                count: c.count,
                net: parseAmount(c.amountNet),
                gross: parseAmount(c.amountGross),
              })),
            });
          }
        }
      }

      return {
        id: settlement.id,
        reference: settlement.reference,
        status: settlement.status as Settlement["status"],
        amount: {
          currency: settlement.amount.currency,
          value: parseAmount(settlement.amount),
        },
        settledAt: settlement.settledAt ? new Date(settlement.settledAt) : null,
        createdAt: new Date(settlement.createdAt),
        periods,
      };
    } catch (error) {
      console.error("Failed to get settlement:", error);
      return null;
    }
  },

  /**
   * Get open (next) settlement for an organization
   */
  async getOpenSettlement(organizationId: string): Promise<Settlement | null> {
    const accessToken = await mollieConnectService.getValidToken(organizationId);

    try {
      // Get the open settlement (next payout)
      const response = await fetch("https://api.mollie.com/v2/settlements/open", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // No open settlement
        }
        throw new Error(`Failed to get open settlement: ${response.status}`);
      }

      const settlement: MollieSettlement = await response.json();

      return {
        id: settlement.id,
        reference: settlement.reference,
        status: settlement.status,
        amount: {
          currency: settlement.amount.currency,
          value: parseAmount(settlement.amount),
        },
        settledAt: settlement.settledAt ? new Date(settlement.settledAt) : null,
        createdAt: new Date(settlement.createdAt),
      };
    } catch (error) {
      console.error("Failed to get open settlement:", error);
      return null;
    }
  },

  /**
   * Get primary balance for an organization
   */
  async getPrimaryBalance(organizationId: string): Promise<Balance | null> {
    const accessToken = await mollieConnectService.getValidToken(organizationId);

    try {
      // Get balances list
      const response = await fetch("https://api.mollie.com/v2/balances", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get balances: ${response.status}`);
      }

      const data = await response.json();
      const balances: MollieBalance[] = data._embedded?.balances || [];

      // Find primary/active balance
      const primaryBalance = balances.find((b) => b.status === "active");
      if (!primaryBalance) {
        return null;
      }

      return {
        id: primaryBalance.id,
        currency: primaryBalance.currency,
        status: primaryBalance.status,
        availableAmount: parseAmount(primaryBalance.availableAmount),
        pendingAmount: parseAmount(primaryBalance.pendingAmount),
        transferFrequency: primaryBalance.transferFrequency,
      };
    } catch (error) {
      console.error("Failed to get primary balance:", error);
      return null;
    }
  },

  /**
   * Get balance report for a specific period
   */
  async getBalanceReport(
    organizationId: string,
    balanceId: string,
    from: Date,
    until: Date
  ): Promise<BalanceReport | null> {
    const accessToken = await mollieConnectService.getValidToken(organizationId);

    try {
      const params = new URLSearchParams({
        from: from.toISOString().split("T")[0],
        until: until.toISOString().split("T")[0],
        grouping: "transaction-categories",
      });

      const response = await fetch(
        `https://api.mollie.com/v2/balances/${balanceId}/report?${params}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get balance report: ${response.status}`);
      }

      const report: MollieBalanceReport = await response.json();

      // Parse transaction summary from totals
      const transactionSummary: BalanceReport["transactionSummary"] = [];

      const parseSubtotals = (subtotals?: MollieBalanceSubtotal[]) => {
        if (!subtotals) return;
        for (const sub of subtotals) {
          if (sub.transactionType) {
            transactionSummary.push({
              type: sub.transactionType,
              count: sub.count,
              amount: parseAmount(sub.amount),
            });
          }
          if (sub.subtotals) {
            parseSubtotals(sub.subtotals);
          }
        }
      };

      if (report.totals.available?.subtotals) {
        parseSubtotals(report.totals.available.subtotals);
      }

      return {
        balanceId: report.balanceId,
        from: new Date(report.from),
        until: new Date(report.until),
        open: report.totals.open?.subtotals?.reduce(
          (sum, s) => sum + parseAmount(s.amount),
          0
        ) || 0,
        pending: report.totals.pending?.subtotals?.reduce(
          (sum, s) => sum + parseAmount(s.amount),
          0
        ) || 0,
        available: report.totals.available?.subtotals?.reduce(
          (sum, s) => sum + parseAmount(s.amount),
          0
        ) || 0,
        transactionSummary,
      };
    } catch (error) {
      console.error("Failed to get balance report:", error);
      return null;
    }
  },

  /**
   * Get settlement payments (all payments in a settlement)
   */
  async getSettlementPayments(
    organizationId: string,
    settlementId: string,
    options?: {
      from?: string;
      limit?: number;
    }
  ): Promise<{
    payments: {
      id: string;
      description: string;
      amount: number;
      settlementAmount: number;
      createdAt: Date;
    }[];
    hasMore: boolean;
  }> {
    const accessToken = await mollieConnectService.getValidToken(organizationId);

    try {
      const params = new URLSearchParams();
      if (options?.from) params.set("from", options.from);
      if (options?.limit) params.set("limit", options.limit.toString());

      const response = await fetch(
        `https://api.mollie.com/v2/settlements/${settlementId}/payments?${params}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get settlement payments: ${response.status}`);
      }

      const data = await response.json();
      const payments = data._embedded?.payments || [];

      return {
        payments: payments.map((p: any) => ({
          id: p.id,
          description: p.description,
          amount: parseAmount(p.amount),
          settlementAmount: p.settlementAmount
            ? parseAmount(p.settlementAmount)
            : parseAmount(p.amount),
          createdAt: new Date(p.createdAt),
        })),
        hasMore: data._links?.next !== undefined,
      };
    } catch (error) {
      console.error("Failed to get settlement payments:", error);
      return { payments: [], hasMore: false };
    }
  },
};
