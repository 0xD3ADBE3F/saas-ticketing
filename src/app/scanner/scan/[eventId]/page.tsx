"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRScanner } from "@/components/scanner/QRScanner";

interface Stats {
  totalSold: number;
  totalScanned: number;
  totalDuplicates: number;
  scanPercentage: number;
}

interface ScanResult {
  success: boolean;
  result: "VALID" | "ALREADY_USED" | "INVALID" | "REFUNDED";
  message: string;
  ticket?: {
    id: string;
    code: string;
    eventTitle: string;
    ticketTypeName: string;
  };
}

interface Props {
  params: Promise<{ eventId: string }>;
}

export default function ScannerPage({ params }: Props) {
  const { eventId } = use(params);
  const router = useRouter();

  const [terminal, setTerminal] = useState<{ id: string; name: string } | null>(
    null
  );
  const [event, setEvent] = useState<{ id: string; title: string } | null>(
    null
  );
  const [stats, setStats] = useState<Stats | null>(null);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannerActive, setScannerActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get token from localStorage
  const getToken = useCallback(() => {
    return localStorage.getItem("scanner_token");
  }, []);

  // Load initial data
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/scanner");
      return;
    }

    // Load terminal info
    const terminalData = localStorage.getItem("scanner_terminal");
    if (terminalData) {
      setTerminal(JSON.parse(terminalData));
    }

    // Load stats
    const fetchStats = async () => {
      try {
        const res = await fetch(
          `/api/scanner/mobile/stats?eventId=${eventId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.status === 401) {
          localStorage.removeItem("scanner_token");
          router.push("/scanner");
          return;
        }

        if (!res.ok) {
          throw new Error("Kon statistieken niet laden");
        }

        const data = await res.json();
        setEvent(data.event);
        setStats(data.stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Er ging iets mis");
      }
    };

    fetchStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [eventId, router, getToken]);

  // Handle QR scan
  const handleScan = useCallback(
    async (qrData: string) => {
      const token = getToken();
      if (!token || scanning) return;

      setScanning(true);
      setScannerActive(false);
      setLastScan(null);

      try {
        const res = await fetch("/api/scanner/mobile/scan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ qrData }),
        });

        if (res.status === 401) {
          localStorage.removeItem("scanner_token");
          router.push("/scanner");
          return;
        }

        const result: ScanResult = await res.json();
        setLastScan(result);

        // Update stats
        if (result.success && stats) {
          setStats({
            ...stats,
            totalScanned: stats.totalScanned + 1,
            scanPercentage: Math.round(
              ((stats.totalScanned + 1) / stats.totalSold) * 100
            ),
          });
        } else if (result.result === "ALREADY_USED" && stats) {
          setStats({
            ...stats,
            totalDuplicates: stats.totalDuplicates + 1,
          });
        }

        // Vibrate on mobile (if supported)
        if ("vibrate" in navigator) {
          if (result.success) {
            navigator.vibrate(200); // Short vibration for success
          } else {
            navigator.vibrate([100, 50, 100, 50, 100]); // Pattern for failure
          }
        }

        // Re-enable scanner after delay
        setTimeout(() => {
          setScannerActive(true);
          // Clear result after another delay
          setTimeout(() => setLastScan(null), 2000);
        }, 1500);
      } catch {
        setLastScan({
          success: false,
          result: "INVALID",
          message: "Verbindingsfout - probeer opnieuw",
        });
        setTimeout(() => {
          setScannerActive(true);
          setLastScan(null);
        }, 2000);
      } finally {
        setScanning(false);
      }
    },
    [getToken, router, scanning, stats]
  );

  const handleLogout = () => {
    localStorage.removeItem("scanner_token");
    localStorage.removeItem("scanner_terminal");
    localStorage.removeItem("scanner_org");
    localStorage.removeItem("scanner_event");
    router.push("/scanner");
  };

  // Result display colors
  const getResultStyle = (result: ScanResult) => {
    if (result.success) {
      return "bg-green-500 text-white";
    }
    if (result.result === "ALREADY_USED") {
      return "bg-orange-500 text-white";
    }
    return "bg-red-500 text-white";
  };

  const getResultIcon = (result: ScanResult) => {
    if (result.success) return "✅";
    if (result.result === "ALREADY_USED") return "⚠️";
    return "❌";
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/scanner/events"
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            ←
          </Link>
          <div>
            <h1 className="font-semibold truncate max-w-[200px]">
              {event?.title || "Scanner"}
            </h1>
            <p className="text-xs text-gray-400">{terminal?.name}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1 text-sm bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Uit
        </button>
      </header>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 p-4 bg-gray-900/30">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {stats.totalScanned}
            </div>
            <div className="text-xs text-gray-400">Gescand</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {stats.totalSold - stats.totalScanned}
            </div>
            <div className="text-xs text-gray-400">Resterend</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {stats.scanPercentage}%
            </div>
            <div className="text-xs text-gray-400">Voortgang</div>
          </div>
        </div>
      )}

      {/* Scanner Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {error ? (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 text-center max-w-sm">
            <div className="text-4xl mb-3">❌</div>
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Opnieuw proberen
            </button>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            {/* QR Scanner */}
            <div className="relative">
              <QRScanner
                onScan={handleScan}
                isActive={scannerActive && !lastScan}
                onResume={() => setScannerActive(true)}
              />

              {/* Result Overlay */}
              {lastScan && (
                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl ${getResultStyle(
                    lastScan
                  )} animate-in fade-in zoom-in duration-200`}
                >
                  <div className="text-6xl mb-4">{getResultIcon(lastScan)}</div>
                  <div className="text-xl font-bold text-center px-4">
                    {lastScan.success ? "Geldig!" : lastScan.message}
                  </div>
                  {lastScan.ticket && (
                    <div className="mt-2 text-center text-sm opacity-90">
                      <div>{lastScan.ticket.ticketTypeName}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Info */}
      <div className="p-4 bg-gray-900/30">
        <p className="text-center text-xs text-gray-500">
          Richt de camera op de QR code op het ticket
        </p>
        {stats && stats.totalDuplicates > 0 && (
          <p className="text-center text-xs text-orange-400 mt-1">
            ⚠️ {stats.totalDuplicates} dubbele scan(s) gedetecteerd
          </p>
        )}
      </div>
    </div>
  );
}
