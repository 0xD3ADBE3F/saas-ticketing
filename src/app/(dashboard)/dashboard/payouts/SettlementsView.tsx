"use client";

import { useState, useEffect } from "react";
import { formatPrice } from "@/lib/currency";
import { calculatePaymentFee } from "@/server/services/feeService";
import {
  Download,
  Wallet,
  Clock,
  TrendingUp,
  FileText,
  Ticket,
  ScanLine,
  Info,
} from "lucide-react";

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

interface EventPayoutBreakdown {
  eventId: string;
  eventTitle: string;
  vatRate: string;
  ticketsSold: number;
  grossRevenue: number;
  grossRevenueExclVat: number;
  ticketVat: number;
  serviceFees: number;
  serviceFeeExclVat: number;
  serviceFeeVat: number;
  platformFee: number;
  mollieFees: number;
  netPayout: number;
}

interface PayoutSummary {
  totalGrossRevenue: number;
  totalGrossRevenueExclVat: number;
  totalTicketVat: number;
  totalServiceFees: number;
  totalServiceFeeExclVat: number;
  totalServiceFeeVat: number;
  totalPlatformFees: number;
  totalMollieFees: number;
  totalNetPayout: number;
  events: EventPayoutBreakdown[];
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
  const [payoutSummary, setPayoutSummary] = useState<PayoutSummary | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"settlements" | "events">(
    "settlements"
  );

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

        // Fetch payout summary
        const summaryRes = await fetch(
          `/api/organizations/${organizationId}/payouts/summary`
        );
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          setPayoutSummary(summaryData);
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

