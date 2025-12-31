import { prisma } from "@/server/lib/prisma";
import type { Event } from "@/generated/prisma";

// Flat 2% platform fee for all organizations
const PLATFORM_FEE_BPS = 200; // 2% in basis points

export type FeeCalculation = {
  platformFeeBps: number; // Basis points (200 = 2%)
  platformFeePercent: number; // Percentage (2.0 = 2%)
};

export type PayoutFeeBreakdown = {
  grossRevenue: number; // Total ticket revenue in cents
  platformFee: number; // Platform fee in cents
  netPayout: number; // Amount to pay out in cents
};

/**
 * Service for calculating fees (platform fee)
 * Simple flat 2% platform fee for all organizations
 */
export const feeService = {
  /**
   * Get the platform fee (flat 2% for all)
   */
  getPlatformFee: (): FeeCalculation => {
    return {
      platformFeeBps: PLATFORM_FEE_BPS,
      platformFeePercent: PLATFORM_FEE_BPS / 100,
    };
  },

  /**
   * Calculate payout breakdown for an event or order
   */
  calculatePayoutFees: (
    grossRevenue: number
  ): PayoutFeeBreakdown => {
    const feeCalc = feeService.getPlatformFee();

    // Platform fee: 2% of gross revenue
    const platformFee = Math.round(grossRevenue * (feeCalc.platformFeeBps / 10000));

    const netPayout = grossRevenue - platformFee;

    return {
      grossRevenue,
      platformFee,
      netPayout,
    };
  },
};
