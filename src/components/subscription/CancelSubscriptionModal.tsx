"use client";

import { useState } from "react";
import type { SubscriptionData } from "@/app/(dashboard)/dashboard/settings/subscription/actions";

interface CancelSubscriptionModalProps {
  subscription: SubscriptionData;
  onCancel: () => void;
  onConfirm: () => Promise<{
    success: boolean;
    error?: string;
    effectiveDate?: Date;
  }>;
}

export function CancelSubscriptionModal({
  subscription,
  onCancel,
  onConfirm,
}: CancelSubscriptionModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await onConfirm();

      if (!result.success) {
        setError(result.error || "Er is een fout opgetreden");
        setIsLoading(false);
      }
      // If successful, the page will refresh via revalidatePath in the server action
    } catch {
      setError("Er is een onverwachte fout opgetreden");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Abonnement opzeggen
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning Icon */}
          <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Je staat op het punt om je abonnement op te zeggen
              </p>
            </div>
          </div>

          {/* Current Plan Info */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-600 dark:text-gray-400">
                Huidig plan
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {subscription.planDisplayName}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-gray-600 dark:text-gray-400">
                Ingangsdatum opzegging
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {subscription.currentPeriodEnd?.toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600 dark:text-gray-400">
                Nieuw plan
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Geen abonnement
              </span>
            </div>
          </div>

          {/* What Happens Next */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              Wat gebeurt er?
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>
                  Je kunt je huidige plan blijven gebruiken tot{" "}
                  <strong className="text-gray-900 dark:text-gray-100">
                    {subscription.currentPeriodEnd?.toLocaleDateString(
                      "nl-NL",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }
                    )}
                  </strong>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Je wordt niet meer automatisch gefactureerd</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">→</span>
                <span>
                  Na deze datum heb je{" "}
                  <strong className="text-gray-900 dark:text-gray-100">
                    geen actief abonnement
                  </strong>{" "}
                  meer en kun je geen nieuwe evenementen publiceren
                </span>
              </li>
            </ul>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Bezig...</span>
              </>
            ) : (
              "Abonnement opzeggen"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
