"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Rocket, CreditCard, CheckCircle, AlertCircle } from "lucide-react";

interface EventPublishPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  requiresPayment?: boolean;
}

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

  const modalContent = (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-left shadow-2xl transition-all animate-in zoom-in-95 duration-200">
          {/* Gradient Header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 px-6 py-8">
            <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
            <div className="relative flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                  <Rocket className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 id="modal-title" className="text-xl font-bold text-white">
                    Evenement Live Zetten
                  </h3>
                  <p className="mt-1 text-sm text-blue-100">
                    Maak je evenement zichtbaar voor bezoekers
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg p-1 text-white/80 hover:text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors"
                onClick={onClose}
                disabled={isLoading}
              >
                <span className="sr-only">Sluiten</span>
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
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
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-5">
            {/* Publish Confirmation */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-green-100 dark:bg-green-900/30 p-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Je evenement wordt zichtbaar voor het publiek
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    Na bevestiging kunnen bezoekers je evenement vinden en
                    tickets kopen via de publieke pagina.
                  </p>
                </div>
              </div>

              {/* What happens next */}
              <div className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200 dark:border-gray-700 p-5">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Rocket className="h-4 w-4" />
                  Wat gebeurt er?
                </h4>
                <ul className="space-y-2.5">
                  <li className="flex items-start gap-3 text-sm">
                    <span className="text-green-600 dark:text-green-400 mt-0.5">
                      ✓
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      Je evenement wordt zichtbaar op de publieke pagina
                    </span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <span className="text-green-600 dark:text-green-400 mt-0.5">
                      ✓
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      Bezoekers kunnen tickets kopen
                    </span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <span className="text-green-600 dark:text-green-400 mt-0.5">
                      ✓
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      Je kunt het evenement nog steeds bewerken
                    </span>
                  </li>
                </ul>
              </div>

              {/* Info */}
              <div className="flex items-start gap-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 p-4">
                <span className="text-xl">💡</span>
                <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
                  Zorg ervoor dat alle informatie correct is. Je kunt het
                  evenement later nog aanpassen of beëindigen.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <button
              type="button"
              className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all"
              onClick={onClose}
              disabled={isLoading}
            >
              Annuleren
            </button>
            <button
              type="button"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/30"
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Bezig...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Live zetten
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render modal in a portal at document body level
  return createPortal(modalContent, document.body);
}
