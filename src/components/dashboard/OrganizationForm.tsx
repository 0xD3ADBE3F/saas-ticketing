"use client";

import { useState } from "react";
import { updateOrganization } from "@/app/(dashboard)/dashboard/settings/actions";

interface OrganizationFormProps {
  organization: {
    id: string;
    name: string;
    email: string | null;
    kvkNumber: string | null;
    streetAddress: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
  };
}

export function OrganizationForm({ organization }: OrganizationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      kvkNumber: formData.get("kvkNumber") as string,
      streetAddress: formData.get("streetAddress") as string,
      postalCode: formData.get("postalCode") as string,
      city: formData.get("city") as string,
      country: formData.get("country") as string,
    };

    const result = await updateOrganization(data);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error || "Er is een fout opgetreden");
    }

    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Basisgegevens
        </h3>
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
          >
            Organisatienaam <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            defaultValue={organization.name}
            placeholder="Jouw organisatie"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
          >
            Contact E-mail <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            defaultValue={organization.email || ""}
            placeholder="contact@voorbeeld.nl"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Dit e-mailadres wordt gebruikt voor facturen
          </p>
        </div>
        <div>
          <label
            htmlFor="kvkNumber"
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
          >
            KVK-nummer <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="kvkNumber"
            name="kvkNumber"
            required
            defaultValue={organization.kvkNumber || ""}
            placeholder="12345678"
            maxLength={8}
            pattern="\d{8}"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            8 cijfers, verplicht voor facturering
          </p>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Factuuradres
        </h3>
        <div>
          <label
            htmlFor="streetAddress"
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
          >
            Straat en huisnummer <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="streetAddress"
            name="streetAddress"
            required
            defaultValue={organization.streetAddress || ""}
            placeholder="Hoofdstraat 123"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="postalCode"
              className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
            >
              Postcode <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="postalCode"
              name="postalCode"
              required
              defaultValue={organization.postalCode || ""}
              placeholder="1234AB"
              maxLength={7}
              pattern="\d{4}\s?[A-Za-z]{2}"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label
              htmlFor="city"
              className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
            >
              Plaats <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="city"
              name="city"
              required
              defaultValue={organization.city || ""}
              placeholder="Amsterdam"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="country"
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
          >
            Land <span className="text-red-500">*</span>
          </label>
          <select
            id="country"
            name="country"
            required
            defaultValue={organization.country || "NL"}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="NL">Nederland</option>
            <option value="BE">België</option>
            <option value="DE">Duitsland</option>
          </select>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400">
            Gegevens succesvol opgeslagen
          </p>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Opslaan..." : "Opslaan"}
        </button>
      </div>
    </form>
  );
}
