"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toDateTimeLocalValue } from "@/lib/date";

/**
 * Simplified event creation form for onboarding
 * Only asks for essential fields: title, date, location, and if event is paid
 */
export function OnboardingEventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get("onboarding") === "true";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default to tomorrow 20:00 - 23:00
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

  const [formData, setFormData] = useState({
    title: "",
    location: "",
    startsAt: getDefaultStartDate(),
    endsAt: getDefaultEndDate(),
    isPaid: true, // Default to paid event
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          location: formData.location || null,
          startsAt: new Date(formData.startsAt).toISOString(),
          endsAt: new Date(formData.endsAt).toISOString(),
          isPaid: formData.isPaid,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Er is iets misgegaan");
        return;
      }

      // If onboarding, show success and redirect to event detail
      if (isOnboarding) {
        router.push(`/dashboard/events/${data.event.id}?welcome=true`);
      } else {
        router.push(`/dashboard/events/${data.event.id}`);
      }
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
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Evenementnaam *
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
          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
        />
      </div>

      {/* Location */}
      <div>
        <label
          htmlFor="location"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Locatie (optioneel)
        </label>
        <input
          type="text"
          id="location"
          name="location"
          maxLength={200}
          value={formData.location}
          onChange={handleChange}
          placeholder="bijv. De Oosterpoort, Groningen"
          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Date & Time */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="startsAt"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Start *
          </label>
          <input
            type="datetime-local"
            id="startsAt"
            name="startsAt"
            required
            value={formData.startsAt}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label
            htmlFor="endsAt"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Eind *
          </label>
          <input
            type="datetime-local"
            id="endsAt"
            name="endsAt"
            required
            value={formData.endsAt}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Is Paid Event */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="isPaid"
            name="isPaid"
            checked={!formData.isPaid}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, isPaid: !e.target.checked }))
            }
            className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-1">
            <label
              htmlFor="isPaid"
              className="font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
            >
              Dit is een gratis evenement
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Vink dit aan als je geen betalingen hoeft te ontvangen. Je hoeft
              dan geen betaalaccount te activeren.
            </p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Bezig met aanmaken..." : "Evenement aanmaken"}
        </button>

        {isOnboarding && (
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
          >
            Annuleren
          </button>
        )}
      </div>

      {isOnboarding && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Je kunt later meer details toevoegen, zoals een beschrijving en
          tickettypes
        </p>
      )}
    </form>
  );
}
