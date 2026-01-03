"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Loader2, RefreshCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ConnectionStatus {
  isConnected: boolean;
  hasLiveEvents: boolean;
  lastChecked: Date;
}

interface MollieConnectionHealthProps {
  organizationId: string;
}

export function MollieConnectionHealth({
  organizationId,
}: MollieConnectionHealthProps) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/mollie/health`
      );
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch Mollie connection status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestError(null);

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/mollie/test`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Check if reconnection is needed
        if (data.needsReconnect) {
          setTestError(
            "Verbinding verlopen - klik hieronder om opnieuw te verbinden"
          );
        } else {
          setTestError(data.error || "Verbindingstest mislukt");
        }
      } else {
        // Success - refresh status
        await fetchStatus();
        setTestError(null);
      }
    } catch (error) {
      setTestError("Kon verbinding niet testen");
    } finally {
      setIsTesting(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [organizationId]);

  if (isLoading) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>Mollie verbinding controleren...</AlertDescription>
      </Alert>
    );
  }

  if (!status) {
    return null;
  }

  // Not connected at all
  if (!status.isConnected) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Mollie niet verbonden. Je kunt geen betalingen ontvangen.</span>
          <Button size="sm" variant="outline" asChild>
            <a href="/dashboard/settings">Verbinden</a>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Connected but has live events - show prominent status
  if (status.hasLiveEvents) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-green-800 dark:text-green-200 font-medium">
              ✓ Mollie verbonden - betalingen actief
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              Je hebt actieve evenementen waarbij klanten tickets kunnen kopen
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={testConnection}
            disabled={isTesting}
            className="shrink-0"
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Testen...
              </>
            ) : (
              <>
                <RefreshCcw className="mr-2 h-3 w-3" />
                Test Verbinding
              </>
            )}
          </Button>
        </AlertDescription>
        {testError && (
          <AlertDescription className="mt-2 text-sm text-red-600 dark:text-red-400">
            {testError}
          </AlertDescription>
        )}
      </Alert>
    );
  }

  // Connected but no live events - subtle indicator
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <CheckCircle className="h-3 w-3 text-green-600" />
      <span>Mollie verbonden</span>
      <button
        onClick={testConnection}
        disabled={isTesting}
        className="text-xs underline hover:no-underline"
      >
        {isTesting ? "Testen..." : "Test"}
      </button>
      {testError && (
        <span className="text-red-600 dark:text-red-400">{testError}</span>
      )}
    </div>
  );
}
