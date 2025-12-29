"use client";

import { useState, useEffect, useCallback } from "react";
import { ScanStats } from "./ScanStats";
import { TicketScanner } from "./TicketScanner";
import { TicketSearch } from "./TicketSearch";
import { RecentScans } from "./RecentScans";
import { ManualOverride } from "./ManualOverride";

interface ScannerInterfaceProps {
  eventId: string;
  eventName: string;
  isAdmin: boolean;
}

export function ScannerInterface({
  eventId,
  eventName,
  isAdmin,
}: ScannerInterfaceProps) {
  const [activeTab, setActiveTab] = useState<
    "scan" | "stats" | "search" | "recent" | "override"
  >("scan");
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    const interval = setInterval(triggerRefresh, 30000);
    return () => clearInterval(interval);
  }, [triggerRefresh]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">{eventName}</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Live scanning dashboard
        </p>
      </div>

      {/* Stats Banner */}
      <div className="mb-6">
        <ScanStats eventId={eventId} refreshKey={refreshKey} />
      </div>

      {/* Mobile Tab Navigation */}
      <div className="flex overflow-x-auto gap-2 mb-6 pb-2 border-b border-gray-200 dark:border-gray-800 -mx-4 px-4">
        <button
          onClick={() => setActiveTab("scan")}
          className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${
            activeTab === "scan"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          📱 Scannen
        </button>
        <button
          onClick={() => setActiveTab("search")}
          className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${
            activeTab === "search"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          🔍 Zoeken
        </button>
        <button
          onClick={() => setActiveTab("recent")}
          className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${
            activeTab === "recent"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          📋 Recent
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab("override")}
            className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${
              activeTab === "override"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            ⚠️ Override
          </button>
        )}
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === "scan" && (
          <TicketScanner eventId={eventId} onScanComplete={triggerRefresh} />
        )}
        {activeTab === "search" && <TicketSearch />}
        {activeTab === "recent" && (
          <RecentScans eventId={eventId} refreshKey={refreshKey} />
        )}
        {activeTab === "override" && isAdmin && (
          <ManualOverride onOverrideComplete={triggerRefresh} />
        )}
      </div>
    </div>
  );
}
