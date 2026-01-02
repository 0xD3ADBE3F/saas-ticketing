"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Event, EventStatus, VatRate } from "@/generated/prisma";
import { toDateTimeLocalValue } from "@/lib/date";
import { VAT_RATE_LABELS } from "@/server/lib/vat";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { Lock, Check, X, Loader2, Link2 } from "lucide-react";
import { generateSlug } from "@/lib/slug";

interface EventFormProps {
  event?: Event;
  mode: "create" | "edit";
  organizationId: string;
  organizationSlug: string;
}

interface FormData {
  title: string;
  slug: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  isPaid: boolean;
  vatRate: VatRate;
  passPaymentFeesToBuyer: boolean;
}

export function EventForm({
  event,
  mode,
  organizationId,
  organizationSlug,
}: EventFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Slug state
  const [slugAvailability, setSlugAvailability] = useState<{
    checking: boolean;
    available: boolean | null;
    error: string | null;
  }>({ checking: false, available: null, error: null });
  const [canChangeSlug, setCanChangeSlug] = useState<{
    allowed: boolean;
    reason?: string;
  }>({ allowed: true });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Default to tomorrow 20:00 - 23:00 for new events
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(20, 0, 0, 0);
    return toDateTimeLocalValue(date);
  };

  const getDefaultEndDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(23, 0, 0, 0);
    return toDateTimeLocalValue(date);
  };

  const [formData, setFormData] = useState<FormData>({
    title: event?.title || "",
    slug: event?.slug || "",
    description: event?.description || "",
    location: event?.location || "",
    startsAt: event?.startsAt
      ? toDateTimeLocalValue(event.startsAt)
      : getDefaultStartDate(),
    endsAt: event?.endsAt
      ? toDateTimeLocalValue(event.endsAt)
      : getDefaultEndDate(),
    isPaid: event?.isPaid ?? true,
    vatRate: event?.vatRate || "STANDARD_21",
    passPaymentFeesToBuyer: event?.passPaymentFeesToBuyer ?? false,
  });

  const debouncedSlug = useDebounce(formData.slug, 500);

  // Check slug changeability
  useEffect(() => {
    if (mode === "edit" && event) {
      async function checkSlugChangeability() {
        if (!event) return; // Type guard for async function
        try {
          const res = await fetch(
            `/api/events/can-change-slug?eventId=${event.id}`
          );
          if (res.ok) {
            const data = await res.json();
            setCanChangeSlug(data);
          }
        } catch (err) {
          console.error("Failed to check slug changeability:", err);
        }
      }
      checkSlugChangeability();
    }
  }, [mode, event]);

  // Check slug availability
  useEffect(() => {
    if (mode === "create" && !formData.slug) {
      setSlugAvailability({ checking: false, available: null, error: null });
      return;
    }
    if (mode === "edit" && event && debouncedSlug === event.slug) {
      setSlugAvailability({ checking: false, available: null, error: null });
      return;
    }
    if (!debouncedSlug || debouncedSlug.length < 3) {
      setSlugAvailability({ checking: false, available: null, error: null });
      return;
    }

    async function checkAvailability() {
      setSlugAvailability({ checking: true, available: null, error: null });
      try {
        const params = new URLSearchParams({
          slug: debouncedSlug,
          organizationId,
        });
        if (mode === "edit" && event) params.append("eventId", event.id);
        const res = await fetch(`/api/events/check-slug?${params}`);
        const data = await res.json();
        setSlugAvailability({
          checking: false,
          available: data.available,
          error: data.error || null,
        });
      } catch (err) {
        setSlugAvailability({
          checking: false,
          available: null,
          error: "Kon beschikbaarheid niet controleren",
        });
      }
    }
    checkAvailability();
  }, [debouncedSlug, mode, event, organizationId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === "radio") {
      setFormData((prev) => ({ ...prev, [name]: value === "true" }));
    } else {
      // Auto-populate slug from title
      if (name === "title" && !slugManuallyEdited) {
        const generatedSlug = generateSlug(value);
        setFormData((prev) => ({ ...prev, title: value, slug: generatedSlug }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (name === "slug") setSlugManuallyEdited(true);
      }
    }

    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const url =
        mode === "create" ? "/api/events" : `/api/events/${event?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          slug: formData.slug || undefined,
          description: formData.description || null,
          location: formData.location || null,
          startsAt: new Date(formData.startsAt).toISOString(),
          endsAt: new Date(formData.endsAt).toISOString(),
          isPaid: formData.isPaid,
          vatRate: formData.vatRate,
          passPaymentFeesToBuyer: formData.passPaymentFeesToBuyer,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Er is iets misgegaan");
        return;
      }

      router.push(`/dashboard/events/${data.event.id}`);
      router.refresh();
    } catch {
      setError("Er is iets misgegaan. Probeer het opnieuw.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;

    const confirmed = window.confirm(
      "Weet je zeker dat je dit evenement wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt."
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Er is iets misgegaan");
        return;
      }

      router.push("/dashboard/events");
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

      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Titel *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          maxLength={100}
          value={formData.title}
          onChange={handleChange}
          placeholder="bijv. Zomerfeest 2025"
          className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Slug */}
      <div>
        <label
          htmlFor="slug"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Evenement URL *
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Link2 className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type="text"
            id="slug"
            name="slug"
            required
            value={formData.slug}
            onChange={handleChange}
            disabled={mode === "edit" && !canChangeSlug.allowed}
            pattern="[a-z0-9-]+"
            minLength={3}
            maxLength={50}
            placeholder="bijv. zomerfeest-2025"
            className="w-full pl-10 pr-10 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {mode === "edit" && !canChangeSlug.allowed ? (
              <Lock className="w-4 h-4 text-gray-400" />
            ) : slugAvailability.checking ? (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            ) : !formData.slug ? null : mode === "edit" &&
              formData.slug ===
                event?.slug ? null : slugAvailability.available ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : slugAvailability.error ? (
              <X className="w-4 h-4 text-red-500" />
            ) : null}
          </div>
        </div>
        {mode === "edit" && !canChangeSlug.allowed ? (
          <p className="mt-1 text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            {canChangeSlug.reason}
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-gray-500">
              Beschikbaar op: getentro.app/e/{organizationSlug}/
              {formData.slug || "zomerfeest-2025"}
            </p>
            {slugAvailability.error &&
              formData.slug &&
              (mode === "create" || formData.slug !== event?.slug) && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {slugAvailability.error}
                </p>
              )}
          </>
        )}
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
          rows={4}
          maxLength={2000}
          value={formData.description}
          onChange={handleChange}
          placeholder="Vertel bezoekers meer over het evenement..."
          className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="mt-1 text-sm text-gray-500">
          {formData.description.length}/2000 karakters
        </p>
      </div>

      {/* Location */}
      <div>
        <label
          htmlFor="location"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Locatie
        </label>
        <input
          type="text"
          id="location"
          name="location"
          maxLength={200}
          value={formData.location}
          onChange={handleChange}
          placeholder="bijv. De Oosterpoort, Groningen"
          className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Date/Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="startsAt"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Startdatum & tijd *
          </label>
          <input
            type="datetime-local"
            id="startsAt"
            name="startsAt"
            required
            value={formData.startsAt}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label
            htmlFor="endsAt"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Einddatum & tijd *
          </label>
          <input
            type="datetime-local"
            id="endsAt"
            name="endsAt"
            required
            value={formData.endsAt}
            min={formData.startsAt}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Event Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Type evenement *
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="isPaid"
              value="true"
              checked={formData.isPaid === true}
              onChange={handleChange}
              className="mr-2"
            />
            <span className="text-gray-900 dark:text-white">
              Betaald evenement
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="isPaid"
              value="false"
              checked={formData.isPaid === false}
              onChange={handleChange}
              className="mr-2"
            />
            <span className="text-gray-900 dark:text-white">
              Gratis evenement
            </span>
          </label>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {formData.isPaid
            ? "Voor betaalde evenementen moet je een Mollie account koppelen om betalingen te ontvangen."
            : "Bij gratis evenementen kunnen tickets zonder prijs worden aangemaakt."}
        </p>
      </div>

      {/* VAT Rate (only for paid events) */}
      {formData.isPaid && (
        <div>
          <label
            htmlFor="vatRate"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            BTW-tarief *
          </label>
          <select
            id="vatRate"
            name="vatRate"
            value={formData.vatRate}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                vatRate: e.target.value as VatRate,
              }))
            }
            className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="STANDARD_21">{VAT_RATE_LABELS.STANDARD_21}</option>
            <option value="REDUCED_9">{VAT_RATE_LABELS.REDUCED_9}</option>
            <option value="EXEMPT">{VAT_RATE_LABELS.EXEMPT}</option>
          </select>
          <p className="mt-2 text-sm text-gray-500">
            Dit tarief wordt toegepast op alle tickets voor dit evenement. De
            ticketprijs blijft inclusief BTW zoals je deze invoert.
          </p>
        </div>
      )}

      {/* Pass Payment Fees to Buyer (only for paid events) */}
      {formData.isPaid && (
        <div>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              id="passPaymentFeesToBuyer"
              checked={formData.passPaymentFeesToBuyer}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  passPaymentFeesToBuyer: e.target.checked,
                }))
              }
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Betaalkosten doorberekenen aan koper
              </span>
              <p className="mt-1 text-sm text-gray-500">
                Toon betalingskosten als aparte regel in de checkout. Dit bedrag
                is een schatting; de daadwerkelijke kosten worden door Mollie
                aan jou gefactureerd.
              </p>
              {formData.passPaymentFeesToBuyer && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-700 dark:text-blue-300">
                  <strong>Let op:</strong> Kopers zien een extra regel
                  "Betaalkosten" (geschat €0,39 voor iDEAL) in hun winkelwagen.
                  De werkelijke kosten variëren per betaalmethode.
                </div>
              )}
            </div>
          </label>
        </div>
      )}

      {/*
      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
        <div>
          {mode === "edit" && event?.status === "DRAFT" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium disabled:opacity-50"
            >
              Verwijderen
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {isSubmitting
              ? "Bezig..."
              : mode === "create"
                ? "Evenement aanmaken"
                : "Wijzigingen opslaan"}
          </button>
        </div>
      </div>
    </form>
  );
}