  const handleExport = async (type: "orders" | "tickets" | "scans") => {
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/export/${type}`
      );
      if (!response.ok) {
        throw new Error(`Failed to export ${type}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(`Failed to export ${type}:`, err);
      alert(`Kon ${type} niet exporteren`);
    }
  };

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
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 backdrop-blur-xl border-2 border-green-200/50 dark:border-green-800/50 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-green-100 dark:bg-green-900/40 rounded-xl">
              <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-semibold text-green-700 dark:text-green-300">
              Beschikbaar saldo
            </p>
          </div>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100">
            {balance ? formatPrice(balance.availableAmount) : "€ 0,00"}
          </p>
        </div>

        {/* Pending balance */}
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 backdrop-blur-xl border-2 border-yellow-200/50 dark:border-yellow-800/50 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-yellow-100 dark:bg-yellow-900/40 rounded-xl">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
              In behandeling
            </p>
          </div>
          <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">
            {balance ? formatPrice(balance.pendingAmount) : "€ 0,00"}
          </p>
        </div>

        {/* Next payout */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 backdrop-blur-xl border-2 border-blue-200/50 dark:border-blue-800/50 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              Volgende uitbetaling
            </p>
          </div>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {openSettlement
              ? formatPrice(openSettlement.amount.value)
              : "€ 0,00"}
          </p>
          {balance && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">
              {frequencyLabels[balance.transferFrequency] ||
                balance.transferFrequency}
            </p>
          )}
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => handleExport("orders")}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-all font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 touch-manipulation"
        >
          <FileText className="w-4 h-4" />
          Exporteer bestellingen
        </button>
        <button
          onClick={() => handleExport("tickets")}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-xl hover:border-purple-300 dark:hover:border-purple-600 transition-all font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 touch-manipulation"
        >
          <Ticket className="w-4 h-4" />
          Exporteer tickets
        </button>
        <button
          onClick={() => handleExport("scans")}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-xl hover:border-green-300 dark:hover:border-green-600 transition-all font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 touch-manipulation"
        >
          <ScanLine className="w-4 h-4" />
          Exporteer scans
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b-2 border-gray-200/50 dark:border-gray-800/50">
        <nav className="-mb-0.5 flex space-x-8">
          <button
            onClick={() => setActiveTab("settlements")}
            className={`py-4 px-1 border-b-2 font-semibold text-sm transition-colors ${
              activeTab === "settlements"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Uitbetalingen
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`py-4 px-1 border-b-2 font-semibold text-sm transition-colors ${
              activeTab === "events"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Per evenement
          </button>
        </nav>
      </div>

      {/* Settlements tab */}
      {activeTab === "settlements" && (
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-gray-200/50 dark:border-gray-800/50">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Uitbetalingshistorie
            </h2>
          </div>

          {settlements.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              Nog geen uitbetalingen ontvangen.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Referentie
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Bedrag
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Datum
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50 dark:divide-gray-800">
                  {settlements.map((settlement) => (
                    <tr
                      key={settlement.id}
                      className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all"
                    >
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {settlement.reference}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            statusColors[settlement.status]
                          }`}
                        >
                          {statusLabels[settlement.status]}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatPrice(settlement.amount.value)}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right text-sm text-gray-600 dark:text-gray-400">
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
      )}

      {/* Events tab */}
      {activeTab === "events" && payoutSummary && (
        <div className="space-y-4">
          {/* Explanation block */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 backdrop-blur-xl border-2 border-blue-200/50 dark:border-blue-800/50 rounded-2xl p-5 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl shrink-0">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-2">
                  Hoe werkt dit overzicht?
                </h3>
                <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                  <p>
                    Dit overzicht toont het complete plaatje van je Mollie
                    uitbetalingen:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>
                      <strong>Bruto omzet:</strong> Totale ticketverkoop (wat
                      kopers betalen voor tickets)
                    </li>
                    <li>
                      <strong>Platform fee (servicekosten):</strong> €0,35 + 2%
                      per order. Dit is wat kopers betalen als "servicekosten"
                      en gaat naar Entro. Wordt automatisch ingehouden door
                      Mollie.
                    </li>
                    <li>
                      <strong>Mollie fees:</strong> Transactiekosten (€
                      {(calculatePaymentFee().paymentFeeInclVat / 100).toFixed(
                        4
                      )}{" "}
                      per order). Als je &quot;Betaalkosten doorberekenen&quot;
                      activeert, betaalt de koper deze.
                    </li>
                    <li>
                      <strong>Netto uitbetaling:</strong> Wat je ontvangt =
                      Bruto omzet - Mollie fees die jij betaalt
                    </li>
                  </ul>
                  <p className="pt-2 border-t border-blue-200 dark:border-blue-700">
                    De BTW uitsplitsing helpt je bij het invullen van je
                    BTW-aangifte. Service fees zijn altijd 21% BTW, ticket BTW
                    hangt af van je evenement.
                  </p>
                  <p className="pt-2 border-t border-blue-200 dark:border-blue-700">
                    <strong>Facturatie:</strong> Aan het einde van elk evenement
                    ontvang je een factuur voor de platform fees. Deze factuur
                    is al betaald (automatisch ingehouden via Mollie) en dient
                    alleen voor je administratie.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Summary totals */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Totaal overzicht
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Bruto omzet
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatPrice(payoutSummary.totalGrossRevenue)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Platform fee
                </p>
                <p className="text-xl font-bold text-gray-500 dark:text-gray-400">
                  -{formatPrice(payoutSummary.totalPlatformFees)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Mollie fees (totaal)
                </p>
                <p className="text-xl font-bold text-gray-500 dark:text-gray-400">
                  -{formatPrice(payoutSummary.totalMollieFees)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Netto uitbetaling
                </p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatPrice(payoutSummary.totalNetPayout)}
                </p>
              </div>
            </div>

            {/* VAT Breakdown */}
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                BTW uitsplitsing
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">
                    Ticket omzet (excl. BTW)
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatPrice(payoutSummary.totalGrossRevenueExclVat)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">
                    BTW op tickets
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatPrice(payoutSummary.totalTicketVat)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">
                    Platform fee (excl. BTW)
                  </p>
                  <p className="font-semibold text-gray-500 dark:text-gray-400">
                    {formatPrice(payoutSummary.totalServiceFeeExclVat)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">
                    BTW op platform fee (21%)
                  </p>
                  <p className="font-semibold text-gray-500 dark:text-gray-400">
                    {formatPrice(payoutSummary.totalServiceFeeVat)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Per VAT rate breakdown */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Uitsplitsing per BTW-tarief
              </h2>
            </div>

            {payoutSummary.events.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                Nog geen tickets verkocht.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Evenement
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Tickets
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Omzet excl. BTW
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        BTW tickets
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Platform fee
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Mollie fees
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Netto
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Group events by VAT rate
                      interface VatRateGroup {
                        vatRate: string;
                        events: EventPayoutBreakdown[];
                        ticketsSold: number;
                        grossRevenueExclVat: number;
                        ticketVat: number;
                        serviceFeeExclVat: number;
                        serviceFeeVat: number;
                        platformFee: number;
                        mollieFees: number;
                        netPayout: number;
                      }

                      const vatRateGroups = payoutSummary.events.reduce(
                        (groups, event) => {
                          const rate = event.vatRate;
                          if (!groups[rate]) {
                            groups[rate] = {
                              vatRate: rate,
                              events: [],
                              ticketsSold: 0,
                              grossRevenueExclVat: 0,
                              ticketVat: 0,
                              serviceFeeExclVat: 0,
                              serviceFeeVat: 0,
                              platformFee: 0,
                              mollieFees: 0,
                              netPayout: 0,
                            };
                          }
                          groups[rate].events.push(event);
                          groups[rate].ticketsSold += event.ticketsSold;
                          groups[rate].grossRevenueExclVat +=
                            event.grossRevenueExclVat;
                          groups[rate].ticketVat += event.ticketVat;
                          groups[rate].serviceFeeExclVat +=
                            event.serviceFeeExclVat;
                          groups[rate].serviceFeeVat += event.serviceFeeVat;
                          groups[rate].platformFee += event.platformFee;
                          groups[rate].mollieFees += event.mollieFees;
                          groups[rate].netPayout += event.netPayout;
                          return groups;
                        },
                        {} as Record<string, VatRateGroup>
                      );

                      const vatRateLabels: Record<string, string> = {
                        STANDARD_21: "21% (standaard)",
                        REDUCED_9: "9% (verlaagd)",
                        EXEMPT: "0% (vrijgesteld)",
                      };

                      return Object.values(vatRateGroups).flatMap(
                        (group: VatRateGroup, groupIndex: number) => [
                          // VAT rate header row
                          <tr
                            key={`vat-${group.vatRate}`}
                            className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-t-2 border-blue-200 dark:border-blue-700"
                          >
                            <td className="px-6 py-3" colSpan={7}>
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-1 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                                <span className="text-sm font-bold text-blue-900 dark:text-blue-100 uppercase tracking-wide">
                                  BTW-tarief:{" "}
                                  {vatRateLabels[group.vatRate] ||
                                    group.vatRate}
                                </span>
                              </div>
                            </td>
                          </tr>,
                          // Individual event rows
                          ...group.events.map((event, eventIndex) => (
                            <tr
                              key={event.eventId}
                              className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors border-b border-gray-100 dark:border-gray-800"
                            >
                              <td className="px-6 py-3 pl-12">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {event.eventTitle}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-600 dark:text-gray-300">
                                {event.ticketsSold}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">
                                {formatPrice(event.grossRevenueExclVat)}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-right text-sm text-gray-600 dark:text-gray-400">
                                {formatPrice(event.ticketVat)}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-right text-sm text-red-600 dark:text-red-400 font-medium">
                                -{formatPrice(event.platformFee)}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-right text-sm text-red-600 dark:text-red-400 font-medium">
                                -{formatPrice(event.mollieFees)}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-right">
                                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                  {formatPrice(event.netPayout)}
                                </span>
                              </td>
                            </tr>
                          )),
                          // Group subtotal row
                          group.events.length > 1 ? (
                            <tr
                              key={`subtotal-${group.vatRate}`}
                              className="bg-blue-100/50 dark:bg-blue-900/30 border-b-2 border-blue-300 dark:border-blue-700"
                            >
                              <td className="px-6 py-3.5 pl-12">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                                  <span className="text-sm font-bold text-blue-900 dark:text-blue-100 uppercase tracking-wide">
                                    Subtotaal {vatRateLabels[group.vatRate]}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-3.5 whitespace-nowrap text-right text-sm font-bold text-blue-900 dark:text-blue-100">
                                {group.ticketsSold}
                              </td>
                              <td className="px-6 py-3.5 whitespace-nowrap text-right text-sm font-bold text-blue-900 dark:text-blue-100">
                                {formatPrice(group.grossRevenueExclVat)}
                              </td>
                              <td className="px-6 py-3.5 whitespace-nowrap text-right text-sm font-bold text-blue-900 dark:text-blue-100">
                                {formatPrice(group.ticketVat)}
                              </td>
                              <td className="px-6 py-3.5 whitespace-nowrap text-right text-sm font-bold text-red-700 dark:text-red-400">
                                -{formatPrice(group.platformFee)}
                              </td>
                              <td className="px-6 py-3.5 whitespace-nowrap text-right text-sm font-bold text-red-700 dark:text-red-400">
                                -{formatPrice(group.mollieFees)}
                              </td>
                              <td className="px-6 py-3.5 whitespace-nowrap text-right">
                                <span className="text-sm font-bold text-green-700 dark:text-green-400 text-base">
                                  {formatPrice(group.netPayout)}
                                </span>
                              </td>
                            </tr>
                          ) : null,
                        ]
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

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
            Uitbetalingen worden verwerkt via Mollie. De platform fee (kopers
            zien dit als &quot;servicekosten&quot;: €0,35 + 2% per order) wordt
            automatisch ingehouden en gaat naar het platform. De Mollie
            transactiekosten (
            {formatPrice(calculatePaymentFee().paymentFeeInclVat)} per order,
            incl. BTW) worden altijd gemaakt per transactie. Indien je de optie
            &quot;Betaalkosten doorberekenen&quot; activeert bij een evenement,
            betaalt de koper deze kosten. Anders worden ze van je uitbetaling
            afgetrokken. Het totaal overzicht toont alle Mollie fees, maar je
            netto uitbetaling houdt alleen rekening met de fees die jij betaalt.
            BTW uitsplitsing toont de belastbare omzet voor je BTW-aangifte. Je
            kunt je bankrekening en uitbetalingsfrequentie beheren in het{" "}
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
