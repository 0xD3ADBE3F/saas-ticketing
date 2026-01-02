"use client";

/**
 * Invoice table component
 * Displays invoices with filters and actions
 */

import { useState } from "react";
import type { Invoice } from "@/generated/prisma";
import { formatPrice } from "@/lib/currency";
import { formatDate } from "@/lib/date";

interface InvoiceWithRelations extends Omit<Invoice, "vatRate"> {
  vatRate: number;
  organization: {
    id: string;
    name: string;
  };
}

interface InvoiceTableProps {
  invoices: InvoiceWithRelations[];
}

function getStatusBadge(status: string) {
  const styles = {
    DRAFT: "bg-gray-100 text-gray-800",
    SENT: "bg-blue-100 text-blue-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    PAID: "bg-green-100 text-green-800",
    OVERDUE: "bg-red-100 text-red-800",
    CANCELLED: "bg-gray-100 text-gray-500",
    FAILED: "bg-red-100 text-red-800",
  };

  const labels = {
    DRAFT: "Concept",
    SENT: "Verzonden",
    PENDING: "In behandeling",
    PAID: "Betaald",
    OVERDUE: "Verlopen",
    CANCELLED: "Geannuleerd",
    FAILED: "Mislukt",
  };

  return (
    <span
      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
        styles[status as keyof typeof styles] || styles.DRAFT
      }`}
    >
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  const [filter, setFilter] = useState<string>("all");

  const filteredInvoices = invoices.filter((invoice) => {
    if (filter === "all") return true;
    return invoice.status === filter;
  });

  const totalAmount = filteredInvoices.reduce(
    (sum, inv) => sum + inv.amount + inv.vatAmount,
    0
  );

  return (
    <div>
      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium">Filter op status:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-sm"
          >
            <option value="all">Alle facturen</option>
            <option value="SENT">Verzonden</option>
            <option value="PENDING">In behandeling</option>
            <option value="PAID">Betaald</option>
            <option value="OVERDUE">Verlopen</option>
          </select>

          <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
            {filteredInvoices.length} factu
            {filteredInvoices.length !== 1 ? "ren" : "ur"} · Totaal:{" "}
            <span className="font-semibold">{formatPrice(totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Factuurnr.
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Omschrijving
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Datum
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Bedrag
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Vervaldatum
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Acties
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredInvoices.map((invoice) => (
              <tr
                key={invoice.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {invoice.invoiceNumber || "—"}
                </td>
                <td className="px-6 py-4 text-sm max-w-xs truncate">
                  {invoice.description || "Platformkosten"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(invoice.invoiceDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {formatPrice(invoice.amount + invoice.vatAmount)}
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    (excl. BTW: {formatPrice(invoice.amount)})
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(invoice.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  {invoice.pdfUrl && (
                    <a
                      href={`/api/platform-invoices/${invoice.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      PDF bekijken
                    </a>
                  )}
                  {invoice.status === "PENDING" && (
                    <a
                      href={`/dashboard/settings/invoicing/${invoice.id}/pay`}
                      className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 ml-4"
                    >
                      Nu betalen
                    </a>
                  )}
                </td>
              </tr>
            ))}

            {filteredInvoices.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  Geen facturen gevonden met de geselecteerde filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
