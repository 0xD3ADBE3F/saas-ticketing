"use client";

import { useState, useEffect } from "react";
import { formatPrice } from "@/lib/currency";

interface Balance {
  id: string;
  currency: string;
  status: "active" | "inactive";
  availableAmount: number;
  pendingAmount: number;
  transferFrequency: string;
}

interface Settlement {
  id: string;
  reference: string;
  status: "open" | "pending" | "paidout" | "failed";
  amount: {
    currency: string;
    value: number;
  };
  settledAt: string | null;
  createdAt: string;
}

interface SettlementsViewProps {
  organizationId: string;
}

const frequencyLabels: Record<string, string> = {
  daily: "Dagelijks",
  "twice-a-week": "2x per week",
  "every-monday": "Elke maandag",
  "every-tuesday": "Elke dinsdag",
  "every-wednesday": "Elke woensdag",
  "every-thursday": "Elke donderdag",
  "every-friday": "Elke vrijdag",
  monthly: "Maandelijks",
  never: "Handmatig",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  pending: "In behandeling",
  paidout: "Uitbetaald",
  failed: "Mislukt",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  paidout:
    "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
};

export function SettlementsView({ organizationId }: SettlementsViewProps) {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [openSettlement, setOpenSettlement] = useState<Settlement | null>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // Fetch balance and open settlement
        const balanceRes = await fetch(
          `/api/organizations/${organizationId}/balance`
        );
        if (balanceRes.ok) {
          const balanceData = await balanceRes.json();
          setBalance(balanceData.balance);
          setOpenSettlement(balanceData.openSettlement);
        }

        // Fetch settlements history
        const settlementsRes = await fetch(
          `/api/organizations/${organizationId}/settlements?limit=10`
        );
        if (settlementsRes.ok) {
          const settlementsData = await settlementsRes.json();
          setSettlements(settlementsData.settlements || []);
        }
      } catch (err) {
        console.error("Failed to fetch settlements:", err);
        setError("Kon uitbetalingen niet ophalen");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [organizationId]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Balance skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-3"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-700 dark:text-red-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-sm text-red-600 hover:text-red-700 dark:text-red-400"
        >
          Opnieuw proberen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Available balance */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Beschikbaar saldo
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {balance ? formatPrice(balance.availableAmount) : "€ 0,00"}
          </p>
        </div>

        {/* Pending balance */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            In behandeling
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {balance ? formatPrice(balance.pendingAmount) : "€ 0,00"}
          </p>
        </div>

        {/* Next payout */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Volgende uitbetaling
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {openSettlement
              ? formatPrice(openSettlement.amount.value)
              : "€ 0,00"}
          </p>
          {balance && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {frequencyLabels[balance.transferFrequency] ||
                balance.transferFrequency}
            </p>
          )}
        </div>
      </div>

      {/* Settlements history */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Uitbetalingshistorie
          </h2>
        </div>

        {settlements.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            Nog geen uitbetalingen ontvangen.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Referentie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Bedrag
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Datum
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {settlements.map((settlement) => (
                  <tr
                    key={settlement.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {settlement.reference}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[settlement.status]
                        }`}
                      >
                        {statusLabels[settlement.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatPrice(settlement.amount.value)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                      {settlement.settledAt
                        ? new Date(settlement.settledAt).toLocaleDateString(
                            "nl-NL"
                          )
                        : new Date(settlement.createdAt).toLocaleDateString(
                            "nl-NL"
                          )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex">
          <svg
            className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Uitbetalingen worden verwerkt via Mollie. Je kunt je bankrekening en
            uitbetalingsfrequentie beheren in het{" "}
            <a
              href="https://my.mollie.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              Mollie Dashboard
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
