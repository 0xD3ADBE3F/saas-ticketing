import { describe, it, expect } from "vitest";
import {
  VAT_RATES,
  calcVatFromInclusive,
  calcPriceExclVat,
  calcVatAmount,
  calcPriceInclVat,
  getPriceBreakdown,

  isValidVatRate,
} from "@/server/lib/vat";

describe("VAT Utilities", () => {
  describe("VAT Rate Constants", () => {
    it("should have correct VAT rates", () => {
      expect(VAT_RATES.STANDARD_21).toBe(0.21);
      expect(VAT_RATES.REDUCED_9).toBe(0.09);
      expect(VAT_RATES.EXEMPT).toBe(0.0);
    });
  });

  describe("calcVatFromInclusive", () => {
    it("should calculate VAT from price including VAT - 21%", () => {
      expect(calcVatFromInclusive(1000, "STANDARD_21")).toBe(174); // €10.00 → €1.74 VAT
      expect(calcVatFromInclusive(2500, "STANDARD_21")).toBe(434); // €25.00 → €4.34 VAT
      expect(calcVatFromInclusive(12100, "STANDARD_21")).toBe(2100); // €121.00 → €21.00 VAT
    });

    it("should calculate VAT from price including VAT - 9%", () => {
      expect(calcVatFromInclusive(1000, "REDUCED_9")).toBe(83); // €10.00 → €0.83 VAT
      expect(calcVatFromInclusive(2500, "REDUCED_9")).toBe(206); // €25.00 → €2.06 VAT
      expect(calcVatFromInclusive(10900, "REDUCED_9")).toBe(900); // €109.00 → €9.00 VAT
    });

    it("should return 0 for EXEMPT rate", () => {
      expect(calcVatFromInclusive(1000, "EXEMPT")).toBe(0);
      expect(calcVatFromInclusive(5000, "EXEMPT")).toBe(0);
    });

    it("should round to nearest cent", () => {
      // €10.01 at 21% → VAT should be €1.74 (174 cents)
      expect(calcVatFromInclusive(1001, "STANDARD_21")).toBe(174);

      // €10.05 at 21% → VAT should be €1.74 (174 cents)
      expect(calcVatFromInclusive(1005, "STANDARD_21")).toBe(174);
    });
  });

  describe("calcPriceExclVat", () => {
    it("should calculate price excluding VAT - 21%", () => {
      expect(calcPriceExclVat(1000, "STANDARD_21")).toBe(826); // €10.00 → €8.26 excl VAT
      expect(calcPriceExclVat(2500, "STANDARD_21")).toBe(2066); // €25.00 → €20.66 excl VAT
    });

    it("should calculate price excluding VAT - 9%", () => {
      expect(calcPriceExclVat(1000, "REDUCED_9")).toBe(917); // €10.00 → €9.17 excl VAT
      expect(calcPriceExclVat(2500, "REDUCED_9")).toBe(2294); // €25.00 → €22.94 excl VAT
    });

    it("should return same price for EXEMPT rate", () => {
      expect(calcPriceExclVat(1000, "EXEMPT")).toBe(1000);
      expect(calcPriceExclVat(5000, "EXEMPT")).toBe(5000);
    });
  });

  describe("calcVatAmount", () => {
    it("should calculate VAT amount from price excluding VAT - 21%", () => {
      expect(calcVatAmount(826, "STANDARD_21")).toBe(173); // €8.26 → €1.73 VAT (rounded)
      expect(calcVatAmount(2066, "STANDARD_21")).toBe(434); // €20.66 → €4.34 VAT
    });

    it("should calculate VAT amount from price excluding VAT - 9%", () => {
      expect(calcVatAmount(917, "REDUCED_9")).toBe(83); // €9.17 → €0.83 VAT
      expect(calcVatAmount(2294, "REDUCED_9")).toBe(206); // €22.94 → €2.06 VAT
    });

    it("should return 0 for EXEMPT rate", () => {
      expect(calcVatAmount(1000, "EXEMPT")).toBe(0);
      expect(calcVatAmount(5000, "EXEMPT")).toBe(0);
    });
  });

  describe("calcPriceInclVat", () => {
    it("should calculate price including VAT - 21%", () => {
      expect(calcPriceInclVat(826, "STANDARD_21")).toBe(999); // €8.26 → €9.99 incl VAT (rounding)
      expect(calcPriceInclVat(2066, "STANDARD_21")).toBe(2500); // €20.66 → €25.00 incl VAT
    });

    it("should calculate price including VAT - 9%", () => {
      expect(calcPriceInclVat(917, "REDUCED_9")).toBe(1000); // €9.17 → €10.00 incl VAT
      expect(calcPriceInclVat(2294, "REDUCED_9")).toBe(2500); // €22.94 → €25.00 incl VAT
    });

    it("should return same price for EXEMPT rate", () => {
      expect(calcPriceInclVat(1000, "EXEMPT")).toBe(1000);
      expect(calcPriceInclVat(5000, "EXEMPT")).toBe(5000);
    });
  });

  describe("getPriceBreakdown", () => {
    it("should return complete breakdown - 21%", () => {
      const breakdown = getPriceBreakdown(1000, "STANDARD_21");

      expect(breakdown.priceInclVat).toBe(1000);
      expect(breakdown.priceExclVat).toBe(826);
      expect(breakdown.vatAmount).toBe(174);
      expect(breakdown.vatRate).toBe("STANDARD_21");

      // Verify they sum correctly
      expect(breakdown.priceExclVat + breakdown.vatAmount).toBe(breakdown.priceInclVat);
    });

    it("should return complete breakdown - 9%", () => {
      const breakdown = getPriceBreakdown(1000, "REDUCED_9");

      expect(breakdown.priceInclVat).toBe(1000);
      expect(breakdown.priceExclVat).toBe(917);
      expect(breakdown.vatAmount).toBe(83);
      expect(breakdown.vatRate).toBe("REDUCED_9");

      // Verify they sum correctly
      expect(breakdown.priceExclVat + breakdown.vatAmount).toBe(breakdown.priceInclVat);
    });

    it("should return complete breakdown - EXEMPT", () => {
      const breakdown = getPriceBreakdown(1000, "EXEMPT");

      expect(breakdown.priceInclVat).toBe(1000);
      expect(breakdown.priceExclVat).toBe(1000);
      expect(breakdown.vatAmount).toBe(0);
      expect(breakdown.vatRate).toBe("EXEMPT");
    });
  });

  describe("isValidVatRate", () => {
    it("should validate correct VAT rates", () => {
      expect(isValidVatRate("STANDARD_21")).toBe(true);
      expect(isValidVatRate("REDUCED_9")).toBe(true);
      expect(isValidVatRate("EXEMPT")).toBe(true);
    });

    it("should reject invalid VAT rates", () => {
      expect(isValidVatRate("INVALID")).toBe(false);
      expect(isValidVatRate("21")).toBe(false);
      expect(isValidVatRate("")).toBe(false);
    });
  });

  describe("Rounding Edge Cases", () => {
    it("should handle prices that result in fractional cents correctly", () => {
      // €1.00 at 21% should split to €0.83 excl + €0.17 VAT (rounding)
      const breakdown1 = getPriceBreakdown(100, "STANDARD_21");
      expect(breakdown1.priceExclVat).toBe(83);
      expect(breakdown1.vatAmount).toBe(17);
      expect(breakdown1.priceExclVat + breakdown1.vatAmount).toBe(100);

      // €5.55 at 9%
      const breakdown2 = getPriceBreakdown(555, "REDUCED_9");
      expect(breakdown2.priceExclVat + breakdown2.vatAmount).toBe(555);
    });

    it("should handle reverse calculations with rounding", () => {
      // Start with €10 incl, extract excl, add VAT back
      const priceInclVat = 1000;
      const priceExclVat = calcPriceExclVat(priceInclVat, "STANDARD_21");
      const recalculated = calcPriceInclVat(priceExclVat, "STANDARD_21");

      // Should return to original or be within 1 cent due to rounding
      expect(Math.abs(recalculated - priceInclVat)).toBeLessThanOrEqual(1);
    });
  });

  describe("Real-world Scenarios", () => {
    it("should handle ticket price of €15.00 with 21% VAT", () => {
      const breakdown = getPriceBreakdown(1500, "STANDARD_21");

      expect(breakdown.priceInclVat).toBe(1500); // €15.00
      expect(breakdown.priceExclVat).toBe(1240); // €12.40
      expect(breakdown.vatAmount).toBe(260); // €2.60
    });

    it("should handle ticket price of €7.50 with 9% VAT", () => {
      const breakdown = getPriceBreakdown(750, "REDUCED_9");

      expect(breakdown.priceInclVat).toBe(750); // €7.50
      expect(breakdown.priceExclVat).toBe(688); // €6.88
      expect(breakdown.vatAmount).toBe(62); // €0.62
    });

    it("should handle free tickets (€0.00)", () => {
      const breakdown = getPriceBreakdown(0, "EXEMPT");

      expect(breakdown.priceInclVat).toBe(0);
      expect(breakdown.priceExclVat).toBe(0);
      expect(breakdown.vatAmount).toBe(0);
    });

    it("should handle high-value tickets (€100.00) with 21% VAT", () => {
      const breakdown = getPriceBreakdown(10000, "STANDARD_21");

      expect(breakdown.priceInclVat).toBe(10000); // €100.00
      expect(breakdown.priceExclVat).toBe(8264); // €82.64
      expect(breakdown.vatAmount).toBe(1736); // €17.36
    });
  });
});
