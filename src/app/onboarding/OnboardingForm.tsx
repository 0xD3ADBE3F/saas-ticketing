"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
        <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
          ⚠️ {error}
        </div>
      )}

      {/* Organization Details */}
      <div className="space-y-4">
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
          🏢 Organisatiegegevens
        </h2>

        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
          >
            Organisatienaam *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            className="w-full px-4 py-3 sm:py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base sm:text-sm"
            placeholder="Bv. Festival Zomerpret"
          />
        </div>

        <div>
          <label
            htmlFor="slug"
            className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
          >
            🔗 Jouw unieke URL *
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
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
            💡 Alleen kleine letters, cijfers en streepjes
          </p>
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
          >
            📧 Contact e-mail *
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 sm:py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base sm:text-sm"
            placeholder="info@festival-zomerpret.nl"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
            📬 Voor belangrijke updates over je evenementen
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !name || !slug || !email}
        className="w-full py-3.5 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg text-base sm:text-sm"
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
            🚀 Start mijn evenement
          </span>
        )}
      </button>
    </form>
  );
}
