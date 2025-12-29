"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OnboardingForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ name, slug, email: email || undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Er is iets misgegaan");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Er is iets misgegaan");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Organisatienaam *
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Mijn Organisatie"
        />
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium mb-1">
          URL slug *
        </label>
        <div className="flex items-center">
          <span className="text-gray-500 dark:text-gray-400 text-sm mr-1">
            tickets.nl/
          </span>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            required
            pattern="[a-z0-9-]+"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="mijn-organisatie"
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Alleen kleine letters, cijfers en streepjes
        </p>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Contact e-mail (optioneel)
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="contact@organisatie.nl"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !name || !slug}
        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Bezig met aanmaken..." : "Organisatie aanmaken"}
      </button>
    </form>
  );
}
