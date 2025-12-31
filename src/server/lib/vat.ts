/**
 * VAT/BTW utility functions for Dutch tax rates
 *
 * All prices are stored in cents (Int)
 * All calculations use Math.round() to nearest cent
 */

export type VatRate = "STANDARD_21" | "REDUCED_9" | "EXEMPT";

/**
 * VAT rate percentages as decimals
 */
export const VAT_RATES: Record<VatRate, number> = {
  STANDARD_21: 0.21,
  REDUCED_9: 0.09,
  EXEMPT: 0.0,
};

/**
 * VAT rate display labels (Dutch)
 */
export const VAT_RATE_LABELS: Record<VatRate, string> = {
  STANDARD_21: "21% (standaard tarief)",
  REDUCED_9: "9% (verlaagd tarief)",
  EXEMPT: "0% (vrijgesteld)",
};

/**
 * Service fee always uses 21% VAT (platform service)
 */
export const SERVICE_FEE_VAT_RATE = 0.21;

/**
 * ============================================================================
 * SERVICE FEE VAT CALCULATION
 * ============================================================================
 *
 * The service fee charged to buyers has two components:
 *
 * 1. MOLLIE FEE (€0.29 excl. VAT): Payment processing fee
 *    - Subject to 21% Dutch VAT
 *    - Total: €0.29 + €0.06 VAT = €0.35 incl. VAT
 *
 * 2. PLATFORM FEE (€0.15 fixed + 2% variable, excl. VAT): Platform service
 *    - Subject to 21% Dutch VAT
 *    - This is the platform's revenue
 *
 * CALCULATION FLOW:
 * ------------------
 * Example with €50.00 ticket purchase:
 *
 * Step 1: Calculate Mollie fee (with VAT)
 *   - Mollie base: €0.29
 *   - VAT (21%): €0.06
 *   - Mollie total: €0.35
 *
 * Step 2: Calculate platform fee (excl. VAT)
 *   - Fixed portion: €0.15
 *   - Variable portion: €50.00 × 2% = €1.00
 *   - Platform fee excl VAT: €0.15 + €1.00 = €1.15
 *
 * Step 3: Add 21% VAT to platform portion
 *   - VAT amount: €1.15 × 21% = €0.24
 *   - Platform fee incl VAT: €1.15 + €0.24 = €1.39
 *
 * Step 4: Total service fee to buyer
 *   - Mollie fee incl VAT: €0.35
 *   - Platform fee incl VAT: €1.39
 *   - TOTAL SERVICE FEE: €1.74
 *
 * BUYER SEES:
 *   "Servicekosten (incl. betalingskosten): €1.74"
 *
 * ACCOUNTING BREAKDOWN:
 *   - Mollie fee excl VAT: €0.29
 *   - Mollie VAT (21%): €0.06
 *   - Platform fee excl VAT: €1.15
 *   - Platform VAT (21%): €0.24
 *   - Service fee excl VAT total: €0.29 + €1.15 = €1.44
 *   - Service fee VAT total: €0.06 + €0.24 = €0.30
 *   - Service fee incl VAT total: €1.74
 */

/**
 * Mollie transaction fee in cents (excl. VAT)
 * With 21% VAT: €0.29 + €0.06 = €0.35 total
 */
export const MOLLIE_FEE_EXCL_VAT = 29; // €0.29

/**
 * Platform fixed fee component (excl. VAT) in cents
 * This is part of the €0.50 total fixed fee
 * Calculation: €0.50 total - €0.29 Mollie excl VAT = €0.21 platform excl VAT
 */
export const PLATFORM_FIXED_FEE_EXCL_VAT = 21; // €0.21

/**
 * Platform variable fee percentage (excl. VAT)
 */
export const PLATFORM_VARIABLE_FEE_PERCENTAGE = 0.02; // 2%

/**
 * Platform fee always uses 21% VAT
 */
export const PLATFORM_FEE_VAT_RATE = 0.21;

/**
 * Calculate VAT amount from a VAT-inclusive price
 *
 * @param priceInclVat - Price including VAT (cents)
 * @param vatRate - VAT rate enum
 * @returns VAT amount (cents)
 *
 * @example
 * calcVatFromInclusive(1000, "STANDARD_21") // returns 174 (€10.00 → €1.74 VAT)
 */
export function calcVatFromInclusive(
  priceInclVat: number,
  vatRate: VatRate
): number {
  const rate = VAT_RATES[vatRate];
  if (rate === 0) return 0;

  // VAT = price_incl × (rate / (1 + rate))
  return Math.round(priceInclVat * (rate / (1 + rate)));
}

/**
 * Calculate price excluding VAT from a VAT-inclusive price
 *
 * @param priceInclVat - Price including VAT (cents)
 * @param vatRate - VAT rate enum
 * @returns Price excluding VAT (cents)
 *
 * @example
 * calcPriceExclVat(1000, "STANDARD_21") // returns 826 (€10.00 → €8.26 excl VAT)
 */
