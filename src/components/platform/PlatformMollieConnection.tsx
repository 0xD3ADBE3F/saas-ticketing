"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { PlatformHealthStatus } from "@/server/services/molliePlatformHealthService";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface PlatformMollieConnectionProps {
  isConnected: boolean;
  healthStatus?: PlatformHealthStatus | null;
}

export function PlatformMollieConnection({
  isConnected,
  healthStatus,
}: PlatformMollieConnectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();

  // Check for success/error messages from OAuth callback
  const mollieConnected = searchParams.get("mollie_connected");
  const errorParam = searchParams.get("error");

  const showSuccess = mollieConnected === "success";
  const error = errorParam ? decodeURIComponent(errorParam) : null;

  useEffect(() => {
    // Clear URL params after showing message
    if (showSuccess || error) {
      const timer = setTimeout(() => {
        window.history.replaceState({}, "", "/platform");
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [showSuccess, error]);

  const handleConnect = () => {
    setIsLoading(true);
    // Redirect to connection endpoint (will redirect to Mollie OAuth)
    window.location.href = "/api/platform/mollie/connect";
  };

  if (showSuccess) {
    return (
      <Alert
        variant="default"
        className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      >
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-900 dark:text-green-100">
          Platform connected successfully!
        </AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-300">
          Organizations can now use client links for faster onboarding.
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Connection failed</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (isConnected) {
    const isHealthy = healthStatus?.isHealthy ?? true;
    const needsRefresh = healthStatus?.needsRefresh ?? false;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                {isHealthy ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                )}
                Mollie Platform Connection
              </CardTitle>
              <CardDescription>
                Platform integration for organization onboarding
              </CardDescription>
            </div>
            <Button
              onClick={handleConnect}
              disabled={isLoading}
              variant={needsRefresh ? "default" : "outline"}
              size="sm"
            >
              {isLoading
                ? "Connecting..."
                : needsRefresh
                  ? "Refresh Connection"
                  : "Reconnect"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <Badge variant={isHealthy ? "default" : "secondary"}>
              {isHealthy ? "Healthy" : "Needs Attention"}
            </Badge>
          </div>

          {healthStatus?.organization && (
            <>
              <div className="border-t pt-4 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Connected Account
                </p>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">
                    {healthStatus.organization.name}
                  </p>
                  {healthStatus.organization.email && (
                    <p className="text-sm text-muted-foreground">
                      {healthStatus.organization.email}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground font-mono">
                    ID: {healthStatus.organization.id}
                  </p>
                </div>
              </div>
            </>
          )}

          {healthStatus && (
            <>
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Connection Details
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Last Checked</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(healthStatus.lastChecked).toLocaleString("nl-NL")}
                  </span>
                </div>

                {healthStatus.lastSuccessfulRefresh && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Last Token Refresh
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(
                        healthStatus.lastSuccessfulRefresh
                      ).toLocaleString("nl-NL")}
                    </span>
                  </div>
                )}

                {healthStatus.expiresAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Token Expires</span>
                    <span
                      className={`text-sm ${needsRefresh ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"}`}
                    >
                      {new Date(healthStatus.expiresAt).toLocaleString("nl-NL")}
                    </span>
                  </div>
                )}
              </div>

              {!isHealthy && healthStatus.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Connection Error</AlertTitle>
                  <AlertDescription className="text-sm">
                    {healthStatus.error}
                  </AlertDescription>
                </Alert>
              )}

              {needsRefresh && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Action Required</AlertTitle>
                  <AlertDescription className="text-sm">
                    Platform token needs manual re-authorization. Click
                    &quot;Refresh Connection&quot; above to reconnect.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-500" />
              Platform Connection Required
            </CardTitle>
            <CardDescription>
              Connect to enable advanced onboarding features
            </CardDescription>
          </div>
          <Button onClick={handleConnect} disabled={isLoading}>
            {isLoading ? "Connecting..." : "Connect Platform"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <strong>Connect your platform to Mollie</strong> to enable advanced
          features:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
          <li>Create prefilled client links for organizations</li>
          <li>Automatic onboarding data population</li>
          <li>Faster organization setup</li>
        </ul>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Note</AlertTitle>
          <AlertDescription className="text-sm">
            Organizations can still connect using standard OAuth, but client
            links provide a better onboarding experience.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
