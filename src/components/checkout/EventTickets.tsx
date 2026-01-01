"use client";

import { useState, useEffect } from "react";
import {
  TicketSelector,
  OrderSummary,
  CheckoutForm,
  type TicketTypeForSelection,
  type TicketSelection,
} from "@/components/checkout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Ticket } from "lucide-react";

interface EventTicketsProps {
  eventSlug: string;
  eventTitle: string;
  ticketTypes: TicketTypeForSelection[];
}

type CheckoutStep = "select" | "checkout";

type OrderSummaryData = {
  serviceFee: number;
  ticketTotal: number;
  totalAmount: number;
  paymentFee?: number; // Optional payment fee passthrough
};

export function EventTickets({
  eventSlug,
  eventTitle,
  ticketTypes,
}: EventTicketsProps) {
  const [step, setStep] = useState<CheckoutStep>("select");
  const [selections, setSelections] = useState<TicketSelection[]>([]);
  const [summary, setSummary] = useState<OrderSummaryData | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const totalTickets = selections.reduce((sum, s) => sum + s.quantity, 0);

  // Fetch service fee from server when selections change
  useEffect(() => {
    if (totalTickets === 0) {
      setSummary(null);
      return;
    }

    const fetchSummary = async () => {
      setIsLoadingSummary(true);
      try {
        const items = selections
          .filter((s) => s.quantity > 0)
          .map((s) => ({
            ticketTypeId: s.ticketTypeId,
            quantity: s.quantity,
          }));

        const params = new URLSearchParams({
          eventSlug,
          items: JSON.stringify(items),
        });

        const res = await fetch(`/api/checkout?${params}`);
        const data = await res.json();

        if (res.ok && data) {
          setSummary({
            serviceFee: data.serviceFee,
            ticketTotal: data.ticketTotal,
            totalAmount: data.totalAmount,
            paymentFee: data.paymentFee, // Include payment fee if present
          });
        }
      } catch (error) {
        console.error("Failed to fetch order summary:", error);
      } finally {
        setIsLoadingSummary(false);
      }
    };

    fetchSummary();
  }, [selections, totalTickets, eventSlug]);

  const handleProceedToCheckout = () => {
    if (totalTickets > 0) {
      setStep("checkout");
    }
  };

  const handleBackToSelect = () => {
    setStep("select");
  };

  if (ticketTypes.length === 0) {
    return (
      <EmptyState
        icon={Ticket}
        title="Geen tickets beschikbaar"
        description="Er zijn nog geen tickets beschikbaar voor dit evenement."
      />
    );
  }

  if (step === "checkout") {
    return (
      <CheckoutForm
        eventSlug={eventSlug}
        eventTitle={eventTitle}
        selections={selections}
        ticketTypes={ticketTypes}
        onBack={handleBackToSelect}
      />
    );
  }

  return (
    <div className="space-y-6">
      <TicketSelector
        ticketTypes={ticketTypes}
        selections={selections}
        onSelectionsChange={setSelections}
      />

      {totalTickets > 0 && (
        <>
          <OrderSummary
            selections={selections}
            ticketTypes={ticketTypes}
            paymentFee={summary?.paymentFee}
            serviceFee={summary?.serviceFee}
          />

          <Button
            type="button"
            onClick={handleProceedToCheckout}
            disabled={isLoadingSummary}
            className="w-full"
            size="lg"
          >
            {isLoadingSummary
              ? "Berekenen..."
              : `Doorgaan naar afrekenen (${totalTickets} ${totalTickets === 1 ? "ticket" : "tickets"})`}
          </Button>
        </>
      )}
    </div>
  );
}
