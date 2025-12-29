"use client";

import { useState } from "react";

interface ManualOverrideProps {
  onOverrideComplete: () => void;
}

interface TicketInfo {
  id: string;
  code: string;
  status: "VALID" | "USED" | "REFUNDED";
  usedAt: string | null;
  ticketType: { name: string };
  order: {
    buyerEmail: string;
    buyerName: string | null;
  };
}

export function ManualOverride({ onOverrideComplete }: ManualOverrideProps) {
  const [ticketId, setTicketId] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Override form state
  const [newStatus, setNewStatus] = useState<"VALID" | "USED">("USED");
  const [reason, setReason] = useState("");
  const [overriding, setOverriding] = useState(false);

  const handleFetchTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ticketId.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setTicketInfo(null);

    try {
      const res = await fetch(
        `/api/scanner/override?ticketId=${encodeURIComponent(ticketId.trim())}`
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Ticket niet gevonden");
      }

      const data = await res.json();
      setTicketInfo(data.ticket);
      setNewStatus(data.ticket.status === "USED" ? "VALID" : "USED");
      setReason("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Er is een fout opgetreden"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ticketInfo || !reason.trim()) return;

    setOverriding(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/scanner/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: ticketInfo.id,
          newStatus,
          reason: reason.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Override mislukt");
      }

      const data = await res.json();
      setSuccess(data.message || "Status succesvol aangepast");
      setTicketInfo(null);
      setTicketId("");
      setReason("");
      onOverrideComplete();

      // Clear success after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Er is een fout opgetreden"
      );
    } finally {
      setOverriding(false);
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

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="text-2xl">⚠️</div>
          <div>
            <h3 className="font-semibold text-orange-900 dark:text-orange-300 mb-1">
              Alleen voor Administrators
            </h3>
            <p className="text-sm text-orange-800 dark:text-orange-400">
              Deze functie is bedoeld voor uitzonderingssituaties. Alle
              wijzigingen worden gelogd in het audit log en kunnen niet ongedaan
              gemaakt worden.
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-500 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <p className="text-green-800 dark:text-green-400 font-medium">
              {success}
            </p>
          </div>
        </div>
      )}

      {/* Step 1: Find Ticket */}
      {!ticketInfo && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Stap 1: Zoek Ticket</h2>

          <form onSubmit={handleFetchTicket} className="space-y-4">
            <div>
              <label
                htmlFor="ticket-id"
                className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
              >
                Ticket ID
              </label>
              <input
                id="ticket-id"
                type="text"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                placeholder="Voer ticket ID in..."
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !ticketId.trim()}
              className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
            >
              {loading ? "Laden..." : "🔍 Zoek Ticket"}
            </button>
          </form>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Step 2: Override */}
      {ticketInfo && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 space-y-6">
          <h2 className="text-lg font-semibold">Stap 2: Override Status</h2>

          {/* Current Ticket Info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-gray-900 dark:text-white mb-1">
                  {ticketInfo.ticketType.name}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {ticketInfo.order.buyerEmail}
                </div>
                {ticketInfo.order.buyerName && (
                  <div className="text-sm text-gray-500 dark:text-gray-500">
                    {ticketInfo.order.buyerName}
                  </div>
                )}
              </div>
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                  ticketInfo.status
                )}`}
              >
                {ticketInfo.status}
              </span>
            </div>

            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Code:</span>
                <span className="font-mono text-gray-900 dark:text-white">
                  {ticketInfo.code}
                </span>
              </div>
              {ticketInfo.usedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Gebruikt op:
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(ticketInfo.usedAt).toLocaleString("nl-NL")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Cannot override refunded tickets */}
          {ticketInfo.status === "REFUNDED" ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-500 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-400 text-sm">
                ❌ Terugbetaalde tickets kunnen niet worden aangepast. De status
                kan alleen worden gewijzigd voor VALID en USED tickets.
              </p>
              <button
                onClick={() => {
                  setTicketInfo(null);
                  setTicketId("");
                }}
                className="mt-3 text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                ← Zoek ander ticket
              </button>
            </div>
          ) : (
            <form onSubmit={handleOverride} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Nieuwe Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) =>
                    setNewStatus(e.target.value as "VALID" | "USED")
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                >
                  <option value="VALID">VALID - Ticket is geldig</option>
                  <option value="USED">
                    USED - Ticket als gebruikt markeren
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="override-reason"
                  className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
                >
                  Reden (verplicht) *
                </label>
                <textarea
                  id="override-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Leg uit waarom deze status handmatig wordt aangepast..."
                  rows={4}
                  minLength={10}
                  maxLength={500}
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {reason.length}/500 tekens (minimaal 10 vereist)
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTicketInfo(null);
                    setTicketId("");
                    setReason("");
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={
                    overriding ||
                    !reason.trim() ||
                    reason.length < 10 ||
                    ticketInfo.status === newStatus
                  }
                  className="flex-1 px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-orange-600"
                >
                  {overriding ? "Bezig..." : "⚠️ Override Uitvoeren"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
          📖 Wanneer gebruiken?
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
          <li>• Ticket per ongeluk gescand (reset naar VALID)</li>
          <li>• Handmatig ticket als gebruikt markeren zonder scan</li>
          <li>• Correctie van technische fouten</li>
          <li>• Alleen voor uitzonderlijke situaties</li>
        </ul>
      </div>
    </div>
  );
}