export function calcPriceExclVat(
  priceInclVat: number,
  vatRate: VatRate
): number {
  const vatAmount = calcVatFromInclusive(priceInclVat, vatRate);
  return priceInclVat - vatAmount;
}

/**
 * Calculate VAT amount from a price excluding VAT
 *
 * @param priceExclVat - Price excluding VAT (cents)
 * @param vatRate - VAT rate enum
 * @returns VAT amount (cents)
 *
 * @example
 * calcVatAmount(826, "STANDARD_21") // returns 174 (€8.26 → €1.74 VAT)
 */
export function calcVatAmount(priceExclVat: number, vatRate: VatRate): number {
  const rate = VAT_RATES[vatRate];
  return Math.round(priceExclVat * rate);
}

/**
 * Calculate price including VAT from a price excluding VAT
 *
 * @param priceExclVat - Price excluding VAT (cents)
 * @param vatRate - VAT rate enum
 * @returns Price including VAT (cents)
 *
 * @example
 * calcPriceInclVat(826, "STANDARD_21") // returns 1000 (€8.26 → €10.00 incl VAT)
 */
export function calcPriceInclVat(priceExclVat: number, vatRate: VatRate): number {
  const vatAmount = calcVatAmount(priceExclVat, vatRate);
  return priceExclVat + vatAmount;
}

/**
 * Breakdown of price components including VAT
 */
export interface PriceBreakdown {
  priceInclVat: number;
  priceExclVat: number;
  vatAmount: number;
  vatRate: VatRate;
}

/**
 * Get complete price breakdown from VAT-inclusive price
 *
 * @param priceInclVat - Price including VAT (cents)
 * @param vatRate - VAT rate enum
 * @returns Complete breakdown
 */
export function getPriceBreakdown(
  priceInclVat: number,
  vatRate: VatRate
): PriceBreakdown {
  const vatAmount = calcVatFromInclusive(priceInclVat, vatRate);
  const priceExclVat = priceInclVat - vatAmount;

  return {
    priceInclVat,
    priceExclVat,
    vatAmount,
    vatRate,
  };
}

/**
 * Calculate complete service fee breakdown with proper VAT handling
 *
 * @param ticketTotal - Total ticket sales in cents (excl. service fee)
 * @returns Complete breakdown of service fee components
 */
export function calculateServiceFeeWithVat(ticketTotal: number): {
  // Mollie component (with VAT)
  mollieFeeExclVat: number;
  mollieFeeVat: number;
  mollieFeeInclVat: number;

  // Platform component
  platformFeeExclVat: number;
  platformFeeVat: number;
  platformFeeInclVat: number;

  // Totals
  serviceFeeExclVat: number; // Mollie + Platform excl VAT
  serviceFeeVat: number;      // Mollie VAT + Platform VAT
  serviceFeeInclVat: number;  // Total charged to buyer
} {
  if (ticketTotal === 0) {
    return {
      mollieFeeExclVat: 0,
      mollieFeeVat: 0,
      mollieFeeInclVat: 0,
      platformFeeExclVat: 0,
      platformFeeVat: 0,
      platformFeeInclVat: 0,
      serviceFeeExclVat: 0,
      serviceFeeVat: 0,
      serviceFeeInclVat: 0,
    };
  }

  // 1. Mollie fee (fixed, with 21% VAT)
  const mollieFeeExclVat = MOLLIE_FEE_EXCL_VAT;
  const mollieFeeVat = Math.round(mollieFeeExclVat * SERVICE_FEE_VAT_RATE);
  const mollieFeeInclVat = mollieFeeExclVat + mollieFeeVat;

  // 2. Platform fee (excl. VAT): fixed + percentage
  const platformFeeExclVat =
    PLATFORM_FIXED_FEE_EXCL_VAT +
    Math.round(ticketTotal * PLATFORM_VARIABLE_FEE_PERCENTAGE);

  // 3. Platform VAT (21%)
  const platformFeeVat = Math.round(platformFeeExclVat * PLATFORM_FEE_VAT_RATE);

  // 4. Platform fee including VAT
  const platformFeeInclVat = platformFeeExclVat + platformFeeVat;

  // 5. Total service fee components
  const serviceFeeExclVat = mollieFeeExclVat + platformFeeExclVat;
  const serviceFeeVat = mollieFeeVat + platformFeeVat; // Both portions have VAT
  const serviceFeeInclVat = mollieFeeInclVat + platformFeeInclVat;

  return {
    mollieFeeExclVat,
    mollieFeeVat,
    mollieFeeInclVat,
    platformFeeExclVat,
    platformFeeVat,
    platformFeeInclVat,
    serviceFeeExclVat,
    serviceFeeVat,
    serviceFeeInclVat,
  };
}


/**
 * Validate VAT rate enum
 */
export function isValidVatRate(rate: string): rate is VatRate {
  return rate in VAT_RATES;
}
