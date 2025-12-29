"use client";

import { useState } from "react";

interface Ticket {
  id: string;
  code: string;
  status: "VALID" | "USED" | "REFUNDED";
  usedAt: string | null;
  ticketType: { name: string };
  order: {
    id: string;
    buyerEmail: string;
    buyerName: string | null;
  };
  scans: Array<{
    scannedAt: string;
    result: string;
  }>;
}

export function TicketSearch() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (query.trim().length < 3) {
      setError("Voer minimaal 3 tekens in");
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/scanner/search?query=${encodeURIComponent(query.trim())}`
      );

      if (!res.ok) {
        throw new Error("Zoeken mislukt");
      }

      const data = await res.json();
      setResults(data.tickets || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Er is een fout opgetreden"
      );
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VALID":
        return "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20";
      case "USED":
        return "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20";
      case "REFUNDED":
        return "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20";
      default:
        return "text-gray-700 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "VALID":
        return "Geldig";
      case "USED":
        return "Gebruikt";
      case "REFUNDED":
        return "Terugbetaald";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Zoek Tickets</h2>

        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label
              htmlFor="search-query"
              className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
            >
              E-mailadres
            </label>
            <input
              id="search-query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek op e-mailadres..."
              disabled={searching}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Minimaal 3 tekens vereist
            </p>
          </div>

          <button
            type="submit"
            disabled={searching || query.trim().length < 3}
            className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
          >
            {searching ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block animate-spin">⏳</span>
                Zoeken...
              </span>
            ) : (
              <span>🔍 Zoeken</span>
            )}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="font-semibold">
              {results.length} ticket{results.length !== 1 ? "s" : ""} gevonden
            </h3>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {results.map((ticket) => (
              <div
                key={ticket.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white mb-1">
                      {ticket.ticketType.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {ticket.order.buyerEmail}
                    </div>
                    {ticket.order.buyerName && (
                      <div className="text-sm text-gray-500 dark:text-gray-500">
                        {ticket.order.buyerName}
                      </div>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                      ticket.status
                    )}`}
                  >
                    {getStatusLabel(ticket.status)}
                  </span>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">
                      Code:
                    </span>{" "}
                    <span className="font-mono text-xs text-gray-900 dark:text-white">
                      {ticket.code}
                    </span>
                  </div>
                  {ticket.usedAt && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">
                        Gebruikt:
                      </span>{" "}
                      <span className="text-gray-900 dark:text-white">
                        {new Date(ticket.usedAt).toLocaleString("nl-NL", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Scan History */}
                {ticket.scans.length > 0 && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Scan geschiedenis ({ticket.scans.length})
                    </div>
                    <div className="space-y-1">
                      {ticket.scans.slice(0, 3).map((scan, idx) => (
                        <div
                          key={idx}
                          className="text-xs text-gray-600 dark:text-gray-400 flex justify-between"
                        >
                          <span>
                            {new Date(scan.scannedAt).toLocaleString("nl-NL", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="font-medium">{scan.result}</span>
                        </div>
                      ))}
                      {ticket.scans.length > 3 && (
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          + {ticket.scans.length - 3} meer
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {!searching &&
        !error &&
        query.trim().length >= 3 &&
        results.length === 0 && (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
            <div className="text-4xl mb-2">🔍</div>
            <p className="text-gray-600 dark:text-gray-400">
              Geen tickets gevonden voor &quot;{query}&quot;
            </p>
          </div>
        )}
    </div>
  );
}
