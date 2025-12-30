"use client";

import { useEffect, useState } from "react";

interface RecentScansProps {
  eventId: string;
  refreshKey: number;
}

interface Scan {
  id: string;
  ticketId: string;
  ticketCode: string;
  result: string;
  scannedAt: string;
  scannedBy: string;
  deviceId: string | null;
  ticketType: string;
  buyerEmail: string | null;
}

export function RecentScans({ eventId, refreshKey }: RecentScansProps) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    const fetchScans = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/scanner/recent/${eventId}?limit=${limit}`
        );
        if (!res.ok) {
          throw new Error("Failed to load recent scans");
        }
        const data = await res.json();
        setScans(data.scans || []);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load recent scans"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchScans();
  }, [eventId, refreshKey, limit]);

  const getResultColor = (result: string) => {
    switch (result) {
      case "VALID":
        return "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20";
      case "ALREADY_USED":
        return "text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20";
      case "INVALID":
      case "REFUNDED":
        return "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20";
      default:
        return "text-gray-700 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20";
    }
  };

  const getResultLabel = (result: string) => {
    switch (result) {
      case "VALID":
        return "✅ Geldig";
      case "ALREADY_USED":
        return "⚠️ Al gebruikt";
      case "INVALID":
        return "❌ Ongeldig";
      case "REFUNDED":
        return "❌ Terugbetaald";
      default:
        return result;
    }
  };

  if (loading && scans.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-gray-200 dark:bg-gray-700 rounded"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recente Scans</h2>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
          >
            <option value={10}>10 scans</option>
            <option value={20}>20 scans</option>
            <option value={50}>50 scans</option>
            <option value={100}>100 scans</option>
          </select>
        </div>

        {scans.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-2">📱</div>
            <p className="text-gray-600 dark:text-gray-400">
              Nog geen scans voor dit evenement
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800 max-h-[600px] overflow-y-auto">
            {scans.map((scan) => (
              <div
                key={scan.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white mb-1">
                      {scan.ticketType}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {scan.buyerEmail || "Geen e-mail"}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded whitespace-nowrap ${getResultColor(
                      scan.result
                    )}`}
                  >
                    {getResultLabel(scan.result)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-mono">{scan.ticketCode}</span>
                  <time>
                    {new Date(scan.scannedAt).toLocaleString("nl-NL", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </time>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-400">
          💡 Deze lijst toont de meest recente scans (inclusief duplicaten en
          ongeldige pogingen) en wordt automatisch ververst.
        </p>
      </div>
    </div>
  );
}
