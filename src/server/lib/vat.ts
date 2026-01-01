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
 * Validate VAT rate enum
 */
export function isValidVatRate(rate: string): rate is VatRate {
  return rate in VAT_RATES;
}
