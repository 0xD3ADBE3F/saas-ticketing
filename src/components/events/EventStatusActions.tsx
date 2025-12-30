"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Event, EventStatus } from "@/generated/prisma";
import { EventPublishPaymentModal } from "./EventPublishPaymentModal";

interface EventStatusActionsProps {
  event: Event;
  isPayPerEvent?: boolean;
}

const statusTransitions: Record<
  EventStatus,
  {
    label: string;
    payPerEventLabel?: string;
    next: EventStatus;
    variant: "primary" | "secondary" | "danger";
  }[]
> = {
  DRAFT: [
    {
      label: "Live zetten",
      payPerEventLabel: "Betaal & Publiceer (€59,29)",
      next: "LIVE",
      variant: "primary",
    },
    { label: "Annuleren", next: "CANCELLED", variant: "danger" },
  ],
  LIVE: [
    { label: "Beëindigen", next: "ENDED", variant: "secondary" },
    { label: "Annuleren", next: "CANCELLED", variant: "danger" },
  ],
  ENDED: [], // No transitions from ENDED
  CANCELLED: [], // No transitions from CANCELLED
};

const variantClasses = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary:
    "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
  danger:
    "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30",
};

export function EventStatusActions({
  event,
  isPayPerEvent = false,
}: EventStatusActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<EventStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const transitions = statusTransitions[event.status];

  const handleStatusChange = async (newStatus: EventStatus) => {
    // Confirm dangerous actions
    if (newStatus === "CANCELLED") {
      const confirmed = window.confirm(
        "Weet je zeker dat je dit evenement wilt annuleren? Dit kan niet ongedaan worden gemaakt."
      );
      if (!confirmed) return;
    }

    if (newStatus === "LIVE") {
      // Show modal for pay-per-event, confirm dialog for others
      if (isPayPerEvent) {
        setShowPaymentModal(true);
        return;
      } else {
        const confirmed = window.confirm(
          "Weet je zeker dat je dit evenement live wilt zetten? Het wordt dan zichtbaar voor het publiek."
        );
        if (!confirmed) return;
      }
    }

    await processStatusChange(newStatus);
  };

  const processStatusChange = async (newStatus: EventStatus) => {
    setIsLoading(newStatus);
    setError(null);

    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Er is iets misgegaan");
        return;
      }

      // Check if payment is required (PAY_PER_EVENT plan)
      if (data.requiresPayment && data.checkoutUrl) {
        // Redirect to Mollie checkout
        window.location.href = data.checkoutUrl;
        return;
      }

      router.refresh();
    } catch {
      setError("Er is iets misgegaan. Probeer het opnieuw.");
    } finally {
      setIsLoading(null);
    }
  };

  const handlePaymentConfirm = () => {
    setShowPaymentModal(false);
    processStatusChange("LIVE");
  };

  if (transitions.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400 text-sm">
        {event.status === "ENDED"
          ? "Dit evenement is afgelopen."
          : "Dit evenement is geannuleerd."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {transitions.map((transition) => {
        const buttonLabel =
          isPayPerEvent && transition.payPerEventLabel
            ? transition.payPerEventLabel
            : transition.label;

        return (
          <button
            key={transition.next}
            onClick={() => handleStatusChange(transition.next)}
            disabled={isLoading !== null}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${variantClasses[transition.variant]}`}
          >
            {isLoading === transition.next ? "Bezig..." : buttonLabel}
          </button>
        );
      })}

      {event.status === "DRAFT" && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
          {isPayPerEvent ? (
            <>
              💰 Je betaalt €49 (excl. BTW) per evenement. Na betaling wordt je
              evenement direct live gezet.
            </>
          ) : (
            <>
              💡 Zet je evenement live om ticketverkoop te starten. Je kunt het
              daarna nog steeds bewerken.
            </>
          )}
        </p>
      )}

      {/* Payment Modal */}
      <EventPublishPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handlePaymentConfirm}
        isLoading={isLoading === "LIVE"}
      />
    </div>
  );
}
