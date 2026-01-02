/**
 * Client-side fee calculations
 *
 * These mirror the server-side fee calculations but can be used on the client
 * to provide instant feedback without API calls. The server MUST still validate
 * all fee calculations before processing payments.
 */

import {
  PLATFORM_FIXED_FEE_EXCL_VAT,
  PLATFORM_VARIABLE_FEE_PERCENTAGE,
  VAT_RATE,
  MOLLIE_FEE_EXCL_VAT,
} from "./fee-constants";

/**
 * Calculate service fee breakdown (client-side preview)
 *
 * @param ticketTotal - Ticket subtotal in cents
 * @returns Service fee breakdown with VAT
 */
export function calculateServiceFeePreview(ticketTotal: number): {
  serviceFeeInclVat: number;
  serviceFeeExclVat: number;
  serviceFeeVat: number;
} {
  // Free orders have no service fee
  if (ticketTotal === 0) {
    return {
      serviceFeeInclVat: 0,
      serviceFeeExclVat: 0,
      serviceFeeVat: 0,
    };
  }

  // Calculate platform fee components (excl. VAT)
  const platformFixedExclVat = PLATFORM_FIXED_FEE_EXCL_VAT;
  const platformVariableExclVat = Math.round(
    ticketTotal * PLATFORM_VARIABLE_FEE_PERCENTAGE
  );
  const platformFeeExclVat = platformFixedExclVat + platformVariableExclVat;

  // Calculate VAT on platform fee
  const platformFeeVat = Math.round(platformFeeExclVat * VAT_RATE);
  const platformFeeInclVat = platformFeeExclVat + platformFeeVat;

  return {
    serviceFeeInclVat: platformFeeInclVat,
    serviceFeeExclVat: platformFeeExclVat,
    serviceFeeVat: platformFeeVat,
  };
}

/**
 * Calculate payment fee (iDEAL) - client-side preview
 *
 * @returns Payment fee breakdown with VAT
 */
export function calculatePaymentFeePreview(): {
  paymentFeeInclVat: number;
  paymentFeeExclVat: number;
  paymentFeeVat: number;
} {
  const paymentFeeExclVat = MOLLIE_FEE_EXCL_VAT;
  const paymentFeeVat = Math.round(paymentFeeExclVat * VAT_RATE);
  const paymentFeeInclVat = Math.round(paymentFeeExclVat * (1 + VAT_RATE));

  return {
    paymentFeeInclVat,
    paymentFeeExclVat,
    paymentFeeVat,
  };
}
