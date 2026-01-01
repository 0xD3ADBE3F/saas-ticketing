import { describe, it, expect } from "vitest";
import {
  calculateServiceFee,
  PLATFORM_FIXED_FEE_EXCL_VAT,
  PLATFORM_VARIABLE_FEE_PERCENTAGE,
  VAT_RATE,
} from "@/server/services/feeService";

describe("Service Fee VAT Calculation", () => {
  describe("calculateServiceFee", () => {
    it("should handle free orders (€0.00 tickets)", () => {
      const result = calculateServiceFee(0);

      expect(result.serviceFeeInclVat).toBe(0);
      expect(result.platformFeeExclVat).toBe(0);
      expect(result.platformFeeVat).toBe(0);
      expect(result.serviceFeeExclVat).toBe(0);
      expect(result.serviceFeeVat).toBe(0);
    });

    it("should calculate correctly for €50.00 ticket purchase", () => {
      const result = calculateServiceFee(5000); // €50.00

      // Platform fixed: €0.35 = 35 cents
      // Platform variable: €50.00 × 2% = €1.00 = 100 cents
      // Platform fee excl VAT: 35 + 100 = 135 cents
      expect(result.platformFeeExclVat).toBe(135);

      // Platform VAT (21%): 135 × 0.21 = 28.35 → 28 cents
      expect(result.platformFeeVat).toBe(28);

      // Platform fee incl VAT: 135 + 28 = 163 cents
      expect(result.platformFeeInclVat).toBe(163);

      // Service fee = Platform fee
      expect(result.serviceFeeExclVat).toBe(135);
      expect(result.serviceFeeVat).toBe(28);
      expect(result.serviceFeeInclVat).toBe(163);

      // Verify sum integrity
      expect(result.serviceFeeExclVat + result.serviceFeeVat).toBe(
        result.serviceFeeInclVat
      );
    });

    it("should calculate correctly for €10.00 ticket purchase", () => {
      const result = calculateServiceFee(1000); // €10.00

      // Platform fixed: €0.35 = 35 cents
      // Platform variable: €10.00 × 2% = €0.20 = 20 cents
      // Platform fee excl VAT: 35 + 20 = 55 cents
      expect(result.platformFeeExclVat).toBe(55);

      // Platform VAT: 55 × 0.21 = 11.55 → 12 cents
      expect(result.platformFeeVat).toBe(12);

      // Platform incl VAT: 55 + 12 = 67 cents
      expect(result.platformFeeInclVat).toBe(67);

      // Service fee = Platform fee
      expect(result.serviceFeeExclVat).toBe(55);
      expect(result.serviceFeeVat).toBe(12);
      expect(result.serviceFeeInclVat).toBe(67);
    });

    it("should calculate correctly for €100.00 ticket purchase", () => {
      const result = calculateServiceFee(10000); // €100.00

      // Platform fixed: €0.35 = 35 cents
      // Platform variable: €100.00 × 2% = €2.00 = 200 cents
      // Platform fee excl VAT: 35 + 200 = 235 cents
      expect(result.platformFeeExclVat).toBe(235);

      // Platform VAT: 235 × 0.21 = 49.35 → 49 cents
      expect(result.platformFeeVat).toBe(49);

      // Platform incl VAT: 235 + 49 = 284 cents
      expect(result.platformFeeInclVat).toBe(284);

      // Service fee = Platform fee
      expect(result.serviceFeeExclVat).toBe(235);
      expect(result.serviceFeeVat).toBe(49);
      expect(result.serviceFeeInclVat).toBe(284);
    });

    it("should calculate correctly for €25.00 ticket purchase", () => {
      const result = calculateServiceFee(2500); // €25.00

      // Platform fixed: €0.35 = 35 cents
      // Platform variable: €25.00 × 2% = €0.50 = 50 cents
      // Platform fee excl VAT: 35 + 50 = 85 cents
      expect(result.platformFeeExclVat).toBe(85);

      // Platform VAT: 85 × 0.21 = 17.85 → 18 cents
      expect(result.platformFeeVat).toBe(18);

      // Platform incl VAT: 85 + 18 = 103 cents
      expect(result.platformFeeInclVat).toBe(103);

      // Service fee = Platform fee
      expect(result.serviceFeeExclVat).toBe(85);
      expect(result.serviceFeeVat).toBe(18);
      expect(result.serviceFeeInclVat).toBe(103);
    });
  });

  describe("VAT breakdown validation", () => {
    it("should have Mollie portion VAT-exempt", () => {
      const result = calculateServiceFee(5000);

      // Note: Mollie fee is NOT included in service fee anymore
      // Service fee = Platform fee only
      expect(result.serviceFeeExclVat).toBe(result.platformFeeExclVat);
    });

    it("should apply 21% VAT only to platform portion", () => {
      const result = calculateServiceFee(5000);

      // Platform VAT should be ~21% of platform fee excl VAT
      const calculatedVatRate = result.platformFeeVat / result.platformFeeExclVat;
      expect(calculatedVatRate).toBeCloseTo(0.21, 2);

      // Service fee VAT should equal platform VAT
      expect(result.serviceFeeVat).toBe(result.platformFeeVat);
    });

    it("should maintain sum integrity across all amounts", () => {
      const testAmounts = [0, 500, 1000, 2500, 5000, 10000, 25000];

      testAmounts.forEach((amount) => {
        const result = calculateServiceFee(amount);

        // Service fee excl + VAT = Service fee incl
        expect(result.serviceFeeExclVat + result.serviceFeeVat).toBe(
          result.serviceFeeInclVat
        );

        // Platform excl + Platform VAT = Platform incl
        expect(result.platformFeeExclVat + result.platformFeeVat).toBe(
          result.platformFeeInclVat
        );

        // Service fee = Platform fee
        expect(result.serviceFeeInclVat).toBe(result.platformFeeInclVat);
      });
    });
  });

  describe("Platform fee calculation", () => {
    it("should calculate platform fixed fee correctly", () => {
      const result = calculateServiceFee(1000);

      // Platform fee should include the fixed €0.35
      expect(result.platformFeeExclVat).toBeGreaterThanOrEqual(
        PLATFORM_FIXED_FEE_EXCL_VAT
      );
    });

    it("should calculate platform variable fee correctly", () => {
      const ticketTotal = 5000; // €50.00
      const result = calculateServiceFee(ticketTotal);

      // Expected variable portion: €50.00 × 2% = €1.00 (100 cents)
      const expectedVariable = Math.round(
        ticketTotal * PLATFORM_VARIABLE_FEE_PERCENTAGE
      );

      // Platform fee should be fixed + variable
      expect(result.platformFeeExclVat).toBe(
        PLATFORM_FIXED_FEE_EXCL_VAT + expectedVariable
      );
    });

    it("should scale platform variable fee with ticket total", () => {
      const result10 = calculateServiceFee(1000); // €10
      const result50 = calculateServiceFee(5000); // €50

      // Variable portion should scale proportionally
      const variable10 = result10.platformFeeExclVat - PLATFORM_FIXED_FEE_EXCL_VAT;
      const variable50 = result50.platformFeeExclVat - PLATFORM_FIXED_FEE_EXCL_VAT;

      // €50 should have 5× the variable fee of €10
      expect(variable50).toBeCloseTo(variable10 * 5, 0);
    });
  });

  describe("Real-world scenarios", () => {
    it("should match example from documentation (€50 order)", () => {
      const result = calculateServiceFee(5000);

      // New structure:
      // Platform fixed: €0.35 = 35 cents
      // Platform variable: €50 × 2% = 100 cents
      // Platform excl VAT: 135 cents
      // Platform VAT (21%): 28 cents
      // Total service fee: 163 cents (€1.63)

      expect(result.platformFeeExclVat).toBe(135);
      expect(result.platformFeeVat).toBe(28);
      expect(result.serviceFeeInclVat).toBe(163);
    });

    it("should calculate for typical event ticket prices", () => {
      const scenarios = [
        { price: 750, desc: "€7.50 ticket" }, // Small event
        { price: 1500, desc: "€15.00 ticket" }, // Medium event
        { price: 3500, desc: "€35.00 ticket" }, // Larger event
        { price: 7500, desc: "€75.00 ticket" }, // Premium event
      ];

      scenarios.forEach(({ price, desc }) => {
        const result = calculateServiceFee(price);

        // All should have valid breakdown
        expect(result.serviceFeeInclVat).toBeGreaterThan(0);
        expect(result.platformFeeExclVat).toBeGreaterThan(0);
        expect(result.platformFeeVat).toBeGreaterThan(0);

        // Sum integrity
        expect(result.serviceFeeExclVat + result.serviceFeeVat).toBe(
          result.serviceFeeInclVat
        );
      });
    });

    it("should handle multiple tickets in single order", () => {
      // 5 tickets @ €20 each = €100 total
      const result = calculateServiceFee(10000);

      // Service fee is per order, not per ticket
      expect(result.serviceFeeInclVat).toBe(284); // €2.84
    });
  });

  describe("Edge cases", () => {
    it("should handle very small ticket amounts", () => {
      const result = calculateServiceFee(100); // €1.00

      // Platform fixed: 35 cents
      // Platform variable: €1 × 2% = 2 cents
      // Platform excl VAT: 37 cents
      expect(result.platformFeeExclVat).toBe(37);
      expect(result.serviceFeeInclVat).toBeGreaterThan(0);
    });

    it("should handle very large ticket amounts", () => {
      const result = calculateServiceFee(100000); // €1000.00

      // Platform fixed: 35 cents
      // Platform variable: €1000 × 2% = €20 = 2000 cents
      // Platform excl VAT: 2035 cents
      expect(result.platformFeeExclVat).toBe(2035);

      // Platform VAT: 2035 × 21% = 427.35 → 427 cents
      expect(result.platformFeeVat).toBe(427);

      // Total: 2035 + 427 = 2462 cents (€24.62)
      expect(result.serviceFeeInclVat).toBe(2462);
    });

    it("should round VAT amounts correctly", () => {
      // Test amounts that might cause rounding issues
      const testAmounts = [333, 667, 999, 1111, 3333];

      testAmounts.forEach((amount) => {
        const result = calculateServiceFee(amount);

        // All amounts should be whole cents
        expect(Number.isInteger(result.platformFeeVat)).toBe(true);
        expect(Number.isInteger(result.serviceFeeVat)).toBe(true);
        expect(Number.isInteger(result.serviceFeeInclVat)).toBe(true);
      });
    });
  });
});
