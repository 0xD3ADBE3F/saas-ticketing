"use client";

import { useState, useRef, useEffect } from "react";

interface TicketScannerProps {
  eventId: string;
  onScanComplete: () => void;
}

interface ScanResult {
  success: boolean;
  result?: "VALID" | "ALREADY_USED" | "INVALID" | "REFUNDED";
  message?: string;
  ticket?: {
    id: string;
    code: string;
    ticketType: { name: string };
    order: { buyerEmail: string };
  };
}

export function TicketScanner({ eventId, onScanComplete }: TicketScannerProps) {
  const [ticketCode, setTicketCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input for quick scanning
  useEffect(() => {
    inputRef.current?.focus();
  }, [result]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ticketCode.trim()) return;

    setScanning(true);
    setResult(null);

    try {
      const res = await fetch("/api/scanner/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketToken: ticketCode.trim(),
          eventId,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResult(data);
        setTicketCode("");
        onScanComplete();

        // Clear success message after 3 seconds
        setTimeout(() => setResult(null), 3000);
      } else {
        setResult({
          success: false,
          result: data.result,
          message: data.message || "Scan mislukt",
        });
        setTicketCode("");
      }
    } catch {
      setResult({
        success: false,
        message: "Verbindingsfout - probeer opnieuw",
      });
    } finally {
      setScanning(false);
    }
  };

  const getResultColor = (result: ScanResult) => {
    if (result.success) return "green";
    if (result.result === "ALREADY_USED") return "orange";
    if (result.result === "REFUNDED") return "red";
    return "red";
  };

  const getResultIcon = (result: ScanResult) => {
    if (result.success) return "✅";
    if (result.result === "ALREADY_USED") return "⚠️";
    if (result.result === "REFUNDED") return "❌";
    return "❌";
  };

  const resultColor = result ? getResultColor(result) : null;

  return (
    <div className="space-y-6">
      {/* Scanner Input */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Scan Ticket</h2>

        <form onSubmit={handleScan} className="space-y-4">
          <div>
            <label
              htmlFor="ticket-code"
              className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
            >
              Ticketcode
            </label>
            <input
              ref={inputRef}
              id="ticket-code"
              type="text"
              value={ticketCode}
              onChange={(e) => setTicketCode(e.target.value)}
              placeholder="Voer ticketcode in of scan QR"
              disabled={scanning}
              className="w-full px-4 py-3 text-lg border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              autoComplete="off"
              autoFocus
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              💡 Tip: Focus blijft op dit veld voor snelle scans
            </p>
          </div>

          <button
            type="submit"
            disabled={scanning || !ticketCode.trim()}
            className="w-full px-6 py-4 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
          >
            {scanning ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block animate-spin">⏳</span>
                Scannen...
              </span>
            ) : (
              <span>📱 Scan Ticket</span>
            )}
          </button>
        </form>
      </div>

      {/* Result Display */}
      {result && (
        <div
          className={`rounded-lg p-6 border-2 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            resultColor === "green"
              ? "bg-green-50 dark:bg-green-900/20 border-green-500"
              : resultColor === "orange"
                ? "bg-orange-50 dark:bg-orange-900/20 border-orange-500"
                : "bg-red-50 dark:bg-red-900/20 border-red-500"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="text-4xl">{getResultIcon(result)}</div>
            <div className="flex-1 min-w-0">
              <h3
                className={`text-lg font-semibold mb-1 ${
                  resultColor === "green"
                    ? "text-green-800 dark:text-green-300"
                    : resultColor === "orange"
                      ? "text-orange-800 dark:text-orange-300"
                      : "text-red-800 dark:text-red-300"
                }`}
              >
                {result.success ? "Ticket Geldig!" : "Scan Mislukt"}
              </h3>
              <p
                className={`text-sm mb-3 ${
                  resultColor === "green"
                    ? "text-green-700 dark:text-green-400"
                    : resultColor === "orange"
                      ? "text-orange-700 dark:text-orange-400"
                      : "text-red-700 dark:text-red-400"
                }`}
              >
                {result.message}
              </p>

              {result.ticket && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Type:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {result.ticket.ticketType.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Email:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white truncate ml-2">
                      {result.ticket.order.buyerEmail}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Code:
                    </span>
                    <span className="font-mono text-xs font-medium text-gray-900 dark:text-white">
                      {result.ticket.code}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
          📖 Hoe te scannen
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
          <li>• Scan de QR-code met een barcode scanner</li>
          <li>• Of voer de ticketcode handmatig in</li>
          <li>• Het systeem controleert automatisch op duplicaten</li>
          <li>• Eerste scan wint bij conflicten</li>
        </ul>
      </div>
    </div>
  );
}
