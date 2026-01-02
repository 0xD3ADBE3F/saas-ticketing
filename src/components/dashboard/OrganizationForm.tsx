"use client";

import { useState } from "react";
import {
  Building2,
  Mail,
  User,
  MapPin,
  Hash,
  FileText,
  CheckCircle2,
  AlertCircle,
  Link2,
} from "lucide-react";
import { updateOrganization } from "@/app/(dashboard)/dashboard/settings/actions";

interface OrganizationFormProps {
  organization: {
    id: string;
    name: string;
    slug: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    streetAndNumber: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
    registrationNumber: string | null;
    vatNumber: string | null;
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
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      streetAndNumber: formData.get("streetAndNumber") as string,
      postalCode: formData.get("postalCode") as string,
      city: formData.get("city") as string,
      country: formData.get("country") as string,
      registrationNumber: formData.get("registrationNumber") as string,
      vatNumber: formData.get("vatNumber") as string,
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
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Basisgegevens
          </h3>
        </div>
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
          >
            Organisatienaam <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Building2 className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              id="name"
              name="name"
              required
              defaultValue={organization.name}
              placeholder="Jouw organisatie"
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
          >
            Contact E-mail <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="email"
              id="email"
              name="email"
              required
              defaultValue={organization.email || ""}
              placeholder="contact@voorbeeld.nl"
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
            Dit e-mailadres wordt gebruikt voor facturen
          </p>
          <div>
            <label
              htmlFor="slug"
              className="pt-5 block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
            >
              Organisatie URL
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Link2 className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                id="slug"
                name="slug"
                disabled
                defaultValue={organization.slug}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              Jouw evenementen zijn beschikbaar op: getentro.app/e/
              {organization.slug}/...
            </p>
          </div>
        </div>
      </div>

      {/* Contact Person */}
      <div className="space-y-4 pt-6 border-t-2 border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Contactpersoon
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Vereist voor Mollie onboarding
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
            >
              Voornaam <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                id="firstName"
                name="firstName"
                required
                defaultValue={organization.firstName || ""}
                placeholder="Jan"
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
            >
              Achternaam <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                id="lastName"
                name="lastName"
                required
                defaultValue={organization.lastName || ""}
                placeholder="de Vries"
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4 pt-6 border-t-2 border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Factuuradres
          </h3>
        </div>
        <div>
          <label
            htmlFor="streetAndNumber"
            className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
          >
            Straat en huisnummer <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              id="streetAndNumber"
              name="streetAndNumber"
              required
              defaultValue={organization.streetAndNumber || ""}
              placeholder="Hoofdstraat 123"
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="postalCode"
              className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
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
              className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label
              htmlFor="city"
              className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
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
              className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="country"
            className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
          >
            Land <span className="text-red-500">*</span>
          </label>
          <select
            id="country"
            name="country"
            required
            defaultValue={organization.country || "NL"}
            className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
          >
            <option value="NL">Nederland</option>
            <option value="BE">België</option>
            <option value="DE">Duitsland</option>
          </select>
        </div>
      </div>

      {/* Business Details */}
      <div className="space-y-4 pt-6 border-t-2 border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
            <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Bedrijfsgegevens (optioneel)
          </h3>
        </div>
        <div>
          <label
            htmlFor="registrationNumber"
            className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
          >
            KVK-nummer
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Hash className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              id="registrationNumber"
              name="registrationNumber"
              defaultValue={organization.registrationNumber || ""}
              placeholder="12345678"
              maxLength={8}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="vatNumber"
            className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
          >
            BTW-nummer
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Hash className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              id="vatNumber"
              name="vatNumber"
              defaultValue={organization.vatNumber || ""}
              placeholder="NL123456789B01"
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
            Bijvoorbeeld: NL123456789B01
          </p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-2 border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-sm text-red-700 dark:text-red-300 font-medium flex-1">
              {error}
            </p>
          </div>
        </div>
      )}
      {success && (
        <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-200 dark:border-green-800 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm text-green-700 dark:text-green-300 font-medium flex-1">
              Gegevens succesvol opgeslagen
            </p>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-[48px] px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg hover:shadow-xl"
        >
          {isSubmitting ? "Opslaan..." : "Wijzigingen opslaan"}
        </button>
      </div>
    </form>
  );
}
