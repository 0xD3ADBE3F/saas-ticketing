"use client";

import { useState, useEffect, useCallback } from "react";

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
    loading: true,
    error: null,
  });

  const [onboardingForm, setOnboardingForm] = useState({
    ownerEmail: "",
    ownerGivenName: "",
    ownerFamilyName: "",
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

      setState((prev) => ({
        ...prev,
        status: data.status,
        isConnected: data.isConnected,
        canReceivePayments: data.canReceivePayments,
        onboardingUrl: data.onboardingUrl,
        profileId: data.profileId,
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
          body: JSON.stringify(onboardingForm),
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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            ✓ Verbonden
          </span>
        );
      case "IN_REVIEW":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            ⏳ In beoordeling
          </span>
        );
      case "NEEDS_DATA":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
            ⚠ Extra gegevens nodig
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            ⏳ Wacht op voltooiing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
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
          <div className="w-10 h-10 bg-gradient-to-br from-[#000] to-[#333] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <div>
            <h3 className="font-medium">Mollie Betalingen</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ontvang betalingen via iDEAL
            </p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {state.error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {state.error}
        </div>
      )}

      {state.isConnected ? (
        <div className="space-y-3">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-300">
              ✓ Je Mollie account is verbonden. Je kunt nu betalingen ontvangen.
            </p>
            {state.profileId && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Profiel ID: {state.profileId}
              </p>
            )}
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

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <a
                href="https://my.mollie.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Open Mollie Dashboard →
              </a>
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
              >
                {testing ? "Testen..." : "Test verbinding"}
              </button>
            </div>

            {!showDisconnectConfirm ? (
              <button
                onClick={() => setShowDisconnectConfirm(true)}
                className="text-sm text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
              >
                Verbinding verbreken
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600 dark:text-red-400">
                  Weet je het zeker?
                </span>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {disconnecting ? "Bezig..." : "Ja, verbreken"}
                </button>
                <button
                  onClick={() => setShowDisconnectConfirm(false)}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Annuleren
                </button>
              </div>
            )}
          </div>
        </div>
      ) : state.status === "PENDING" && state.onboardingUrl ? (
        <div className="space-y-3">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Je Mollie account is aangemaakt. Voltooi de verificatie om
              betalingen te kunnen ontvangen.
            </p>
          </div>

          <a
            href={state.onboardingUrl}
            className="inline-flex items-center justify-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Verificatie voltooien →
          </a>
        </div>
      ) : state.status === "NEEDS_DATA" || state.status === "IN_REVIEW" ? (
        <div className="space-y-3">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {state.status === "NEEDS_DATA"
                ? "Mollie heeft extra gegevens nodig om je account te verifiëren."
                : "Je account wordt beoordeeld door Mollie. Dit kan enkele dagen duren."}
            </p>
          </div>

          <a
            href="https://my.mollie.com/dashboard/onboarding"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Naar Mollie Dashboard →
          </a>
        </div>
      ) : (
        <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Vul je gegevens in om een Mollie account aan te maken. Je gegevens
            worden vooraf ingevuld bij Mollie.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Voornaam</label>
              <input
                type="text"
                value={onboardingForm.ownerGivenName}
                onChange={(e) =>
                  setOnboardingForm((f) => ({
                    ...f,
                    ownerGivenName: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent"
                placeholder="Jan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Achternaam
              </label>
              <input
                type="text"
                value={onboardingForm.ownerFamilyName}
                onChange={(e) =>
                  setOnboardingForm((f) => ({
                    ...f,
                    ownerFamilyName: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent"
                placeholder="Jansen"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              E-mailadres
            </label>
            <input
              type="email"
              value={onboardingForm.ownerEmail}
              onChange={(e) =>
                setOnboardingForm((f) => ({ ...f, ownerEmail: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent"
              placeholder="jan@voorbeeld.nl"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleStartOnboarding}
              disabled={
                submitting ||
                !onboardingForm.ownerEmail ||
                !onboardingForm.ownerGivenName ||
                !onboardingForm.ownerFamilyName
              }
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Bezig..." : "Mollie account aanmaken →"}
            </button>
          </div>
        </div>
      )}

      {!state.isConnected && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          💡 Je moet Mollie verbinden voordat je evenementen kunt publiceren.
        </p>
      )}
    </div>
  );
}
