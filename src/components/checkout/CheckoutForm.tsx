"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/currency";
import type { TicketSelection, TicketTypeForSelection } from "./TicketSelector";

interface CheckoutFormProps {
  eventSlug: string;
  eventTitle: string;
  selections: TicketSelection[];
  ticketTypes: TicketTypeForSelection[];
  onBack: () => void;
}

type OrderSummaryData = {
  items: {
    ticketTypeId: string;
    ticketTypeName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  ticketTotal: number;
  serviceFee: number;
  totalAmount: number;
};

export function CheckoutForm({
  eventSlug,
  eventTitle,
  selections,
  ticketTypes,
  onBack,
}: CheckoutFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<OrderSummaryData | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);

  // Fetch order summary on mount
  useState(() => {
    const fetchSummary = async () => {
      try {
        const itemsParam = encodeURIComponent(
          JSON.stringify(
            selections
              .filter((s) => s.quantity > 0)
              .map((s) => ({
                ticketTypeId: s.ticketTypeId,
                quantity: s.quantity,
              }))
          )
        );

        const response = await fetch(
          `/api/checkout?eventSlug=${eventSlug}&items=${itemsParam}`
        );
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Kon bestelling niet berekenen");
          return;
        }

        setSummary(data);
      } catch {
        setError("Kon bestelling niet berekenen");
      } finally {
        setIsSummaryLoading(false);
      }
    };

    fetchSummary();
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventSlug,
          buyerEmail: email,
          buyerName: name || undefined,
          items: selections
            .filter((s) => s.quantity > 0)
            .map((s) => ({
              ticketTypeId: s.ticketTypeId,
              quantity: s.quantity,
            })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Er ging iets mis");
        return;
      }

      // For free orders, redirect directly to complete page (skip payment)
      if (data.isFree) {
        router.push(`/checkout/${data.orderId}/complete`);
      } else {
        // For paid orders, redirect to payment page
        router.push(`/checkout/${data.orderId}`);
      }
    } catch {
      setError("Er ging iets mis bij het plaatsen van je bestelling");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate local summary while loading server summary
  const localSummary = {
    items: selections
      .filter((s) => s.quantity > 0)
      .map((s) => {
        const ticketType = ticketTypes.find((tt) => tt.id === s.ticketTypeId);
        return {
          name: ticketType?.name ?? "Onbekend",
          quantity: s.quantity,
          unitPrice: ticketType?.price ?? 0,
          totalPrice: (ticketType?.price ?? 0) * s.quantity,
        };
      }),
    ticketTotal: selections.reduce((sum, s) => {
      const ticketType = ticketTypes.find((tt) => tt.id === s.ticketTypeId);
      return sum + (ticketType?.price ?? 0) * s.quantity;
    }, 0),
  };

  const displaySummary = summary ?? {
    ...localSummary,
    serviceFee: 0, // Will be calculated by server
    totalAmount: localSummary.ticketTotal, // Show ticket total while loading
  };

  if (!summary) {
    displaySummary.totalAmount =
      displaySummary.ticketTotal + displaySummary.serviceFee;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Terug naar ticketselectie"
        >
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Afrekenen
        </h2>
      </div>

      {/* Order Summary */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 dark:text-white mb-1">
          {eventTitle}
        </h3>

        <div className="mt-4 space-y-2 text-sm">
          {(summary?.items ?? localSummary.items).map((item, index) => (
            <div
              key={index}
              className="flex justify-between text-gray-600 dark:text-gray-400"
            >
              <span>
                {item.quantity}×{" "}
                {"name" in item
                  ? item.name
                  : (item as { ticketTypeName: string }).ticketTypeName}
              </span>
              <span>
                {formatPrice("totalPrice" in item ? item.totalPrice : 0)}
              </span>
            </div>
          ))}

          <div className="flex justify-between text-gray-500 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
            <span>Subtotaal</span>
            <span>{formatPrice(displaySummary.ticketTotal)}</span>
          </div>

          <div className="flex justify-between text-gray-500 dark:text-gray-500">
            <span className="flex items-center gap-1">
              Servicekosten
              <span
                className="inline-block"
                title="Servicekosten worden per bestelling berekend"
              >
                <svg
                  className="w-4 h-4 text-gray-400"
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
              </span>
            </span>
            <span>{formatPrice(displaySummary.serviceFee)}</span>
          </div>

          <div className="flex justify-between font-semibold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
            <span>Totaal</span>
            <span>{formatPrice(displaySummary.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Buyer Info Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            E-mailadres *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="je@email.nl"
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Je tickets worden naar dit adres gestuurd
          </p>
        </div>

        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Naam <span className="text-gray-400">(optioneel)</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Je naam"
            maxLength={100}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || isSummaryLoading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
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
              {displaySummary.totalAmount === 0
                ? "Tickets ophalen..."
                : "Bestelling plaatsen..."}
            </>
          ) : (
            <>
              {displaySummary.totalAmount === 0
                ? "Gratis tickets ophalen"
                : "Bestelling plaatsen"}
              {displaySummary.totalAmount > 0 && (
                <span className="text-blue-200">
                  ({formatPrice(displaySummary.totalAmount)})
                </span>
              )}
            </>
          )}
        </button>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          Door te bestellen ga je akkoord met onze{" "}
          <a
            href="/voorwaarden"
            className="underline hover:text-gray-700 dark:hover:text-gray-300"
          >
            algemene voorwaarden
          </a>
        </p>
      </form>
    </div>
  );
}
