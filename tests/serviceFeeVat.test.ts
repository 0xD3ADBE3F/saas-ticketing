import { describe, it, expect } from "vitest";
import {
  calculateServiceFeeWithVat,
  MOLLIE_FEE_CENTS,
  PLATFORM_FIXED_FEE_EXCL_VAT,
  PLATFORM_VARIABLE_FEE_PERCENTAGE,
} from "@/server/lib/vat";

describe("Service Fee VAT Calculation", () => {
  describe("calculateServiceFeeWithVat", () => {
    it("should handle free orders (€0.00 tickets)", () => {
      const result = calculateServiceFeeWithVat(0);

      expect(result.serviceFeeInclVat).toBe(0);
      expect(result.mollieFee).toBe(0);
      expect(result.platformFeeExclVat).toBe(0);
      expect(result.platformFeeVat).toBe(0);
      expect(result.serviceFeeExclVat).toBe(0);
      expect(result.serviceFeeVat).toBe(0);
    });

    it("should calculate correctly for €50.00 ticket purchase", () => {
      const result = calculateServiceFeeWithVat(5000); // €50.00

      // Mollie fee: €0.29 (VAT-exempt)
      expect(result.mollieFee).toBe(29);

      // Platform fee excl VAT: €0.21 + (€50.00 × 2%) = €0.21 + €1.00 = €1.21
      expect(result.platformFeeExclVat).toBe(121);

      // Platform VAT (21%): €1.21 × 0.21 = €0.25 (rounded)
      expect(result.platformFeeVat).toBe(25);

      // Platform fee incl VAT: €1.21 + €0.25 = €1.46
      expect(result.platformFeeInclVat).toBe(146);

      // Service fee excl VAT: €0.29 + €1.21 = €1.50
      expect(result.serviceFeeExclVat).toBe(150);

      // Service fee VAT: only platform portion = €0.25
      expect(result.serviceFeeVat).toBe(25);

      // Total service fee: €0.29 + €1.46 = €1.75
      expect(result.serviceFeeInclVat).toBe(175);

      // Verify sum integrity
      expect(result.serviceFeeExclVat + result.serviceFeeVat).toBe(
        result.serviceFeeInclVat
      );
    });

    it("should calculate correctly for €10.00 ticket purchase", () => {
      const result = calculateServiceFeeWithVat(1000); // €10.00

      expect(result.mollieFee).toBe(29);

      // Platform fee excl VAT: €0.21 + (€10.00 × 2%) = €0.21 + €0.20 = €0.41
      expect(result.platformFeeExclVat).toBe(41);

      // Platform VAT: €0.41 × 0.21 = €0.09 (rounded)
      expect(result.platformFeeVat).toBe(9);

      // Platform incl VAT: €0.41 + €0.09 = €0.50
      expect(result.platformFeeInclVat).toBe(50);

      // Service fee excl VAT: €0.29 + €0.41 = €0.70
      expect(result.serviceFeeExclVat).toBe(70);

      // Service fee VAT: €0.09
      expect(result.serviceFeeVat).toBe(9);

      // Total: €0.29 + €0.50 = €0.79
      expect(result.serviceFeeInclVat).toBe(79);
    });

    it("should calculate correctly for €100.00 ticket purchase", () => {
      const result = calculateServiceFeeWithVat(10000); // €100.00

      expect(result.mollieFee).toBe(29);

      // Platform fee excl VAT: €0.21 + (€100.00 × 2%) = €0.21 + €2.00 = €2.21
      expect(result.platformFeeExclVat).toBe(221);

      // Platform VAT: €2.21 × 0.21 = €0.46 (rounded)
      expect(result.platformFeeVat).toBe(46);

      // Platform incl VAT: €2.21 + €0.46 = €2.67
      expect(result.platformFeeInclVat).toBe(267);

      // Service fee excl VAT: €0.29 + €2.21 = €2.50
      expect(result.serviceFeeExclVat).toBe(250);

      // Service fee VAT: €0.46
      expect(result.serviceFeeVat).toBe(46);

      // Total: €0.29 + €2.67 = €2.96
      expect(result.serviceFeeInclVat).toBe(296);
    });

    it("should calculate correctly for €25.00 ticket purchase", () => {
      const result = calculateServiceFeeWithVat(2500); // €25.00

      expect(result.mollieFee).toBe(29);

      // Platform fee excl VAT: €0.21 + (€25.00 × 2%) = €0.21 + €0.50 = €0.71
      expect(result.platformFeeExclVat).toBe(71);

      // Platform VAT: €0.71 × 0.21 = €0.15 (rounded)
      expect(result.platformFeeVat).toBe(15);

      // Platform incl VAT: €0.71 + €0.15 = €0.86
      expect(result.platformFeeInclVat).toBe(86);

      // Total: €0.29 + €0.86 = €1.15
      expect(result.serviceFeeInclVat).toBe(115);
    });
  });

  describe("VAT breakdown validation", () => {
    it("should have Mollie portion VAT-exempt", () => {
      const result = calculateServiceFeeWithVat(5000);

      // Mollie portion should have no VAT
      expect(result.mollieFee).toBe(MOLLIE_FEE_CENTS);
    });

    it("should apply 21% VAT only to platform portion", () => {
      const result = calculateServiceFeeWithVat(5000);

      // Platform VAT should be ~21% of platform fee excl VAT
      const calculatedVatRate = result.platformFeeVat / result.platformFeeExclVat;
      expect(calculatedVatRate).toBeCloseTo(0.21, 2);

      // Service fee VAT should only be from platform portion
      expect(result.serviceFeeVat).toBe(result.platformFeeVat);
    });

    it("should maintain sum integrity across all amounts", () => {
      const testAmounts = [0, 500, 1000, 2500, 5000, 10000, 25000];

      testAmounts.forEach((amount) => {
        const result = calculateServiceFeeWithVat(amount);

        // Service fee excl + VAT = Service fee incl
        expect(result.serviceFeeExclVat + result.serviceFeeVat).toBe(
          result.serviceFeeInclVat
        );

        // Mollie + Platform incl = Total incl
        expect(result.mollieFee + result.platformFeeInclVat).toBe(
          result.serviceFeeInclVat
        );

        // Platform excl + Platform VAT = Platform incl
        expect(result.platformFeeExclVat + result.platformFeeVat).toBe(
          result.platformFeeInclVat
        );
      });
    });
  });

  describe("Platform fee calculation", () => {
    it("should calculate platform fixed fee correctly", () => {
      const result = calculateServiceFeeWithVat(1000);

      // Platform fee should include the fixed €0.21
      expect(result.platformFeeExclVat).toBeGreaterThanOrEqual(
        PLATFORM_FIXED_FEE_EXCL_VAT
      );
    });

    it("should calculate platform variable fee correctly", () => {
      const ticketTotal = 5000; // €50.00
      const result = calculateServiceFeeWithVat(ticketTotal);

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
      const result10 = calculateServiceFeeWithVat(1000); // €10
      const result50 = calculateServiceFeeWithVat(5000); // €50

      // Variable portion should scale proportionally
      const variable10 = result10.platformFeeExclVat - PLATFORM_FIXED_FEE_EXCL_VAT;
      const variable50 = result50.platformFeeExclVat - PLATFORM_FIXED_FEE_EXCL_VAT;

      // €50 should have 5× the variable fee of €10
      expect(variable50).toBeCloseTo(variable10 * 5, 0);
    });
  });

  describe("Real-world scenarios", () => {
    it("should match example from documentation (€50 order)", () => {
      const result = calculateServiceFeeWithVat(5000);

      // From documentation:
      // Mollie: €0.29
      // Platform excl VAT: €1.21
      // Platform VAT: €0.25
      // Total: €1.75

      expect(result.mollieFee).toBe(29);
      expect(result.platformFeeExclVat).toBe(121);
      expect(result.platformFeeVat).toBe(25);
      expect(result.serviceFeeInclVat).toBe(175);
    });

    it("should calculate for typical event ticket prices", () => {
      const scenarios = [
        { price: 750, desc: "€7.50 ticket" }, // Small event
        { price: 1500, desc: "€15.00 ticket" }, // Medium event
        { price: 3500, desc: "€35.00 ticket" }, // Larger event
        { price: 7500, desc: "€75.00 ticket" }, // Premium event
      ];

      scenarios.forEach(({ price, desc }) => {
        const result = calculateServiceFeeWithVat(price);

        // All should have valid breakdown
        expect(result.serviceFeeInclVat).toBeGreaterThan(0);
        expect(result.mollieFee).toBe(29);
        expect(result.platformFeeExclVat).toBeGreaterThan(0);
        expect(result.platformFeeVat).toBeGreaterThan(0);

        // Sum integrity
        expect(result.serviceFeeExclVat + result.serviceFeeVat).toBe(
          result.serviceFeeInclVat
        );

        console.log(`${desc}: Service fee = €${(result.serviceFeeInclVat / 100).toFixed(2)}`);
      });
    });

    it("should handle multiple tickets in single order", () => {
      // 5 tickets @ €20 each = €100 total
      const result = calculateServiceFeeWithVat(10000);

      // Service fee is per order, not per ticket
      expect(result.serviceFeeInclVat).toBe(296); // €2.96

      // Mollie fee is also per order
      expect(result.mollieFee).toBe(29);
    });
  });

  describe("Edge cases", () => {
    it("should handle very small ticket amounts", () => {
      const result = calculateServiceFeeWithVat(100); // €1.00

      expect(result.mollieFee).toBe(29);
      expect(result.platformFeeExclVat).toBeGreaterThan(0);
      expect(result.serviceFeeInclVat).toBeGreaterThan(0);
    });

    it("should handle very large ticket amounts", () => {
      const result = calculateServiceFeeWithVat(100000); // €1000.00

      expect(result.mollieFee).toBe(29);
      expect(result.platformFeeExclVat).toBe(2021); // €0.21 + €20.00
      expect(result.platformFeeVat).toBe(424); // €4.24
      expect(result.serviceFeeInclVat).toBe(2474); // €24.74
    });

    it("should round VAT amounts correctly", () => {
      // Test amounts that might cause rounding issues
      const testAmounts = [333, 667, 999, 1111, 3333];

      testAmounts.forEach((amount) => {
        const result = calculateServiceFeeWithVat(amount);

        // All amounts should be whole cents
        expect(Number.isInteger(result.platformFeeVat)).toBe(true);
        expect(Number.isInteger(result.serviceFeeVat)).toBe(true);
        expect(Number.isInteger(result.serviceFeeInclVat)).toBe(true);
      });
    });
  });
});
