/**
 * Fee Calculation Service
 *
 * Single source of truth for all fee calculations in the Entro platform.
 * Handles service fees, payment fees, platform fees, and VAT calculations.
 *
 * PRECISION: All internal amounts stored in cents (integer) for consistency with DB.
 * Payment fee has exact incl VAT constant to avoid rounding (€0.32 * 1.21 = €0.3872).
 */

import {
  MOLLIE_FEE_EXCL_VAT,
  MOLLIE_FEE_INCL_VAT,
  PLATFORM_FIXED_FEE_EXCL_VAT,
  PLATFORM_VARIABLE_FEE_PERCENTAGE,
  VAT_RATE,
} from "@/lib/fee-constants";

// Re-export constants for backward compatibility
export {
  MOLLIE_FEE_EXCL_VAT,
  MOLLIE_FEE_INCL_VAT,
  PLATFORM_FIXED_FEE_EXCL_VAT,
  PLATFORM_VARIABLE_FEE_PERCENTAGE,
  VAT_RATE,
};

// =============================================================================
// TYPES
// =============================================================================

/**
 * Complete breakdown of service fee components
 */
export interface ServiceFeeBreakdown {
  // Platform revenue (fixed + variable)
  platformFeeExclVat: number;
  platformFeeVat: number;
  platformFeeInclVat: number;

  // Total service fee (what buyer pays)
  serviceFeeExclVat: number;
  serviceFeeVat: number;
  serviceFeeInclVat: number;
}

/**
 * Complete breakdown of payment fee (Mollie)
 */
export interface PaymentFeeBreakdown {
  paymentFeeExclVat: number;
  paymentFeeVat: number;
  paymentFeeInclVat: number;
  paymentMethod: string;
}

/**
 * Complete order fee breakdown
 */
export interface OrderFeeBreakdown {
  // Ticket subtotal
  ticketTotal: number;

  // Service fee (always charged on paid orders)
  serviceFee: ServiceFeeBreakdown;

  // Payment fee (optional, only if event passes fees to buyer)
  paymentFee?: PaymentFeeBreakdown;

  // Grand total
  totalAmount: number;
}

/**
 * Payout fee breakdown for organizers
 */
export interface PayoutFeeBreakdown {
  grossRevenue: number; // Total ticket revenue in cents
  platformFee: number; // Platform fee in cents (2%)
  netPayout: number; // Amount to pay out in cents
}

// =============================================================================
// SERVICE FEE CALCULATION
// =============================================================================

/**
 * Calculate service fee with complete breakdown
 *
 * Service fee = Platform fixed fee + Platform variable fee (both with 21% VAT)
 *
 * Structure:
 * - Platform fixed: €0.35 excl. VAT → €0.42 incl. VAT
 * - Platform variable: 2% of ticket total (with VAT)
 *
 * Example (€50.00 ticket):
 * - Platform fixed: €0.35 excl + €0.07 VAT = €0.42
 * - Platform variable: €1.00 excl + €0.21 VAT = €1.21
 * - Total service fee: €1.63
 *
 * @param ticketTotal - Ticket subtotal in cents
 * @returns Complete breakdown with VAT
 */
export function calculateServiceFee(ticketTotal: number): ServiceFeeBreakdown {
  // Free orders have no service fee
  if (ticketTotal === 0) {
    return {
      platformFeeExclVat: 0,
      platformFeeVat: 0,
      platformFeeInclVat: 0,
      serviceFeeExclVat: 0,
      serviceFeeVat: 0,
      serviceFeeInclVat: 0,
    };
  }

  // Calculate platform fee components (excl. VAT)
  const platformFixedExclVat = PLATFORM_FIXED_FEE_EXCL_VAT;
  const platformVariableExclVat = Math.round(ticketTotal * PLATFORM_VARIABLE_FEE_PERCENTAGE);
  const platformFeeExclVat = platformFixedExclVat + platformVariableExclVat;

  // Calculate VAT on platform fee
  const platformFeeVat = Math.round(platformFeeExclVat * VAT_RATE);
  const platformFeeInclVat = platformFeeExclVat + platformFeeVat;

  // Service fee = Platform fee (for now, no separate components)
  return {
    platformFeeExclVat,
    platformFeeVat,
    platformFeeInclVat,
    serviceFeeExclVat: platformFeeExclVat,
    serviceFeeVat: platformFeeVat,
    serviceFeeInclVat: platformFeeInclVat,
  };
}

// =============================================================================
// PAYMENT FEE CALCULATION
// =============================================================================

/**
 * Calculate payment processing fee with VAT
 *
 * This is the Mollie fee that can optionally be passed to the buyer.
 *
 * Structure:
 * - Mollie fee: €0.32 excl. VAT = 32 cents
 * - VAT (21%): €0.0672 = 6.72 cents
 * - Total: €0.3872 = 38.72 cents (EXACT, stored as decimal)
 *
 * NOTE: Returns decimal value 38.72 for precision. Convert to cents only
 * when storing in database or displaying (rounding may be needed).
 *
 * @param paymentMethod - Payment method identifier (default: "ideal")
 * @returns Complete breakdown with VAT (paymentFeeInclVat is decimal)
 */
