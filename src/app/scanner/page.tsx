"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ScannerLoginPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (code.length !== 6) {
      setError("Voer een 6-cijferige code in");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/scanner/auth/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ongeldige code");
        return;
      }

      // Store session in localStorage
      localStorage.setItem("scanner_token", data.token);
      localStorage.setItem("scanner_terminal", JSON.stringify(data.terminal));
      localStorage.setItem("scanner_org", JSON.stringify(data.organization));
      if (data.event) {
        localStorage.setItem("scanner_event", JSON.stringify(data.event));
      }

      // Redirect to scanner main page
      if (data.event) {
        router.push(`/scanner/scan/${data.event.id}`);
      } else {
        router.push("/scanner/events");
      }
    } catch {
      setError("Verbindingsfout - probeer opnieuw");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (value.length <= 6) {
      setCode(value);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="text-5xl mb-2">🎟️</div>
        <h1 className="text-2xl font-bold">Entro Scanner</h1>
        <p className="text-gray-400 mt-2">Voer de terminal code in</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-6">
        {/* Code Input */}
        <div>
          <label htmlFor="code" className="sr-only">
            Terminal Code
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={handleCodeChange}
            placeholder="ABC123"
            maxLength={6}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={loading}
            className="w-full text-center text-4xl tracking-[0.5em] py-4 px-6 bg-gray-800 border-2 border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors placeholder:text-gray-600 placeholder:tracking-[0.25em] disabled:opacity-50"
          />
          <p className="text-center text-xs text-gray-500 mt-2">
            6 tekens (3 letters + 3 cijfers)
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block animate-spin">⏳</span>
              Inloggen...
            </span>
          ) : (
            "Inloggen"
          )}
        </button>
      </form>

      {/* Help Text */}
      <div className="mt-8 text-center text-sm text-gray-500 max-w-xs">
        <p>
          Vraag de terminal code aan bij een administrator van de organisatie.
        </p>
      </div>
    </div>
  );
}
