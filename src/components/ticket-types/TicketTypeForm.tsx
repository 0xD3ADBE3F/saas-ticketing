"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { TicketType } from "@/generated/prisma";
import { toDateTimeLocalValue } from "@/lib/date";
import { centsToEuros } from "@/lib/currency";
import { FreeEventLimitInfo } from "@/components/events/FreeEventLimitInfo";
import { UnlockTicketsModal } from "@/components/events/UnlockTicketsModal";

interface TicketTypeFormProps {
  ticketType?: TicketType;
  eventId: string;
  eventIsPaid: boolean;
  mode: "create" | "edit";
}

interface FormData {
  name: string;
  description: string;
  price: string;
  capacity: string;
  saleStart: string;
  saleEnd: string;
}

export function TicketTypeForm({
  ticketType,
  eventId,
  eventIsPaid,
  mode,
}: TicketTypeFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockInfo, setUnlockInfo] = useState<{
    freeEventLimit: number;
    unlockFee: number;
    isUnlocked: boolean;
  } | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: ticketType?.name || "",
    description: ticketType?.description || "",
    price: ticketType
      ? centsToEuros(ticketType.price).toString()
      : eventIsPaid
        ? ""
        : "0",
    capacity: ticketType?.capacity.toString() || "100",
    saleStart: ticketType?.saleStart
      ? toDateTimeLocalValue(ticketType.saleStart)
      : "",
    saleEnd: ticketType?.saleEnd
      ? toDateTimeLocalValue(ticketType.saleEnd)
      : "",
  });

  // Fetch unlock info for free events
  useEffect(() => {
    if (!eventIsPaid) {
      async function fetchUnlockInfo() {
        try {
          const res = await fetch(`/api/events/${eventId}/check-limit`);
          if (res.ok) {
            const data = await res.json();
            setUnlockInfo({
              freeEventLimit: data.freeEventLimit,
              unlockFee: data.unlockFee,
              isUnlocked: data.isUnlocked,
            });
          }
        } catch (err) {
          console.error("Failed to fetch unlock info:", err);
        }
      }
      fetchUnlockInfo();
    }
  }, [eventId, eventIsPaid]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate price
    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      setError("Voer een geldige prijs in (minimaal €0)");
      setIsSubmitting(false);
      return;
    }

    // For paid events, price must be greater than 0
    if (eventIsPaid && price === 0) {
      setError("Voor betaalde evenementen moet de prijs groter zijn dan €0");
      setIsSubmitting(false);
      return;
    }

    // Validate capacity
    const capacity = parseInt(formData.capacity, 10);
    if (isNaN(capacity) || capacity < 1) {
      setError("Voer een geldige capaciteit in (minimaal 1)");
      setIsSubmitting(false);
      return;
    }

    // For free events, check capacity against limit
    if (!eventIsPaid && unlockInfo && !unlockInfo.isUnlocked) {
      // Check against API to validate total capacity
      try {
        const checkResponse = await fetch(
          `/api/events/${eventId}/check-limit`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newCapacity: capacity }),
          }
        );
        const checkData = await checkResponse.json();
        if (!checkData.allowed) {
          setError(
            `De totale capaciteit mag niet meer zijn dan ${unlockInfo.freeEventLimit} tickets voor gratis evenementen. Ontgrendel onbeperkte tickets om meer toe te voegen.`
          );
          setIsSubmitting(false);
          return;
        }
      } catch (err) {
        console.error("Failed to check capacity:", err);
      }
    }

    try {
      const url =
        mode === "create"
          ? `/api/events/${eventId}/ticket-types`
          : `/api/ticket-types/${ticketType?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const body: Record<string, unknown> = {
        name: formData.name,
        description: formData.description || null,
        price,
        capacity,
      };

      // Only include sale dates if provided
      if (formData.saleStart) {
        body.saleStart = new Date(formData.saleStart).toISOString();
      } else if (mode === "edit") {
        body.saleStart = null;
      }

      if (formData.saleEnd) {
        body.saleEnd = new Date(formData.saleEnd).toISOString();
      } else if (mode === "edit") {
        body.saleEnd = null;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Er is iets misgegaan");
        return;
      }

      router.push(`/dashboard/events/${eventId}`);
      router.refresh();
    } catch {
      setError("Er is iets misgegaan. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!ticketType) return;

    const confirmed = window.confirm(
      `Weet je zeker dat je "${ticketType.name}" wilt verwijderen?`
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/ticket-types/${ticketType.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Er is iets misgegaan");
        return;
      }

      router.push(`/dashboard/events/${eventId}`);
      router.refresh();
    } catch {
      setError("Er is iets misgegaan. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Naam *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          maxLength={100}
          value={formData.name}
          onChange={handleChange}
          placeholder="bijv. Early Bird, VIP, Regulier"
          className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Beschrijving
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={500}
          value={formData.description}
          onChange={handleChange}
          placeholder="Wat is er inbegrepen bij dit ticket?"
          className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="mt-1 text-sm text-gray-500">
          {formData.description.length}/500 karakters
        </p>
      </div>

      {/* Price and Capacity Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Price */}
        <div>
          <label
            htmlFor="price"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Prijs (€) *
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              €
            </span>
            <input
              type="number"
              id="price"
              name="price"
              required
              min="0"
              max="10000"
              step="0.01"
              value={formData.price}
              onChange={handleChange}
              disabled={!eventIsPaid}
              placeholder="0.00"
              className="w-full pl-8 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {eventIsPaid
              ? "Betaald evenement: prijs moet groter zijn dan €0"
              : "Gratis evenement: tickets zijn altijd gratis (€0)"}
          </p>
        </div>

        {/* Capacity */}
        <div>
          <label
            htmlFor="capacity"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Capaciteit *
          </label>
          <input
            type="number"
            id="capacity"
            name="capacity"
            required
            min={ticketType?.soldCount || 1}
            max={
              !eventIsPaid && unlockInfo && !unlockInfo.isUnlocked
                ? unlockInfo.freeEventLimit
                : 100000
            }
            value={formData.capacity}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {ticketType && ticketType.soldCount > 0 && (
            <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
              {ticketType.soldCount} al verkocht (minimale capaciteit)
            </p>
          )}
          {!eventIsPaid && unlockInfo && !unlockInfo.isUnlocked && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Maximale capaciteit: {unlockInfo.freeEventLimit} tickets (totaal
              voor alle ticket types)
            </p>
          )}
        </div>
      </div>

      {/* Free Event Limit Info */}
      {!eventIsPaid && unlockInfo && (
        <>
          <FreeEventLimitInfo
            freeEventLimit={unlockInfo.freeEventLimit}
            unlockFee={unlockInfo.unlockFee}
            isUnlocked={unlockInfo.isUnlocked}
            onUnlock={() => setShowUnlockModal(true)}
            showUnlockButton={true}
            context="ticketType"
          />
          <UnlockTicketsModal
            eventId={eventId}
            open={showUnlockModal}
            onOpenChange={setShowUnlockModal}
            unlockFeeAmount={unlockInfo.unlockFee}
            currentLimit={unlockInfo.freeEventLimit}
          />
        </>
      )}

      {/* Sale Window */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Verkoopperiode (optioneel)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Sale Start */}
          <div>
            <label
              htmlFor="saleStart"
              className="block text-sm text-gray-600 dark:text-gray-400 mb-1"
            >
              Verkoop start
            </label>
            <input
              type="datetime-local"
              id="saleStart"
              name="saleStart"
              value={formData.saleStart}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Sale End */}
          <div>
            <label
              htmlFor="saleEnd"
              className="block text-sm text-gray-600 dark:text-gray-400 mb-1"
            >
              Verkoop eindigt
            </label>
            <input
              type="datetime-local"
              id="saleEnd"
              name="saleEnd"
              value={formData.saleEnd}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <p className="text-sm text-gray-500">
          Laat leeg om direct te starten en geen einddatum in te stellen.
        </p>
      </div>

      {/* Buttons */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full sm:w-auto px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Annuleren
        </button>

        {mode === "edit" && ticketType && ticketType.soldCount === 0 && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Verwijderen
          </button>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto sm:ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? mode === "create"
              ? "Aanmaken..."
              : "Opslaan..."
            : mode === "create"
              ? "Tickettype aanmaken"
              : "Wijzigingen opslaan"}
        </button>
      </div>
    </form>
  );
}
