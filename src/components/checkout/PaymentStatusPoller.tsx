"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface PaymentStatusPollerProps {
  orderId: string;
  orderStatus: string;
}

/**
 * Client component that polls for order status updates after payment redirect
 * This handles the case where user returns from Mollie but webhook hasn't processed yet
 */
export function PaymentStatusPoller({
  orderId,
  orderStatus,
}: PaymentStatusPollerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPayment = searchParams.get("from") === "payment";

  useEffect(() => {
    // Only poll if:
    // 1. Order is PENDING (payment may be processing)
    // 2. User just returned from payment (from=payment query param)
    if (orderStatus === "PENDING" && fromPayment) {
      let attempts = 0;
      const maxAttempts = 20; // Poll for up to 20 seconds
      const pollInterval = 1000; // Poll every second

      const interval = setInterval(async () => {
        attempts++;

        try {
          // Fetch fresh order status from server
          const response = await fetch(`/api/checkout/${orderId}`, {
            cache: "no-store",
          });

          if (response.ok) {
            const data = await response.json();

            // If status changed from PENDING, refresh the page to show new status
            if (data.order.status !== "PENDING") {
              clearInterval(interval);
              // Remove the from=payment param and refresh
              router.refresh();
            }
          }
        } catch (error) {
          console.error("Error polling order status:", error);
        }

        // Stop polling after max attempts
        if (attempts >= maxAttempts) {
          clearInterval(interval);
        }
      }, pollInterval);

      return () => clearInterval(interval);
    }
  }, [orderId, orderStatus, fromPayment, router]);

  return null; // This component doesn't render anything
}
