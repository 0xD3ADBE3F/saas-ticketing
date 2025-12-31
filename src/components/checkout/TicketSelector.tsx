"use client";

import { useMemo } from "react";
import { formatPrice } from "@/lib/currency";

export type TicketTypeForSelection = {
  id: string;
  name: string;
  description: string | null;
  price: number; // in cents
  capacity: number;
  soldCount: number;
  saleStart: Date | null;
  saleEnd: Date | null;
};

export type TicketSelection = {
  ticketTypeId: string;
  quantity: number;
};

interface TicketSelectorProps {
  ticketTypes: TicketTypeForSelection[];
  selections: TicketSelection[];
  onSelectionsChange: (selections: TicketSelection[]) => void;
  disabled?: boolean;
  maxPerType?: number;
}

function getAvailability(ticketType: TicketTypeForSelection): number {
  return Math.max(0, ticketType.capacity - ticketType.soldCount);
}

function getSaleStatus(ticketType: TicketTypeForSelection): {
  status: "available" | "not-started" | "ended" | "sold-out";
  message: string;
} {
  const now = new Date();
  const available = getAvailability(ticketType);

  if (ticketType.saleStart && now < new Date(ticketType.saleStart)) {
    return {
      status: "not-started",
      message: `Verkoop start ${new Date(ticketType.saleStart).toLocaleDateString("nl-NL")}`,
    };
  }

  if (ticketType.saleEnd && now > new Date(ticketType.saleEnd)) {
    return { status: "ended", message: "Verkoop gesloten" };
  }

  if (available === 0) {
    return { status: "sold-out", message: "Uitverkocht" };
  }

  return { status: "available", message: `${available} beschikbaar` };
}

export function TicketSelector({
  ticketTypes,
  selections,
  onSelectionsChange,
  disabled = false,
  maxPerType = 10,
}: TicketSelectorProps) {
  const getQuantity = (ticketTypeId: string): number => {
    const selection = selections.find((s) => s.ticketTypeId === ticketTypeId);
    return selection?.quantity ?? 0;
  };

  const updateQuantity = (ticketTypeId: string, quantity: number) => {
    const newSelections = selections.filter(
      (s) => s.ticketTypeId !== ticketTypeId
    );
    if (quantity > 0) {
      newSelections.push({ ticketTypeId, quantity });
    }
    onSelectionsChange(newSelections);
  };

  const handleIncrement = (ticketType: TicketTypeForSelection) => {
    const current = getQuantity(ticketType.id);
    const available = getAvailability(ticketType);
    const maxQuantity = Math.min(maxPerType, available);

    if (current < maxQuantity) {
      updateQuantity(ticketType.id, current + 1);
    }
  };

  const handleDecrement = (ticketTypeId: string) => {
    const current = getQuantity(ticketTypeId);
    if (current > 0) {
      updateQuantity(ticketTypeId, current - 1);
    }
  };

  return (
    <div className="space-y-4">
      {ticketTypes.map((ticketType) => {
        const quantity = getQuantity(ticketType.id);
        const saleStatus = getSaleStatus(ticketType);
        const isAvailable = saleStatus.status === "available";
        const available = getAvailability(ticketType);
        const maxQuantity = Math.min(maxPerType, available);

        return (
          <div
            key={ticketType.id}
            className={`p-4 rounded-lg border ${
              isAvailable
                ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 opacity-75"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              {/* Ticket Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {ticketType.name}
                  </h3>
                  {!isAvailable && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      {saleStatus.message}
                    </span>
                  )}
                </div>
                {ticketType.description && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {ticketType.description}
                  </p>
                )}
                <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                  {ticketType.price === 0
                    ? "Gratis"
                    : formatPrice(ticketType.price)}
                </p>
                {isAvailable && available <= 20 && (
                  <p className="mt-1 text-xs text-orange-600 dark:text-orange-400">
                    Nog {available} beschikbaar
                  </p>
                )}
              </div>

              {/* Quantity Selector */}
              {isAvailable && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDecrement(ticketType.id)}
                    disabled={disabled || quantity === 0}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Verlaag aantal"
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
                        d="M20 12H4"
                      />
                    </svg>
                  </button>

                  <span className="w-10 text-center font-medium text-gray-900 dark:text-white">
                    {quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleIncrement(ticketType)}
                    disabled={disabled || quantity >= maxQuantity}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Verhoog aantal"
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
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Order Summary Component
// =============================================================================

interface OrderSummaryProps {
  selections: TicketSelection[];
  ticketTypes: TicketTypeForSelection[];
  serviceFee?: number; // in cents, if already calculated
}

export function OrderSummary({
  selections,
  ticketTypes,
  serviceFee: preCalculatedServiceFee,
}: OrderSummaryProps) {
  const summary = useMemo(() => {
    let ticketTotal = 0;
    const items: { name: string; quantity: number; total: number }[] = [];

    for (const selection of selections) {
      if (selection.quantity === 0) continue;

      const ticketType = ticketTypes.find(
        (tt) => tt.id === selection.ticketTypeId
      );
      if (!ticketType) continue;

      const total = ticketType.price * selection.quantity;
      ticketTotal += total;

      items.push({
        name: ticketType.name,
        quantity: selection.quantity,
        total,
      });
    }

    // Use pre-calculated service fee from server
    // Never calculate client-side - always fetch from API
    const serviceFee = preCalculatedServiceFee ?? 0;
    const totalAmount = ticketTotal + serviceFee;

    return { items, ticketTotal, serviceFee, totalAmount };
  }, [selections, ticketTypes, preCalculatedServiceFee]);

  if (summary.items.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 dark:text-white mb-3">
        Overzicht
      </h4>

      <div className="space-y-2 text-sm">
        {summary.items.map((item, index) => (
          <div
            key={index}
            className="flex justify-between text-gray-600 dark:text-gray-400"
          >
            <span>
              {item.quantity}× {item.name}
            </span>
            <span>{formatPrice(item.total)}</span>
          </div>
        ))}

        <div className="flex justify-between text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
          <span>Servicekosten</span>
          <span>{formatPrice(summary.serviceFee)}</span>
        </div>

        <div className="flex justify-between font-medium text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
          <span>Totaal</span>
          <span>{formatPrice(summary.totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}
