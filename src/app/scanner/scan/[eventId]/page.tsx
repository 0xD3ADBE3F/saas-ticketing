"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRScanner } from "@/components/scanner/QRScanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TicketSearch } from "@/components/scanner/TicketSearch";
import { RecentScans } from "@/components/scanner/RecentScans";
import { ManualOverride } from "@/components/scanner/ManualOverride";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Ticket,
  TrendingUp,
  Users,
  Activity,
  Zap,
  Pause,
  Play,
  Camera,
  CameraOff,
  Search,
  Clock,
  ShieldAlert,
} from "lucide-react";

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
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "scan" | "search" | "recent" | "override"
  >("scan");
  const [refreshKey, setRefreshKey] = useState(0);

  // Get token from localStorage
  const getToken = useCallback(() => {
    return localStorage.getItem("scanner_token");
  }, []);

  // Trigger manual refresh of stats
  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
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

    // Check if admin (TODO: This should come from backend)
    // For now, we'll assume all scanner terminals can access override if needed
    // You may want to add a role field to the terminal auth response
    setIsAdmin(true); // Set to false if you want to hide override tab

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
  }, [eventId, router, getToken, refreshKey]);

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
          triggerRefresh(); // Trigger refresh for other tabs
        } else if (result.result === "ALREADY_USED" && stats) {
          setStats({
            ...stats,
            totalDuplicates: stats.totalDuplicates + 1,
          });
          triggerRefresh(); // Trigger refresh for other tabs
        }

        // Vibrate on mobile (if supported)
        if ("vibrate" in navigator) {
          if (result.success) {
            navigator.vibrate(200); // Short vibration for success
          } else {
            navigator.vibrate([100, 50, 100, 50, 100]); // Pattern for failure
          }
        }

        // No auto-resume - user must click result to continue
        // Result stays visible until user dismisses it
      } catch {
        setLastScan({
          success: false,
          result: "INVALID",
          message: "Verbindingsfout - probeer opnieuw",
        });
        // No auto-resume - user must click result to continue
      } finally {
        setScanning(false);
      }
    },
    [getToken, router, scanning, stats]
  );

  const togglePause = () => {
    setIsPaused(!isPaused);
    if (isPaused) {
      // Resuming
      setScannerActive(true);
    } else {
      // Pausing
      setScannerActive(false);
    }
  };

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
      return "bg-gradient-to-br from-green-500 to-emerald-600";
    }
    if (result.result === "ALREADY_USED") {
      return "bg-gradient-to-br from-orange-500 to-amber-600";
    }
    return "bg-gradient-to-br from-red-500 to-rose-600";
  };

  const getResultIcon = (result: ScanResult) => {
    if (result.success)
      return (
        <CheckCircle2 className="w-24 h-24 text-white animate-scale-bounce" />
      );
    if (result.result === "ALREADY_USED")
      return (
        <AlertTriangle className="w-24 h-24 text-white animate-shake-soft" />
      );
    return <XCircle className="w-24 h-24 text-white animate-shake-soft" />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Animated background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4 bg-gray-900/50 backdrop-blur-md border-b border-gray-800/50">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="flex-shrink-0 hover:bg-gray-800"
          >
            <Link href="/scanner/events">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate text-white">
              {event?.title || "Scanner"}
            </h1>
            <p className="text-xs text-gray-400 truncate">{terminal?.name}</p>
          </div>
        </div>
        <Button
          onClick={handleLogout}
          variant="ghost"
          size="sm"
          className="flex-shrink-0 text-gray-400 hover:text-white hover:bg-gray-800"
        >
          Uit
        </Button>
      </header>

      {/* Stats Bar */}
      {stats && (
        <div className="relative z-10 grid grid-cols-3 gap-3 p-4">
          <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm hover:bg-gray-900/70 transition-all">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-green-400" />
                <div className="text-2xl font-bold text-green-400">
                  {stats.totalScanned}
                </div>
              </div>
              <div className="text-xs text-gray-400">Gescand</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm hover:bg-gray-900/70 transition-all">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-400" />
                <div className="text-2xl font-bold text-blue-400">
                  {stats.totalSold - stats.totalScanned}
                </div>
              </div>
              <div className="text-xs text-gray-400">Resterend</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm hover:bg-gray-900/70 transition-all">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <div className="text-2xl font-bold text-purple-400">
                  {stats.scanPercentage}%
                </div>
              </div>
              <div className="text-xs text-gray-400">Voortgang</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Duplicate Warning Banner */}
      {stats && stats.totalDuplicates > 0 && (
        <div className="relative z-10 px-4 pb-3">
          <Alert className="bg-orange-950/50 border-orange-900/50 backdrop-blur-sm">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <AlertDescription className="text-orange-200 text-sm">
              {stats.totalDuplicates} dubbele scan
              {stats.totalDuplicates !== 1 ? "s" : ""} gedetecteerd
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="relative z-10 px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => {
              setActiveTab("scan");
              // Resume scanner if we're switching to scan tab
              if (isPaused) {
                setIsPaused(false);
                setScannerActive(true);
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all ${
              activeTab === "scan"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "bg-gray-800/50 text-gray-300 hover:bg-gray-800"
            }`}
          >
            <Camera className="w-4 h-4" />
            Scannen
          </button>
          <button
            onClick={() => setActiveTab("search")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all ${
              activeTab === "search"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "bg-gray-800/50 text-gray-300 hover:bg-gray-800"
            }`}
          >
            <Search className="w-4 h-4" />
            Zoeken
          </button>
          <button
            onClick={() => setActiveTab("recent")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all ${
              activeTab === "recent"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "bg-gray-800/50 text-gray-300 hover:bg-gray-800"
            }`}
          >
            <Clock className="w-4 h-4" />
            Recent
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab("override")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all ${
                activeTab === "override"
                  ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30"
                  : "bg-gray-800/50 text-gray-300 hover:bg-gray-800"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scanner Area / Tab Content */}
      <div className="relative z-10 flex-1 flex flex-col p-4">
        {error ? (
          <div className="max-w-sm w-full mx-auto animate-fade-in">
            <Card className="bg-red-950/50 border-red-900 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <XCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
                <AlertDescription className="text-red-200 mb-4">
                  {error}
                </AlertDescription>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="w-full bg-red-900/50 border-red-800 hover:bg-red-900 text-red-100"
                >
                  Opnieuw proberen
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* Scan Tab */}
            {activeTab === "scan" && (
              <div className="w-full max-w-md mx-auto">
                {/* Scanner Frame */}
                <div className="relative">
                  {/* Animated corners */}
                  <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg animate-pulse" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg animate-pulse delay-200" />
                  <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg animate-pulse delay-400" />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg animate-pulse delay-600" />

                  {/* QR Scanner */}
                  <div className="relative overflow-hidden rounded-2xl shadow-2xl shadow-blue-500/20 border-2 border-gray-800">
                    <QRScanner
                      onScan={handleScan}
                      isActive={scannerActive && !lastScan && !isPaused}
                      onResume={() => setScannerActive(true)}
                    />

                    {/* Scanning animation line */}
                    {scannerActive && !lastScan && !isPaused && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-scan-line" />
                      </div>
                    )}

                    {/* Paused Overlay */}
                    {isPaused && !lastScan && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-sm animate-fade-in">
                        <div className="bg-gray-800/50 rounded-full p-6 mb-4">
                          <CameraOff className="w-16 h-16 text-gray-400" />
                        </div>
                        <div className="text-lg font-semibold text-gray-300 mb-1">
                          Camera gepauzeerd
                        </div>
                        <div className="text-sm text-gray-500">
                          Druk op de knop om door te gaan
                        </div>
                      </div>
                    )}

                    {/* Result Overlay */}
                    {lastScan && (
                      <div
                        onClick={() => {
                          setLastScan(null);
                          setScannerActive(true);
                        }}
                        className={`absolute inset-0 flex flex-col items-center justify-center ${getResultStyle(
                          lastScan
                        )} animate-result-overlay cursor-pointer transition-opacity hover:opacity-95`}
                      >
                        <div className="mb-6">{getResultIcon(lastScan)}</div>
                        <div className="text-2xl font-bold text-white text-center px-6 mb-2">
                          {lastScan.success
                            ? "Ticket Geldig!"
                            : lastScan.message}
                        </div>
                        {lastScan.ticket && (
                          <Card className="mt-4 mx-6 bg-white/20 border-white/30 backdrop-blur-sm">
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2 text-white">
                                <Ticket className="w-4 h-4" />
                                <div className="text-sm font-medium">
                                  {lastScan.ticket.ticketTypeName}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        <div className="mt-6 text-white/80 text-sm font-medium animate-pulse">
                          Tik om door te gaan
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status indicator */}
                  {!lastScan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <button
                        onClick={togglePause}
                        className={`flex items-center gap-2 px-3 py-1 text-white text-xs font-medium rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 ${
                          isPaused
                            ? "bg-gray-600 hover:bg-gray-500"
                            : "bg-green-500 hover:bg-green-600"
                        } animate-fade-in`}
                      >
                        {isPaused ? (
                          <>
                            <Pause className="w-3 h-3" />
                            <span>Gepauzeerd</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3 h-3 animate-pulse" />
                            <span>Actief</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Pause/Resume Control */}
                <div className="mt-6">
                  <Button
                    onClick={togglePause}
                    variant="outline"
                    size="lg"
                    className={`w-full transition-all ${
                      isPaused
                        ? "bg-green-600/20 border-green-600 hover:bg-green-600/30 text-green-300"
                        : "bg-gray-800/50 border-gray-700 hover:bg-gray-800 text-gray-300"
                    }`}
                  >
                    {isPaused ? (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Hervatten
                      </>
                    ) : (
                      <>
                        <Pause className="w-5 h-5 mr-2" />
                        Pauzeren
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    {isPaused
                      ? "Camera is uitgeschakeld om batterij te besparen"
                      : "Pauzeer om batterij te besparen"}
                  </p>
                </div>

                {/* Help Text */}
                <Card className="mt-4 bg-gray-900/30 border-gray-800/50 backdrop-blur-sm">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-gray-400 leading-relaxed">
                      📱 Richt de camera op de{" "}
                      <strong className="text-gray-300">QR code</strong> op het
                      ticket
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Search Tab */}
            {activeTab === "search" && (
              <div className="w-full max-w-2xl mx-auto">
                <TicketSearch eventId={eventId} />
              </div>
            )}

            {/* Recent Tab */}
            {activeTab === "recent" && (
              <div className="w-full max-w-2xl mx-auto">
                <RecentScans eventId={eventId} refreshKey={refreshKey} />
              </div>
            )}

            {/* Override Tab */}
            {activeTab === "override" && isAdmin && (
              <div className="w-full max-w-2xl mx-auto">
                <ManualOverride onOverrideComplete={triggerRefresh} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Safe area padding for mobile */}
      <div className="pb-safe" />

      <style jsx global>{`
        @keyframes scale-bounce {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @keyframes shake-soft {
          0%,
          100% {
            transform: translateX(0) rotate(0deg);
          }
          25% {
            transform: translateX(-8px) rotate(-2deg);
          }
          75% {
            transform: translateX(8px) rotate(2deg);
          }
        }

        @keyframes scan-line {
          0% {
            top: 0%;
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }

        @keyframes result-overlay {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-scale-bounce {
          animation: scale-bounce 0.6s ease-out;
        }

        .animate-shake-soft {
          animation: shake-soft 0.5s ease-in-out;
        }

        .animate-scan-line {
          animation: scan-line 2s linear infinite;
        }

        .animate-result-overlay {
          animation: result-overlay 0.3s ease-out;
        }

        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }

        .delay-200 {
          animation-delay: 200ms;
        }
        .delay-400 {
          animation-delay: 400ms;
        }
        .delay-600 {
          animation-delay: 600ms;
        }
        .delay-700 {
          animation-delay: 700ms;
        }

        .pb-safe {
          padding-bottom: max(1rem, env(safe-area-inset-bottom));
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
