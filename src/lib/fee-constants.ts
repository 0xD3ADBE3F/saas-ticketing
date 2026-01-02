/**
 * Fee Constants
 *
 * Single source of truth for all fee-related constants.
 * Used by both backend services and client-side preview calculations.
 *
 * IMPORTANT: These constants must stay in sync across the entire platform.
 * Any changes here affect both order creation and client-side previews.
 */

/**
 * Mollie payment processing fee (charged by Mollie to organizer)
 *
 * IMPORTANT: Exact amount incl VAT is €0.3872 (not rounded to €0.39)
 * - Excl VAT: €0.32 = 32 cents
 * - VAT (21%): €0.0672 = 6.72 cents
 * - Incl VAT: €0.3872 = 38.72 cents (EXACT, no rounding)
 */
export const MOLLIE_FEE_EXCL_VAT = 32; // €0.32 excl. VAT
export const MOLLIE_FEE_INCL_VAT = 38.72; // €0.3872 incl. VAT (EXACT)

/**
 * Platform fixed fee per order (Entro revenue)
 */
export const PLATFORM_FIXED_FEE_EXCL_VAT = 35; // €0.35 excl. VAT

/**
 * Platform variable fee percentage (Entro revenue)
 */
export const PLATFORM_VARIABLE_FEE_PERCENTAGE = 0.02; // 2%

/**
 * Dutch standard VAT rate
 */
export const VAT_RATE = 0.21; // 21%
