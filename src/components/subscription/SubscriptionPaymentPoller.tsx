"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface SubscriptionPaymentPollerProps {
  organizationId: string;
  currentPlan: string | null;
}

/**
 * Client component that polls for subscription status updates after payment redirect
 * This handles the case where user returns from Mollie but webhook hasn't processed yet
 */
export function SubscriptionPaymentPoller({
  organizationId,
  currentPlan,
}: SubscriptionPaymentPollerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("payment");
  const targetPlan = searchParams.get("plan");
  const [isPolling, setIsPolling] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);

  useEffect(() => {
    // Only poll if:
    // 1. payment=success in URL
    // 2. User has a target plan they're upgrading to
    // 3. Current plan doesn't match target plan yet (webhook not processed)
    if (
      paymentStatus === "success" &&
      targetPlan &&
      currentPlan !== targetPlan
    ) {
      setIsPolling(true);
      let attempts = 0;
      const maxAttempts = 40; // Poll for up to 40 seconds (webhook can take up to ~20s for mandate validation)
      const pollInterval = 1000; // Poll every second

      console.log(
        "[SubscriptionPoller] Starting poll - waiting for plan update",
        {
          currentPlan,
          targetPlan,
        }
      );

      const interval = setInterval(async () => {
        attempts++;
        setPollAttempts(attempts);

        console.log(
          `[SubscriptionPoller] Poll attempt ${attempts}/${maxAttempts}`
        );

        try {
          // Call API endpoint to check subscription status
          const response = await fetch("/api/subscription/status", {
            headers: {
              "x-organization-id": organizationId,
            },
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`[SubscriptionPoller] Subscription status:`, data);

            // Check if subscription plan matches target plan
            if (data.currentPlan === targetPlan) {
              console.log(
                "[SubscriptionPoller] Plans match! Subscription activated"
              );
              clearInterval(interval);
              setIsPolling(false);
              setPollAttempts(0);
              // Clean up URL params
              const url = new URL(window.location.href);
              url.searchParams.delete("payment");
              url.searchParams.delete("plan");
              router.replace(url.pathname + url.search);
              return;
            }
          } else {
            console.error(
              "Error fetching subscription status:",
              response.status
            );
          }
        } catch (error) {
          console.error("Error polling subscription status:", error);
        }

        // Stop polling after max attempts
        if (attempts >= maxAttempts) {
          console.log(
            "[SubscriptionPoller] Max attempts reached, stopping poll"
          );
          clearInterval(interval);
          setIsPolling(false);
          setPollAttempts(0);
          // Clean up URL params even if webhook didn't complete
          const url = new URL(window.location.href);
          url.searchParams.delete("payment");
          url.searchParams.delete("plan");
          router.replace(url.pathname + url.search);
        }
      }, pollInterval);

      return () => {
        console.log("[SubscriptionPoller] Cleanup - stopping poll");
        clearInterval(interval);
        setIsPolling(false);
        setPollAttempts(0);
      };
    } else if (
      paymentStatus === "success" &&
      targetPlan &&
      currentPlan === targetPlan
    ) {
      // Plans match - webhook has been processed
      console.log("[SubscriptionPoller] Plans match! Subscription activated", {
        currentPlan,
        targetPlan,
      });
      setIsPolling(false);
      setPollAttempts(0);
      // Clean up URL params
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      url.searchParams.delete("plan");
      router.replace(url.pathname + url.search);
    }
  }, [organizationId, currentPlan, targetPlan, paymentStatus, router]);

  // Show loading indicator while polling
  if (isPolling) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <div className="flex-1">
            <p className="font-medium text-blue-800 dark:text-blue-200">
              Abonnement wordt ingesteld...
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Je betaling is geslaagd en je abonnement wordt nu geactiveerd. Dit
              kan tot 20 seconden duren.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null; // This component doesn't render anything when not polling
}
