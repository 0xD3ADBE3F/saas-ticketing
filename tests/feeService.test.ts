import { describe, it, expect } from "vitest";
import {
  calculateServiceFee,
  calculatePaymentFee,
  calculateOrderFees,
  shouldApplyPaymentFee,
  calculatePlatformFeeForPayout,
  calculatePayoutFees,
  MOLLIE_FEE_EXCL_VAT,
  PLATFORM_FIXED_FEE_EXCL_VAT,
  PLATFORM_VARIABLE_FEE_PERCENTAGE,
  VAT_RATE,
} from "@/server/services/feeService";

describe("Fee Service", () => {
  describe("Constants", () => {
    it("should have correct Mollie fee", () => {
      expect(MOLLIE_FEE_EXCL_VAT).toBe(32); // €0.32
    });

    it("should have correct platform fixed fee", () => {
      expect(PLATFORM_FIXED_FEE_EXCL_VAT).toBe(35); // €0.35
    });

    it("should have correct platform variable fee", () => {
      expect(PLATFORM_VARIABLE_FEE_PERCENTAGE).toBe(0.02); // 2%
    });

    it("should have correct VAT rate", () => {
      expect(VAT_RATE).toBe(0.21); // 21%
    });
  });

  describe("calculateServiceFee", () => {
    it("should return zero for free orders", () => {
      const result = calculateServiceFee(0);

      expect(result.platformFeeExclVat).toBe(0);
      expect(result.platformFeeVat).toBe(0);
      expect(result.platformFeeInclVat).toBe(0);
      expect(result.serviceFeeExclVat).toBe(0);
      expect(result.serviceFeeVat).toBe(0);
      expect(result.serviceFeeInclVat).toBe(0);
    });

    it("should calculate service fee for €50.00 ticket correctly", () => {
      const ticketTotal = 5000; // €50.00
      const result = calculateServiceFee(ticketTotal);

      // Platform fixed: €0.35
      // Platform variable: €50.00 × 2% = €1.00
      // Platform total excl VAT: €1.35 = 135 cents
      expect(result.platformFeeExclVat).toBe(135);

      // VAT: €1.35 × 21% = €0.28 (rounded) = 28 cents
      expect(result.platformFeeVat).toBe(28);

      // Platform incl VAT: €1.35 + €0.28 = €1.63 = 163 cents
      expect(result.platformFeeInclVat).toBe(163);

      // Service fee = Platform fee
      expect(result.serviceFeeInclVat).toBe(163);
    });

    it("should calculate service fee for €10.00 ticket correctly", () => {
      const ticketTotal = 1000; // €10.00
      const result = calculateServiceFee(ticketTotal);

      // Platform fixed: €0.35 = 35 cents
      // Platform variable: €10.00 × 2% = €0.20 = 20 cents
      // Platform total excl VAT: 55 cents
      expect(result.platformFeeExclVat).toBe(55);

      // VAT: 55 × 21% = 11.55 → 12 cents (rounded)
      expect(result.platformFeeVat).toBe(12);

      // Platform incl VAT: 55 + 12 = 67 cents
      expect(result.platformFeeInclVat).toBe(67);
    });

    it("should ensure incl = excl + vat", () => {
      const result = calculateServiceFee(5000);

      expect(result.platformFeeInclVat).toBe(
        result.platformFeeExclVat + result.platformFeeVat
      );
      expect(result.serviceFeeInclVat).toBe(
        result.serviceFeeExclVat + result.serviceFeeVat
      );
    });
  });

  describe("calculatePaymentFee", () => {
    it("should calculate Mollie fee correctly with exact precision", () => {
      const result = calculatePaymentFee();

      // Mollie fee: €0.32 = 32 cents
      expect(result.paymentFeeExclVat).toBe(32);

      // VAT: 32 × 21% = 6.72 cents (EXACT, no rounding)
      expect(result.paymentFeeVat).toBe(6.72);

      // Total incl VAT: 32 + 6.72 = 38.72 cents (EXACT)
      expect(result.paymentFeeInclVat).toBe(38.72);
    });

    it("should ensure incl = excl + vat", () => {
      const result = calculatePaymentFee();

      expect(result.paymentFeeInclVat).toBe(
        result.paymentFeeExclVat + result.paymentFeeVat
      );
    });
  });

  describe("shouldApplyPaymentFee", () => {
    it("should return true when toggle enabled and ticket total > 0", () => {
      expect(shouldApplyPaymentFee(true, 1000)).toBe(true);
    });

    it("should return false when toggle disabled", () => {
      expect(shouldApplyPaymentFee(false, 1000)).toBe(false);
    });

    it("should return false when ticket total is 0", () => {
      expect(shouldApplyPaymentFee(true, 0)).toBe(false);
    });

    it("should charge fees on €0.01 orders if toggle enabled", () => {
      expect(shouldApplyPaymentFee(true, 1)).toBe(true);
    });
  });

  describe("calculateOrderFees", () => {
    it("should calculate complete order without payment fee", () => {
      const ticketTotal = 5000; // €50.00
      const result = calculateOrderFees(ticketTotal, false);

      expect(result.ticketTotal).toBe(5000);
      expect(result.serviceFee.serviceFeeInclVat).toBe(163); // €1.63
      expect(result.paymentFee).toBeUndefined();
      expect(result.totalAmount).toBe(5163); // €51.63
    });

    it("should calculate complete order with payment fee", () => {
      const ticketTotal = 5000; // €50.00
      const result = calculateOrderFees(ticketTotal, true);

      expect(result.ticketTotal).toBe(5000);
      expect(result.serviceFee.serviceFeeInclVat).toBe(163); // €1.63
      expect(result.paymentFee?.paymentFeeInclVat).toBe(38.72); // €0.3872 (exact)
      expect(result.totalAmount).toBe(5201.72); // €52.0172
    });

    it("should return zero fees for free orders", () => {
      const result = calculateOrderFees(0, true);

      expect(result.ticketTotal).toBe(0);
      expect(result.serviceFee.serviceFeeInclVat).toBe(0);
      expect(result.paymentFee).toBeUndefined();
      expect(result.totalAmount).toBe(0);
    });

    it("should calculate breakdown for €100.00 order", () => {
      const ticketTotal = 10000; // €100.00
      const result = calculateOrderFees(ticketTotal, true);

      // Platform fixed: €0.35 = 35 cents
      // Platform variable: €100.00 × 2% = €2.00 = 200 cents
      // Platform total excl VAT: 235 cents
      expect(result.serviceFee.platformFeeExclVat).toBe(235);

      // VAT: 235 × 21% = 49.35 → 49 cents
      expect(result.serviceFee.platformFeeVat).toBe(49);

      // Service fee incl VAT: 235 + 49 = 284 cents (€2.84)
      expect(result.serviceFee.serviceFeeInclVat).toBe(284);

      // Payment fee: €0.3872 (exact)
      expect(result.paymentFee?.paymentFeeInclVat).toBe(38.72);

      // Total: €100.00 + €2.84 + €0.3872 = €103.2272
      expect(result.totalAmount).toBe(10322.72);
    });
  });

  describe("calculatePlatformFeeForPayout", () => {
    it("should calculate 2% platform fee", () => {
      expect(calculatePlatformFeeForPayout(5000)).toBe(100); // 2% of €50 = €1
      expect(calculatePlatformFeeForPayout(10000)).toBe(200); // 2% of €100 = €2
      expect(calculatePlatformFeeForPayout(100)).toBe(2); // 2% of €1 = €0.02
    });

    it("should handle zero revenue", () => {
      expect(calculatePlatformFeeForPayout(0)).toBe(0);
    });

    it("should round correctly", () => {
      // €0.99 × 2% = €0.0198 → rounds to €0.02
      expect(calculatePlatformFeeForPayout(99)).toBe(2);
    });
  });

  describe("calculatePayoutFees", () => {
    it("should calculate payout breakdown correctly", () => {
      const result = calculatePayoutFees(5000); // €50.00 gross

      expect(result.grossRevenue).toBe(5000);
      expect(result.platformFee).toBe(100); // 2% = €1.00
      expect(result.netPayout).toBe(4900); // €49.00
    });

    it("should handle zero revenue", () => {
      const result = calculatePayoutFees(0);

      expect(result.grossRevenue).toBe(0);
      expect(result.platformFee).toBe(0);
      expect(result.netPayout).toBe(0);
    });

    it("should ensure net = gross - platform fee", () => {
      const result = calculatePayoutFees(10000);

      expect(result.netPayout).toBe(result.grossRevenue - result.platformFee);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very small amounts", () => {
      const result = calculateOrderFees(1, false); // €0.01

      expect(result.totalAmount).toBeGreaterThan(0);
      expect(result.serviceFee.serviceFeeInclVat).toBeGreaterThan(0);
    });

    it("should handle large amounts", () => {
      const ticketTotal = 1000000; // €10,000.00
      const result = calculateOrderFees(ticketTotal, true);

      // Should complete without errors
      expect(result.totalAmount).toBeGreaterThan(ticketTotal);
    });

    it("should apply consistent rounding", () => {
      // Multiple calculations should produce same result
      const result1 = calculateServiceFee(5000);
      const result2 = calculateServiceFee(5000);

      expect(result1).toEqual(result2);
    });
  });

  describe("Integration Scenarios", () => {
    it("should match example from business requirements", () => {
      // Example: €50.00 ticket purchase
      // Expected: Service fee €1.63, Payment fee €0.3872 (exact), Total €52.0172
      const result = calculateOrderFees(5000, true);

      expect(result.totalAmount).toBe(5201.72); // €52.0172
      expect(result.serviceFee.serviceFeeInclVat).toBe(163); // €1.63
      expect(result.paymentFee?.paymentFeeInclVat).toBe(38.72); // €0.3872 (exact)
    });

    it("should calculate multiple ticket purchase correctly", () => {
      // 5 × €10.00 tickets = €50.00 total
      const ticketTotal = 5 * 1000;
      const result = calculateOrderFees(ticketTotal, false);

      expect(result.ticketTotal).toBe(5000);
      expect(result.serviceFee.serviceFeeInclVat).toBe(163);
      expect(result.totalAmount).toBe(5163);
    });
  });
});
