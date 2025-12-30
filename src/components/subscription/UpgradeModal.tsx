"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanInfo } from "@/app/(dashboard)/dashboard/settings/subscription/actions";
import { upgradePlanAction } from "@/app/(dashboard)/dashboard/settings/subscription/actions";

interface UpgradeModalProps {
  fromPlan: PlanInfo | null; // null when signing up for first plan
  toPlan: PlanInfo;
  periodEnd: Date | null;
  onClose: () => void;
}

export function UpgradeModal({
  fromPlan,
  toPlan,
  periodEnd,
  onClose,
}: UpgradeModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate proration (only if upgrading from an existing plan)
  const proration = fromPlan
    ? calculateProration(fromPlan, toPlan, periodEnd)
    : null;
  const isInitialSignup = fromPlan === null;

  const handleUpgrade = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await upgradePlanAction(toPlan.plan);

      if (result.success) {
        if (result.checkoutUrl) {
          // Redirect to Mollie checkout
          window.location.href = result.checkoutUrl;
        } else {
          // Free upgrade (e.g., to NON_PROFIT or free trial)
          router.push("/dashboard/settings/subscription?upgraded=true");
          router.refresh();
        }
      } else {
        setError(result.error || "Er is een fout opgetreden");
      }
    } catch {
      setError("Er is een onverwachte fout opgetreden");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">
              {isInitialSignup
                ? `Kies ${toPlan.displayName}`
                : `Upgraden naar ${toPlan.displayName}`}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isInitialSignup ? "Bevestig je keuze" : "Bevestig je upgrade"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Plan Comparison - only show when upgrading from existing plan */}
        {fromPlan && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Van</p>
                <p className="font-medium">{fromPlan.displayName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {fromPlan.priceDescription}
                </p>
              </div>
              <div className="text-2xl text-gray-400">→</div>
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Naar</p>
                <p className="font-medium text-blue-600 dark:text-blue-400">
                  {toPlan.displayName}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {toPlan.priceDescription}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Plan Details - show when signing up for first plan */}
        {isInitialSignup && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
            <div className="text-center">
              <p className="font-medium text-blue-600 dark:text-blue-400">
                {toPlan.displayName}
              </p>
              <p className="text-lg font-bold mt-1">
                {toPlan.priceDescription}
              </p>
            </div>
          </div>
        )}

        {/* Proration Details - only show when upgrading */}
        {proration && proration.amount > 0 && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
            <h4 className="font-medium mb-2">Kosten</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Naar rato ({proration.daysRemaining} dagen)
                </span>
                <span>€{(proration.amount / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium pt-2 border-t border-gray-200 dark:border-gray-700">
                <span>Nu te betalen</span>
                <span>€{(proration.amount / 100).toFixed(2)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Vanaf volgende maand betaal je {toPlan.priceDescription}
            </p>
          </div>
        )}

        {/* Benefits */}
        <div className="mb-6">
          <h4 className="font-medium mb-2">Wat je krijgt</h4>
          <ul className="space-y-1 text-sm">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>
                {toPlan.ticketLimit.toLocaleString("nl-NL")} tickets /{" "}
                {toPlan.limitPeriod === "month" ? "maand" : "evenement"}
              </span>
            </li>
            {toPlan.activeEventsLimit === null && (
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Onbeperkt evenementen</span>
              </li>
            )}
            {toPlan.plan === "PRO_ORGANIZER" && (
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Whitelabel (geen Entro branding)</span>
              </li>
            )}
          </ul>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
          >
            Annuleren
          </button>
          <button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Bezig...
              </span>
            ) : proration && proration.amount > 0 ? (
              `Betaal €${(proration.amount / 100).toFixed(2)}`
            ) : isInitialSignup ? (
              "Plan kiezen"
            ) : (
              "Upgraden"
            )}
          </button>
        </div>

        {/* Fine Print */}
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
          {isInitialSignup
            ? "Je plan wordt direct actief na bevestiging"
            : "Je upgrade wordt direct actief na betaling"}
        </p>
      </div>
    </div>
  );
}

/**
 * Calculate prorated amount for upgrade
 */
function calculateProration(
  fromPlan: PlanInfo,
  toPlan: PlanInfo,
  periodEnd: Date | null
): { amount: number; daysRemaining: number } {
  // If upgrading to free plan or from free plan
  if (toPlan.monthlyPrice === null || toPlan.monthlyPrice === 0) {
    return { amount: 0, daysRemaining: 0 };
  }

  // If no period end (new subscription)
  if (!periodEnd) {
    return {
      amount: toPlan.monthlyPrice ?? toPlan.eventPrice ?? 0,
      daysRemaining: 30,
    };
  }

  const now = new Date();
  const daysInMonth = 30;
  const daysRemaining = Math.max(
    0,
    Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Calculate price difference
  const fromPrice = fromPlan.monthlyPrice ?? 0;
  const toPrice = toPlan.monthlyPrice ?? toPlan.eventPrice ?? 0;
  const priceDiff = toPrice - fromPrice;

  // Prorate for remaining days
  const proratedAmount = Math.round((priceDiff / daysInMonth) * daysRemaining);

  return {
    amount: Math.max(0, proratedAmount),
    daysRemaining,
  };
}
