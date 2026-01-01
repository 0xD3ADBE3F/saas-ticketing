"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Link as LinkIcon,
  Mail,
  Rocket,
  Lightbulb,
  AlertCircle,
} from "lucide-react";

interface OnboardingFormProps {
  defaultEmail: string;
}

export function OnboardingForm({ defaultEmail }: OnboardingFormProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState(defaultEmail);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Auto-generate slug from name
  function handleNameChange(value: string) {
    setName(value);
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(generatedSlug);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          email: email || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Er is iets misgegaan");
        setLoading(false);
        return;
      }

      // Redirect to welcome screen after organization creation
      router.push("/welcome");
      router.refresh();
    } catch {
      setError("Er is iets misgegaan");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
      {error && (
        <div className="p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-2 border-red-200 dark:border-red-800 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
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

      {/* Organization Details */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
            Organisatiegegevens
          </h2>
        </div>

        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
          >
            Organisatienaam *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Building2 className="w-4 h-4 text-gray-400" />
            </div>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 sm:py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base sm:text-sm"
              placeholder="Bv. Festival Zomerpret"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="slug"
            className="flex items-center gap-2 text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
          >
            <LinkIcon className="w-4 h-4" />
            Jouw unieke URL *
          </label>
          <div className="flex items-center gap-2 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 sm:py-2.5 bg-white dark:bg-gray-950 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
            <span className="text-gray-400 dark:text-gray-500 text-sm shrink-0">
              entro.nl/
            </span>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              required
              pattern="[a-z0-9-]+"
              className="flex-1 bg-transparent focus:outline-none text-base sm:text-sm"
              placeholder="festival-zomerpret"
            />
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Alleen kleine letters, cijfers en streepjes
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="email"
            className="flex items-center gap-2 text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
          >
            <Mail className="w-4 h-4" />
            Contact e-mail *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="w-4 h-4 text-gray-400" />
            </div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 sm:py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base sm:text-sm"
              placeholder="info@festival-zomerpret.nl"
            />
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Voor belangrijke updates over je evenementen
            </p>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !name || !slug || !email}
        className="w-full min-h-[48px] py-3.5 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg text-base sm:text-sm active:scale-95"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
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
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Bezig met aanmaken...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Rocket className="w-5 h-5" />
            Start mijn evenement
          </span>
        )}
      </button>
    </form>
  );
}
