"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanInfo } from "@/app/(dashboard)/dashboard/settings/subscription/actions";
import { downgradePlanAction } from "@/app/(dashboard)/dashboard/settings/subscription/actions";

interface DowngradeModalProps {
  fromPlan: PlanInfo;
  toPlan: PlanInfo;
  currentUsage: number;
  periodEnd: Date | null;
  onClose: () => void;
}

export function DowngradeModal({
  fromPlan,
  toPlan,
  currentUsage,
  periodEnd,
  onClose,
}: DowngradeModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if downgrade is blocked due to usage
  const usageExceedsLimit = currentUsage > toPlan.ticketLimit;
  const isBlocked = usageExceedsLimit && !toPlan.overageAllowed;

  const handleDowngrade = async () => {
    if (isBlocked) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await downgradePlanAction(toPlan.plan);

      if (result.success) {
        // If there's a checkout URL, redirect to it (downgrading to another paid plan)
        if (result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
        } else {
          // Otherwise, show success and refresh
          router.push("/dashboard/settings/subscription?downgraded=true");
          router.refresh();
          onClose();
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

  const effectiveDate = periodEnd
    ? periodEnd.toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "einde van de factureringsperiode";

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
              {isBlocked
                ? "Downgrade niet mogelijk"
                : `Downgraden naar ${toPlan.displayName}`}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isBlocked
                ? "Je huidige verbruik overschrijdt de limiet"
                : "Bevestig je wijziging"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Blocked Warning */}
        {isBlocked && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-red-500 text-xl">⚠️</span>
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">
                  Je kunt niet downgraden
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Je hebt deze maand al {currentUsage.toLocaleString("nl-NL")}{" "}
                  tickets verkocht.
                  {toPlan.displayName} heeft een limiet van{" "}
                  {toPlan.ticketLimit.toLocaleString("nl-NL")} tickets
                  {!toPlan.overageAllowed && " zonder overage mogelijkheid"}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Plan Comparison */}
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
              <p className="font-medium text-orange-600 dark:text-orange-400">
                {toPlan.displayName}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {toPlan.priceDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Usage Warning (non-blocking) */}
        {usageExceedsLimit && toPlan.overageAllowed && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-yellow-500">⚠️</span>
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Let op: Overage kosten
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Je hebt {currentUsage.toLocaleString("nl-NL")} tickets
                  verkocht, maar {toPlan.displayName} heeft een limiet van{" "}
                  {toPlan.ticketLimit.toLocaleString("nl-NL")}. Na de downgrade
                  betaal je €{((toPlan.overageFee ?? 0) / 100).toFixed(2)} per
                  extra ticket.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* What You Lose */}
        {!isBlocked && (
          <div className="mb-6">
            <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">
              Wat je verliest
            </h4>
            <ul className="space-y-1 text-sm">
              {fromPlan.ticketLimit > toPlan.ticketLimit && (
                <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <span className="text-red-500">✗</span>
                  <span>
                    {(fromPlan.ticketLimit - toPlan.ticketLimit).toLocaleString(
                      "nl-NL"
                    )}{" "}
                    tickets limiet
                  </span>
                </li>
              )}
              {fromPlan.activeEventsLimit === null &&
                toPlan.activeEventsLimit !== null && (
                  <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span className="text-red-500">✗</span>
                    <span>Onbeperkt evenementen</span>
                  </li>
                )}
              {fromPlan.plan === "PRO_ORGANIZER" &&
                toPlan.plan !== "PRO_ORGANIZER" && (
                  <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span className="text-red-500">✗</span>
                    <span>Whitelabel (geen branding)</span>
                  </li>
                )}
            </ul>
          </div>
        )}

        {/* Effective Date */}
        {!isBlocked && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Ingangsdatum:</strong> {effectiveDate}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Je huidige plan blijft actief tot deze datum
            </p>
          </div>
        )}

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
            {isBlocked ? "Sluiten" : "Annuleren"}
          </button>
          {!isBlocked && (
            <button
              onClick={handleDowngrade}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Bezig...
                </span>
              ) : (
                "Bevestig downgrade"
              )}
            </button>
          )}
        </div>

        {/* Fine Print */}
        {!isBlocked && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
            Je kunt op elk moment weer upgraden
          </p>
        )}
      </div>
    </div>
  );
}
