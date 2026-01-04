"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Zap,
  Settings,
  Lightbulb,
} from "lucide-react";

type MollieStatus =
  | "NOT_STARTED"
  | "PENDING"
  | "NEEDS_DATA"
  | "IN_REVIEW"
  | "COMPLETED";

interface MollieConnectionState {
  status: MollieStatus;
  isConnected: boolean;
  canReceivePayments: boolean;
  onboardingUrl: string | null;
  profileId: string | null;
  hasRequiredData: boolean;
  loading: boolean;
  error: string | null;
}

interface MollieConnectionProps {
  organizationId: string;
}

export function MollieConnection({ organizationId }: MollieConnectionProps) {
  const [state, setState] = useState<MollieConnectionState>({
    status: "NOT_STARTED",
    isConnected: false,
    canReceivePayments: false,
    onboardingUrl: null,
    profileId: null,
    hasRequiredData: false,
    loading: true,
    error: null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: {
      name: string;
      status: string;
      canReceivePayments: boolean;
    };
  } | null>(null);

  // Fetch current Mollie status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${organizationId}/mollie`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch status");
      }

      console.log("Mollie status data:", data);

      setState((prev) => ({
        ...prev,
        status: data.status,
        isConnected: data.isConnected,
        canReceivePayments: data.canReceivePayments,
        onboardingUrl: data.onboardingUrl,
        profileId: data.profileId,
        hasRequiredData: data.hasRequiredData,
        loading: false,
        error: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, [organizationId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll for status updates when pending
  useEffect(() => {
    if (
      state.status === "PENDING" ||
      state.status === "NEEDS_DATA" ||
      state.status === "IN_REVIEW"
    ) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(
            `/api/organizations/${organizationId}/mollie/status`
          );
          const data = await res.json();

          if (data.changed) {
            fetchStatus();
          }
        } catch {
          // Ignore polling errors
        }
      }, 30000); // Poll every 30 seconds

      return () => clearInterval(interval);
    }
  }, [state.status, organizationId, fetchStatus]);

  // Start onboarding
  const handleStartOnboarding = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/mollie/onboard`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start onboarding");
      }

      // Redirect to Mollie onboarding
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error:
          err instanceof Error ? err.message : "Failed to start onboarding",
      }));
    } finally {
      setSubmitting(false);
    }
  };

  // Test Mollie connection
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/mollie/test`,
        { method: "POST" }
      );

      const data = await res.json();

      if (!res.ok) {
        setTestResult({
          success: false,
          message: data.error || "Verbindingstest mislukt",
        });
      } else {
        setTestResult({
          success: true,
          message: data.message,
          details: data.onboarding,
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Verbindingstest mislukt",
      });
    } finally {
      setTesting(false);
    }
  };

  // Disconnect Mollie account
  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/mollie/disconnect`,
        { method: "POST" }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to disconnect");
      }

      // Reset state and refetch
      setShowDisconnectConfirm(false);
      fetchStatus();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to disconnect",
      }));
    } finally {
      setDisconnecting(false);
    }
  };

  // Status indicator
  const getStatusBadge = () => {
    switch (state.status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900/30 dark:to-green-800/30 dark:text-green-200 border border-green-300 dark:border-green-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verbonden
          </span>
        );
      case "IN_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900/30 dark:to-yellow-800/30 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700">
            <Clock className="w-3.5 h-3.5" />
            In beoordeling
          </span>
        );
      case "NEEDS_DATA":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 dark:from-orange-900/30 dark:to-orange-800/30 dark:text-orange-200 border border-orange-300 dark:border-orange-700">
            <AlertTriangle className="w-3.5 h-3.5" />
            Extra gegevens nodig
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:from-blue-900/30 dark:to-blue-800/30 dark:text-blue-200 border border-blue-300 dark:border-blue-700">
            <Clock className="w-3.5 h-3.5" />
            Wacht op voltooiing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-800/50 dark:to-gray-700/50 dark:text-gray-200 border border-gray-300 dark:border-gray-700">
            <XCircle className="w-3.5 h-3.5" />
            Niet verbonden
          </span>
        );
    }
  };

  if (state.loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 w-11 text-center bg-gradient-to-br from-gray-900 to-gray-700 rounded-xl shadow-md">
            <span className="text-white font-bold text-base">M</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Mollie Betalingen
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Ontvang betalingen via iDEAL
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {!state.isConnected && (
            <button
              onClick={() => {
                setState((prev) => ({ ...prev, loading: true }));
                fetchStatus();
              }}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Ververs status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {state.error && (
        <div className="p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-2 border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-sm text-red-700 dark:text-red-300 font-medium flex-1">
              {state.error}
            </p>
          </div>
        </div>
      )}

      {state.isConnected ? (
        <div className="space-y-3">
          <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-200 dark:border-green-800 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                  Je Mollie account is verbonden. Je kunt nu betalingen
                  ontvangen.
                </p>
                {state.profileId && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Profiel ID: {state.profileId}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Test result display */}
          {testResult && (
            <div
              className={`p-3 rounded-lg text-sm ${
                testResult.success
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                  : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
              }`}
            >
              <p className="font-medium">
                {testResult.success ? "✓" : "✗"} {testResult.message}
              </p>
              {testResult.details && (
                <div className="mt-2 text-xs space-y-1">
                  <p>Account: {testResult.details.name}</p>
                  <p>Status: {testResult.details.status}</p>
                  <p>
                    Betalingen ontvangen:{" "}
                    {testResult.details.canReceivePayments ? "Ja" : "Nee"}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <a
                href="https://my.mollie.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open Mollie Dashboard
              </a>
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${testing ? "animate-spin" : ""}`}
                />
                {testing ? "Testen..." : "Test verbinding"}
              </button>
            </div>

            {!showDisconnectConfirm ? (
              <button
                onClick={() => setShowDisconnectConfirm(true)}
                className="text-sm text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 font-medium transition-colors"
              >
                Verbinding verbreken
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                  Weet je het zeker?
                </span>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="min-h-[36px] px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all active:scale-95 font-medium"
                >
                  {disconnecting ? "Bezig..." : "Ja, verbreken"}
                </button>
                <button
                  onClick={() => setShowDisconnectConfirm(false)}
                  className="min-h-[36px] px-4 py-1.5 text-sm border-2 border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95 font-medium"
                >
                  Annuleren
                </button>
              </div>
            )}
          </div>
        </div>
      ) : state.status === "PENDING" && state.onboardingUrl ? (
        <div className="space-y-3">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium flex-1">
                Je Mollie account is aangemaakt. Voltooi de verificatie om
                betalingen te kunnen ontvangen.
              </p>
            </div>
          </div>

          <a
            href={state.onboardingUrl}
            className="inline-flex items-center gap-2 min-h-[48px] px-6 py-3 bg-gradient-to-r from-gray-900 to-gray-700 text-white font-medium rounded-xl hover:from-gray-800 hover:to-gray-600 transition-all active:scale-95 shadow-lg"
          >
            <ExternalLink className="w-4 h-4" />
            Verificatie voltooien
          </a>
        </div>
      ) : state.status === "NEEDS_DATA" || state.status === "IN_REVIEW" ? (
        <div className="space-y-3">
          <div className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                {state.status === "NEEDS_DATA" ? (
                  <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                ) : (
                  <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                )}
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium flex-1">
                {state.status === "NEEDS_DATA"
                  ? "Mollie heeft extra gegevens nodig om je account te verifiëren."
                  : "Je account wordt beoordeeld door Mollie. Dit kan enkele dagen duren."}
              </p>
            </div>
          </div>

          <a
            href="https://my.mollie.com/dashboard/onboarding"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 min-h-[48px] px-6 py-3 bg-gradient-to-r from-gray-900 to-gray-700 text-white font-medium rounded-xl hover:from-gray-800 hover:to-gray-600 transition-all active:scale-95 shadow-lg"
          >
            <ExternalLink className="w-4 h-4" />
            Naar Mollie Dashboard
          </a>
        </div>
      ) : (
        <div className="space-y-4 p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50">
          {state.hasRequiredData ? (
            <>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex-1">
                  Verbind je Mollie account om betalingen te kunnen ontvangen.
                  Je organisatiegegevens worden automatisch vooraf ingevuld bij
                  Mollie.
                </p>
              </div>

              <button
                onClick={handleStartOnboarding}
                disabled={submitting}
                className="min-h-[48px] px-6 py-3 bg-gradient-to-r from-gray-900 to-gray-700 text-white font-medium rounded-xl hover:from-gray-800 hover:to-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg"
              >
                {submitting ? "Bezig..." : "Mollie account verbinden"}
              </button>
            </>
          ) : (
            <>
              <div className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 font-semibold flex-1">
                    Vul eerst je organisatiegegevens aan
                  </p>
                </div>
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-2 ml-11">
                  Om je Mollie account te kunnen verbinden, hebben we de
                  volgende gegevens nodig:
                </p>
                <ul className="ml-11 text-sm text-yellow-600 dark:text-yellow-400 list-disc list-inside space-y-1">
                  <li>Contactpersoon (voor- en achternaam)</li>
                  <li>E-mailadres</li>
                  <li>Bedrijfsadres (straat, postcode, plaats)</li>
                </ul>
              </div>

              <a
                href="/dashboard/settings"
                className="inline-flex items-center gap-2 min-h-[48px] px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95 shadow-lg"
              >
                <Settings className="w-4 h-4" />
                Naar Instellingen
              </a>
            </>
          )}
        </div>
      )}

      {!state.isConnected && (
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Lightbulb className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Je moet Mollie verbinden voordat je evenementen kunt publiceren.
          </p>
        </div>
      )}
    </div>
  );
}
