"use client";

import { useEffect } from "react";
import { formatPrice } from "@/lib/currency";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { SerializedInvoice } from "@/app/(dashboard)/dashboard/settings/subscription/actions";
import type { InvoiceStatus, InvoiceType } from "@/generated/prisma";

interface InvoiceDetailModalProps {
  invoice: SerializedInvoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceDetailModal({
  invoice,
  isOpen,
  onClose,
}: InvoiceDetailModalProps) {
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

  if (!invoice || !isOpen) return null;

  const getStatusBadgeClass = (status: InvoiceStatus): string => {
    const baseClasses =
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";

    switch (status) {
      case "PAID":
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400`;
      case "SENT":
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400`;
      case "PENDING":
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400`;
      case "OVERDUE":
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400`;
      case "DRAFT":
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
      case "CANCELLED":
        return `${baseClasses} bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400`;
      case "FAILED":
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
    }
  };

  const getStatusLabel = (status: InvoiceStatus): string => {
    const labels: Record<InvoiceStatus, string> = {
      DRAFT: "Concept",
      SENT: "Verzonden",
      PENDING: "In behandeling",
      PAID: "Betaald",
      OVERDUE: "Achterstallig",
      CANCELLED: "Geannuleerd",
      FAILED: "Mislukt",
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type: InvoiceType): string => {
    const labels: Record<InvoiceType, string> = {
      SUBSCRIPTION: "Abonnement",
      PAY_PER_EVENT: "Per evenement",
      OVERAGE: "Overgebruik",
    };
    return labels[type] || type;
  };

  const totalAmount = Number(invoice.amount) + Number(invoice.vatAmount);

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
        <div className="relative w-full max-w-2xl transform overflow-hidden rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-left shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 id="modal-title" className="text-lg font-medium">
              Factuurdetails
            </h3>
            <button
              type="button"
              className="rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={onClose}
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
          <div className="px-6 py-4 space-y-6">
            {/* Invoice Number & Status */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Factuurnummer
                </p>
                <p className="text-lg font-semibold">{invoice.invoiceNumber}</p>
              </div>
              <span className={getStatusBadgeClass(invoice.status)}>
                {getStatusLabel(invoice.status)}
              </span>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                <p className="mt-1 font-medium">{getTypeLabel(invoice.type)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Factuurdatum
                </p>
                <p className="mt-1 font-medium">
                  {invoice.invoiceDate
                    ? format(new Date(invoice.invoiceDate), "dd MMMM yyyy", {
                        locale: nl,
                      })
                    : "N/A"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Vervaldatum
                </p>
                <p className="mt-1 font-medium">
                  {invoice.dueDate
                    ? format(new Date(invoice.dueDate), "dd MMMM yyyy", {
                        locale: nl,
                      })
                    : "N/A"}
                </p>
              </div>

              {invoice.paidAt && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Betaald op
                  </p>
                  <p className="mt-1 font-medium">
                    {format(new Date(invoice.paidAt), "dd MMMM yyyy", {
                      locale: nl,
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Amount Breakdown */}
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
              <h3 className="text-sm font-medium mb-3">Bedragen</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Subtotaal
                  </span>
                  <span className="font-medium">
                    {formatPrice(Number(invoice.amount))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    BTW (21%)
                  </span>
                  <span className="font-medium">
                    {formatPrice(Number(invoice.vatAmount))}
                  </span>
                </div>
                <div className="flex justify-between text-base font-semibold border-t border-gray-200 dark:border-gray-800 pt-2 mt-2">
                  <span>Totaal</span>
                  <span>{formatPrice(totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {invoice.description && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Omschrijving
                </p>
                <p className="text-sm">{invoice.description}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <a
              href={`/api/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download PDF
            </a>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              onClick={onClose}
            >
              Sluiten
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
