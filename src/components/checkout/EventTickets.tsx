"use client";

import { useState } from "react";
import {
  TicketSelector,
  OrderSummary,
  CheckoutForm,
  type TicketTypeForSelection,
  type TicketSelection,
} from "@/components/checkout";

interface EventTicketsProps {
  eventSlug: string;
  eventTitle: string;
  ticketTypes: TicketTypeForSelection[];
}

type CheckoutStep = "select" | "checkout";

export function EventTickets({
  eventSlug,
  eventTitle,
  ticketTypes,
}: EventTicketsProps) {
  const [step, setStep] = useState<CheckoutStep>("select");
  const [selections, setSelections] = useState<TicketSelection[]>([]);

  const totalTickets = selections.reduce((sum, s) => sum + s.quantity, 0);

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
      <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">
          Er zijn nog geen tickets beschikbaar voor dit evenement.
        </p>
      </div>
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
          <OrderSummary selections={selections} ticketTypes={ticketTypes} />

          <button
            type="button"
            onClick={handleProceedToCheckout}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Doorgaan naar afrekenen ({totalTickets}{" "}
            {totalTickets === 1 ? "ticket" : "tickets"})
          </button>
        </>
      )}
    </div>
  );
}
