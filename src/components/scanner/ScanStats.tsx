"use client";

import { useEffect, useState } from "react";

interface ScanStatsProps {
  eventId: string;
  refreshKey: number;
}

interface Stats {
  totalTicketsSold: number;
  totalScanned: number;
  duplicateScanAttempts: number;
  scanPercentage: number;
}

export function ScanStats({ eventId, refreshKey }: ScanStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/scanner/stats/${eventId}`);
        if (!res.ok) {
          throw new Error("Failed to load stats");
        }
        const data = await res.json();
        setStats(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stats");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [eventId, refreshKey]);

  if (loading && !stats) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-gray-200 dark:bg-gray-700 rounded"
              ></div>
            ))}
          </div>
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

  if (!stats) return null;

  const remaining = stats.totalTicketsSold - stats.totalScanned;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 md:p-6">
      <h2 className="text-lg font-semibold mb-4">Live Statistieken</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Sold */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            {stats.totalTicketsSold}
          </div>
          <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Verkocht
          </div>
        </div>

        {/* Scanned */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="text-2xl md:text-3xl font-bold text-green-700 dark:text-green-400">
            {stats.totalScanned}
          </div>
          <div className="text-xs md:text-sm text-green-600 dark:text-green-500 mt-1">
            Gescand
          </div>
        </div>

        {/* Remaining */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="text-2xl md:text-3xl font-bold text-blue-700 dark:text-blue-400">
            {remaining}
          </div>
          <div className="text-xs md:text-sm text-blue-600 dark:text-blue-500 mt-1">
            Resterend
          </div>
        </div>

        {/* Percentage */}
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <div className="text-2xl md:text-3xl font-bold text-purple-700 dark:text-purple-400">
            {stats.scanPercentage}%
          </div>
          <div className="text-xs md:text-sm text-purple-600 dark:text-purple-500 mt-1">
            Voortgang
          </div>
        </div>
      </div>

      {/* Duplicate attempts */}
      {stats.duplicateScanAttempts > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
            <span>⚠️</span>
            <span>
              {stats.duplicateScanAttempts} dubbele scan
              {stats.duplicateScanAttempts !== 1 ? "s" : ""} gedetecteerd
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
