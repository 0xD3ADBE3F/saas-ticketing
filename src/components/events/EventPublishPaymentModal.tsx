"use client";

import { useEffect } from "react";

interface EventPublishPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

const EVENT_PRICE_EXCL_VAT = 4900; // €49.00 in cents (excl. VAT)
const VAT_RATE = 21;
const VAT_AMOUNT = Math.round(EVENT_PRICE_EXCL_VAT * (VAT_RATE / 100)); // €10.29
const TOTAL_AMOUNT = EVENT_PRICE_EXCL_VAT + VAT_AMOUNT; // €59.29

export function EventPublishPaymentModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: EventPublishPaymentModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-left shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 id="modal-title" className="text-lg font-medium">
              Betaal & Publiceer Evenement
            </h3>
            <button
              type="button"
              className="rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={onClose}
              disabled={isLoading}
            >
              <span className="sr-only">Sluiten</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Je wordt doorgestuurd naar Mollie om de publicatiekosten te
              betalen. Na succesvolle betaling wordt je evenement automatisch
              live gezet.
            </p>

            {/* Price Breakdown */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-3">
                Kostenspecificatie
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">
                    Publicatiekosten
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    €{(EVENT_PRICE_EXCL_VAT / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">
                    BTW (21%)
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    €{(VAT_AMOUNT / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-semibold border-t border-blue-200 dark:border-blue-800 pt-2 mt-2">
                  <span className="text-blue-900 dark:text-blue-300">
                    Totaal te betalen
                  </span>
                  <span className="text-blue-900 dark:text-blue-300">
                    €{(TOTAL_AMOUNT / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="text-blue-500 mt-0.5">ℹ️</span>
              <p>
                Dit is een eenmalige betaling per evenement. Je ontvangt een
                factuur na succesvolle betaling.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              onClick={onClose}
              disabled={isLoading}
            >
              Annuleren
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Bezig...
                </>
              ) : (
                <>
                  <span>💳</span>
                  Betalen (€{(TOTAL_AMOUNT / 100).toFixed(2)})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
