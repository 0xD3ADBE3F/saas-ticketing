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
      const maxAttempts = 30; // Poll for up to 30 seconds
      const pollInterval = 1000; // Poll every second

      const interval = setInterval(async () => {
        attempts++;

        try {
          // Trigger a router refresh to fetch fresh data from the server
          router.refresh();

          // After refresh, check if the plan has updated
          // The component will re-render with updated currentPlan
          // If plans match, we'll clean up in the next render
        } catch (error) {
          console.error("Error polling subscription status:", error);
        }

        // Stop polling after max attempts
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setIsPolling(false);
          // Clean up URL params even if webhook didn't complete
          const url = new URL(window.location.href);
          url.searchParams.delete("payment");
          url.searchParams.delete("plan");
          router.replace(url.pathname + url.search);
        }
      }, pollInterval);

      return () => {
        clearInterval(interval);
        setIsPolling(false);
      };
    } else if (
      paymentStatus === "success" &&
      targetPlan &&
      currentPlan === targetPlan
    ) {
      // Plans match - webhook has been processed
      setIsPolling(false);
      // Clean up URL params
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      url.searchParams.delete("plan");
      router.replace(url.pathname + url.search);
    }
  }, [organizationId, currentPlan, targetPlan, paymentStatus, router]);

  // Show loading state while polling
  if (isPolling) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <div>
            <p className="font-medium text-blue-800 dark:text-blue-200">
              Betaling verwerken...
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Je betaling wordt verwerkt. Dit kan enkele seconden duren.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null; // This component doesn't render anything when not polling
}
