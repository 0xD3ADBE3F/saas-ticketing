"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  TicketSelector,
  OrderSummary,
  type TicketTypeForSelection,
  type TicketSelection,
} from "@/components/checkout";
import { PaymentTimer } from "@/components/checkout/PaymentTimer";
import { EmptyState } from "@/components/ui/empty-state";
import { Ticket, ArrowLeft } from "lucide-react";
import { formatPrice } from "@/lib/currency";

interface EventTicketsProps {
  eventSlug: string;
  eventTitle: string;
  ticketTypes: TicketTypeForSelection[];
  showTicketAvailability?: boolean;
}

type CheckoutStep = "select" | "checkout";

type OrderSummaryData = {
  serviceFee: number;
  ticketTotal: number;
  totalAmount: number;
  paymentFee?: number;
  items: {
    ticketTypeId: string;
    ticketTypeName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
};

export function EventTickets({
  eventSlug,
  eventTitle,
  ticketTypes,
  showTicketAvailability = true,
}: EventTicketsProps) {
  const router = useRouter();
  const [step, setStep] = useState<CheckoutStep>("select");
  const [selections, setSelections] = useState<TicketSelection[]>([]);
  const [summary, setSummary] = useState<OrderSummaryData | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Checkout form state
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Order state (created on step 2)
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const totalTickets = selections.reduce((sum, s) => sum + s.quantity, 0);
  const isFreeOrder = summary?.totalAmount === 0;

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
            paymentFee: data.paymentFee,
            items: data.items,
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

  const handleProceedToCheckout = async () => {
    if (totalTickets === 0) return;

    setError(null);
    setIsCreatingOrder(true);

    try {
      // Create order immediately when moving to checkout step
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventSlug,
          // buyerEmail and buyerName will be added later via PATCH
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

      // Store order info
      setCreatedOrderId(data.orderId);
      setOrderNumber(data.orderNumber);
      setExpiresAt(data.expiresAt ? new Date(data.expiresAt) : null);
      setStep("checkout");
    } catch {
      setError("Er ging iets mis bij het aanmaken van je bestelling");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleBackToSelect = () => {
    setStep("select");
    setError(null);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!createdOrderId) {
      setError("Geen bestelling gevonden");
      setIsSubmitting(false);
      return;
    }

    try {
      // Update order with buyer details
      const updateResponse = await fetch(`/api/checkout/${createdOrderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          buyerEmail: email,
          buyerName: name || undefined,
        }),
      });

      if (!updateResponse.ok) {
        const updateData = await updateResponse.json();
        setError(updateData.error || "Er ging iets mis");
        return;
      }

      // For free orders, redirect to complete page immediately
      if (isFreeOrder) {
        router.push(`/checkout/${createdOrderId}/complete`);
        return;
      }

      // For paid orders, initiate payment immediately
      const paymentResponse = await fetch(
        `/api/checkout/${createdOrderId}/pay`,
        {
          method: "POST",
        }
      );

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok) {
        setError(
          paymentData.error ||
            "Er ging iets mis bij het starten van de betaling"
        );
        return;
      }

      // Redirect to Mollie checkout
      if (paymentData.checkoutUrl) {
        window.location.href = paymentData.checkoutUrl;
      }
    } catch {
      setError("Er ging iets mis bij het plaatsen van je bestelling");
    } finally {
      setIsSubmitting(false);
    }
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

  // Checkout step: Show summary + form
  if (step === "checkout") {
    return (
      <div className="space-y-6 animate-fade-in-up">
        {/* Back button */}
        <button
          type="button"
          onClick={handleBackToSelect}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug naar ticketselectie
        </button>

        {/* Payment Timer */}
        {expiresAt && (
          <div className="animate-fade-in-up">
            <PaymentTimer expiresAt={expiresAt} eventSlug={eventSlug} />
          </div>
        )}

        {/* Order Summary */}
        {orderNumber && (
          <div className="mb-4 p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Bestelnummer
              </span>
              <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                #{orderNumber}
              </span>
            </div>
          </div>
        )}

        <OrderSummary
          selections={selections}
          ticketTypes={ticketTypes}
          paymentFee={summary?.paymentFee}
          serviceFee={summary?.serviceFee}
        />

        {/* Checkout Form */}
        <form onSubmit={handleSubmitOrder} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
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
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Je tickets worden naar dit adres gestuurd
            </p>
          </div>

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
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
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 animate-fade-in-up">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isLoadingSummary}
            className="public-btn public-btn-primary public-btn-xl w-full shadow-xl hover:shadow-2xl"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
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
                {isFreeOrder ? "Bevestigen..." : "Verwerken..."}
              </span>
            ) : (
              <span>
                {isFreeOrder
                  ? "Bevestigen"
                  : `Betalen (${formatPrice(summary?.totalAmount ?? 0)})`}
              </span>
            )}
          </button>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Door te {isFreeOrder ? "bevestigen" : "betalen"} ga je akkoord met
            onze{" "}
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

  // Selection step: Show ticket selector
  return (
    <div className="space-y-6">
      <TicketSelector
        ticketTypes={ticketTypes}
        selections={selections}
        onSelectionsChange={setSelections}
        showTicketAvailability={showTicketAvailability}
      />

      {totalTickets > 0 && (
        <div className="space-y-4 animate-fade-in-up">
          <OrderSummary
            selections={selections}
            ticketTypes={ticketTypes}
            paymentFee={summary?.paymentFee}
            serviceFee={summary?.serviceFee}
          />

          <button
            type="button"
            onClick={handleProceedToCheckout}
            disabled={isLoadingSummary || isCreatingOrder}
            className="public-btn public-btn-primary public-btn-xl w-full shadow-xl hover:shadow-2xl"
          >
            {isCreatingOrder
              ? "Bestelling aanmaken..."
              : isLoadingSummary
                ? "Berekenen..."
                : isFreeOrder
                  ? "Doorgaan naar bevestigen →"
                  : `Doorgaan naar afrekenen →`}
          </button>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            {isFreeOrder
              ? "Bevestig je gratis tickets"
              : "Je wordt doorgestuurd naar een beveiligde betaalpagina"}
          </p>
        </div>
      )}
    </div>
  );
}