export function calculatePaymentFee(paymentMethod: string = "ideal"): PaymentFeeBreakdown {
  const paymentFeeExclVat = MOLLIE_FEE_EXCL_VAT;
  const paymentFeeVat = 6.72; // Exact: 32 * 0.21 = 6.72
  const paymentFeeInclVat = MOLLIE_FEE_INCL_VAT; // 38.72 exact

  return {
    paymentFeeExclVat,
    paymentFeeVat,
    paymentFeeInclVat,
    paymentMethod,
  };
}

/**
 * Check if payment fee should be applied to an order
 *
 * Conditions:
 * - Event has toggle enabled
 * - Order total > 0 (free orders skip all fees)
 *
 * @param passPaymentFeesToBuyer - Event setting
 * @param ticketTotal - Ticket subtotal in cents
 * @returns True if payment fee should be charged
 */
export function shouldApplyPaymentFee(
  passPaymentFeesToBuyer: boolean,
  ticketTotal: number
): boolean {
  return passPaymentFeesToBuyer && ticketTotal > 0;
}

// =============================================================================
// COMPLETE ORDER FEE CALCULATION
// =============================================================================

/**
 * Calculate complete fee breakdown for an order
 *
 * This is the main function used by orderService to calculate all fees.
 *
 * @param ticketTotal - Ticket subtotal in cents
 * @param passPaymentFeesToBuyer - Whether to include payment fee
 * @returns Complete breakdown of all fees and total
 *
 * @example
 * // Order with €50.00 ticket, payment fees NOT passed to buyer
 * calculateOrderFees(5000, false)
 * // Returns: { ticketTotal: 5000, serviceFee: {...}, totalAmount: 5163 }
 *
 * @example
 * // Order with €50.00 ticket, payment fees passed to buyer
 * calculateOrderFees(5000, true)
 * // Returns: { ticketTotal: 5000, serviceFee: {...}, paymentFee: {...}, totalAmount: 5202 }
 */
export function calculateOrderFees(
  ticketTotal: number,
  passPaymentFeesToBuyer: boolean = false
): OrderFeeBreakdown {
  // Calculate service fee (always charged on paid orders)
  const serviceFee = calculateServiceFee(ticketTotal);

  // Calculate payment fee (optional)
  const paymentFee = shouldApplyPaymentFee(passPaymentFeesToBuyer, ticketTotal)
    ? calculatePaymentFee()
    : undefined;

  // Calculate total
  const totalAmount =
    ticketTotal +
    serviceFee.serviceFeeInclVat +
    (paymentFee?.paymentFeeInclVat || 0);

  return {
    ticketTotal,
    serviceFee,
    paymentFee,
    totalAmount,
  };
}

// =============================================================================
// PLATFORM FEE FOR PAYOUT CALCULATION
// =============================================================================

/**
 * Calculate platform fee to deduct from organizer payout
 *
 * This is the 2% platform revenue per ticket sold.
 * This is separate from the service fee charged to buyers.
 *
 * @param ticketTotal - Total ticket revenue in cents
 * @returns Platform fee amount in cents (2% of tickets)
 */
export function calculatePlatformFeeForPayout(ticketTotal: number): number {
  return Math.round(ticketTotal * PLATFORM_VARIABLE_FEE_PERCENTAGE);
}

/**
 * Calculate payout breakdown for an organizer
 *
 * @param grossRevenue - Total ticket revenue in cents
 * @returns Complete payout breakdown
 */
export function calculatePayoutFees(grossRevenue: number): PayoutFeeBreakdown {
  const platformFee = calculatePlatformFeeForPayout(grossRevenue);
  const netPayout = grossRevenue - platformFee;

  return {
    grossRevenue,
    platformFee,
    netPayout,
  };
}

// =============================================================================
// CONVERSION HELPERS
// =============================================================================

/**
 * Convert decimal cents to Mollie API format (2 decimal places)
 *
 * Examples:
 * - 38.72 → "0.39" (rounded)
 * - 1052.7 → "10.53"
 *
 * @param decimalCents - Amount in cents (can be decimal)
 * @returns Formatted string for Mollie API (euros with 2 decimals)
 */
export function toMollieAmount(decimalCents: number): string {
  const euros = decimalCents / 100;
  return euros.toFixed(2);
}

/**
 * Get payment fee for Mollie API (rounded to cents)
 *
 * Returns 39 cents (€0.39) for Mollie API compatibility.
 * Use calculatePaymentFee() for exact 38.72 cents in internal calculations.
 *
 * @returns Payment fee in cents, rounded for API
 */
export function getPaymentFeeForMollieAPI(): number {
  return Math.round(MOLLIE_FEE_INCL_VAT); // 39 cents
}

