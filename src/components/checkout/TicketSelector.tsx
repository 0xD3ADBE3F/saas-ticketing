"use client";

import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/currency";
import {
  Minus,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle,
  Zap,
} from "lucide-react";

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
  showTicketAvailability?: boolean;
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
  showTicketAvailability = true,
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
        const isLowStock = available > 0 && available <= 20;
        const isSelected = quantity > 0;
        const availabilityPercent =
          ticketType.capacity > 0 ? (available / ticketType.capacity) * 100 : 0;

        return (
          <div
            key={ticketType.id}
            className={`relative public-card transition-all duration-300 ${
              isSelected
                ? "ring-2 ring-blue-500 shadow-lg border-blue-200 dark:border-blue-800"
                : ""
            } ${!isAvailable ? "opacity-60" : "hover:shadow-xl"}`}
          >
            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg animate-fade-in-up z-10">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            )}

            <div className="p-4 sm:p-6">
              {/* Ticket Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  {/* Icon based on ticket type */}
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                      !isAvailable
                        ? "bg-gray-100 dark:bg-gray-800"
                        : isLowStock
                          ? "bg-orange-100 dark:bg-orange-900/30"
                          : "bg-blue-100 dark:bg-blue-900/30"
                    }`}
                  >
                    {!isAvailable ? (
                      <AlertCircle
                        className={`w-6 h-6 ${
                          saleStatus.status === "not-started"
                            ? "text-gray-500 dark:text-gray-400"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      />
                    ) : isLowStock ? (
                      <Zap className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    ) : (
                      <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {ticketType.name}
                    </h3>
                  </div>
                </div>

                {ticketType.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                    {ticketType.description}
                  </p>
                )}

                {/* Price */}
                <div className="mb-3">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {ticketType.price === 0
                      ? "Gratis"
                      : formatPrice(ticketType.price)}
                  </span>
                  {ticketType.price > 0 && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      per ticket
                    </span>
                  )}
                </div>

                {/* Status badges */}
                <div className="flex flex-wrap gap-2">
                  {!isAvailable ? (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full ${
                        saleStatus.status === "not-started"
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                          : saleStatus.status === "ended"
                            ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
                            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                      }`}
                    >
                      {saleStatus.status === "not-started" && (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                      {saleStatus.status === "sold-out" && (
                        <AlertCircle className="w-3.5 h-3.5" />
                      )}
                      {saleStatus.message}
                    </span>
                  ) : (
                    <>
                      {showTicketAvailability && (
                        <>
                          {isLowStock ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 animate-pulse">
                              <Zap className="w-3.5 h-3.5" />
                              Laatste {available} beschikbaar!
                            </span>
                          ) : (
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {available} beschikbaar
                            </span>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Availability bar */}
                {showTicketAvailability &&
                  isAvailable &&
                  ticketType.capacity > 0 && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isLowStock
                              ? "bg-gradient-to-r from-orange-500 to-red-500"
                              : "bg-gradient-to-r from-blue-500 to-purple-500"
                          }`}
                          style={{
                            width: `${Math.max(5, availabilityPercent)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
              </div>

              {/* Quantity Selector */}
              {isAvailable && (
                <div className="mt-6 flex flex-col items-center gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleDecrement(ticketType.id)}
                      disabled={disabled || quantity === 0}
                      className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-500 dark:hover:border-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
                      aria-label="Verlaag aantal"
                    >
                      <Minus className="w-5 h-5" />
                    </button>

                    <span className="min-w-[3rem] text-center text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                      {quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleIncrement(ticketType)}
                      disabled={disabled || quantity >= maxQuantity}
                      className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-blue-500 dark:border-blue-500 bg-blue-600 text-white hover:bg-blue-700 hover:border-blue-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:border-gray-300 dark:disabled:bg-gray-700 dark:disabled:border-gray-700 transition-all duration-200 active:scale-95 shadow-lg shadow-blue-500/25"
                      aria-label="Verhoog aantal"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {quantity > 0 && (
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Subtotaal
                      </p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatPrice(ticketType.price * quantity)}
                      </p>
                    </div>
                  )}

                  {quantity >= maxQuantity && maxQuantity < available && (
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                      Max. {maxPerType} per bestelling
                    </p>
                  )}
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
  paymentFee?: number; // in cents, optional payment fee passthrough
}

export function OrderSummary({
  selections,
  ticketTypes,
  serviceFee: preCalculatedServiceFee,
  paymentFee: preCalculatedPaymentFee,
}: OrderSummaryProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

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
    const paymentFee = preCalculatedPaymentFee ?? 0;
    const totalAmount = ticketTotal + serviceFee + paymentFee;

    return { items, ticketTotal, serviceFee, paymentFee, totalAmount };
  }, [
    selections,
    ticketTypes,
    preCalculatedServiceFee,
    preCalculatedPaymentFee,
  ]);

  if (summary.items.length === 0) {
    return null;
  }

  const totalTickets = summary.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <div className="public-card bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200 dark:border-blue-800 select-none">
      <div className="p-6 pointer-events-auto">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-bold text-gray-900 dark:text-white">
            Jouw selectie
          </h4>
          <span className="px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded-full">
            {totalTickets} {totalTickets === 1 ? "ticket" : "tickets"}
          </span>
        </div>

        <div className="space-y-3">
          {/* Ticket items */}
          {summary.items.map((item, index) => (
            <div
              key={index}
              className="flex justify-between items-center p-3 bg-white dark:bg-gray-800/50 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {item.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {item.quantity}× {formatPrice(item.total / item.quantity)}
                </p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white ml-4">
                {formatPrice(item.total)}
              </p>
            </div>
          ))}

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

          {/* Fees */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-700 dark:text-gray-300">
              <span>Subtotaal</span>
              <span className="font-medium">
                {formatPrice(summary.ticketTotal)}
              </span>
            </div>

            <div className="flex justify-between text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-1">
                <span>Servicekosten</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTooltip(
                      activeTooltip === "service" ? null : "service"
                    );
                  }}
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-400 dark:border-gray-500 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Uitleg over servicekosten"
                >
                  ?
                </button>
              </div>
              <span className="font-medium">
                {formatPrice(summary.serviceFee)}
              </span>
            </div>

            {activeTooltip === "service" && (
              <>
                <div
                  className="fixed inset-0 z-[100] bg-black/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTooltip(null);
                  }}
                  aria-hidden="true"
                />
                <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-80 max-w-[90vw] p-4 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-lg shadow-xl">
                  <p className="font-semibold mb-2">Servicekosten</p>
                  <p className="text-gray-300 dark:text-gray-400">
                    €0,50 vaste kosten + 2% van het ticketbedrag (max. €5,00).
                    Deze kosten dekken de ticketverwerking en administratie.
                  </p>
                </div>
              </>
            )}

            {summary.paymentFee > 0 && (
              <>
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <div className="flex items-center gap-1">
                    <span>Betaalkosten</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTooltip(
                          activeTooltip === "payment" ? null : "payment"
                        );
                      }}
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-400 dark:border-gray-500 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Uitleg over betaalkosten"
                    >
                      ?
                    </button>
                  </div>
                  <span className="font-medium">
                    {formatPrice(summary.paymentFee)}
                  </span>
                </div>

                {activeTooltip === "payment" && (
                  <>
                    <div
                      className="fixed inset-0 z-[100] bg-black/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTooltip(null);
                      }}
                      aria-hidden="true"
                    />
                    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-80 max-w-[90vw] p-4 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-lg shadow-xl">
                      <p className="font-semibold mb-2">Betaalkosten</p>
                      <p className="text-gray-300 dark:text-gray-400">
                        Deze kosten dekken de betalingsverwerking via iDEAL of
                        andere betaalmethoden. De daadwerkelijke kosten kunnen
                        per betaalmethode afwijken.
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Divider */}
          <div className="border-t-2 border-gray-300 dark:border-gray-600 my-4"></div>

          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Totaal
            </span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatPrice(summary.totalAmount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
