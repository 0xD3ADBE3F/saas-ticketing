"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/currency";

interface PaymentButtonProps {
  orderId: string;
  totalAmount: number;
}

export function PaymentButton({ orderId, totalAmount }: PaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/checkout/${orderId}/pay`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Er ging iets mis");
        setIsLoading(false);
        return;
      }

      // Redirect to checkout URL (mock payment page or Mollie)
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Er ging iets mis bij het starten van de betaling");
      setIsLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handlePayment}
        disabled={isLoading}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Bezig...
          </>
        ) : (
          <>Betalen met iDEAL ({formatPrice(totalAmount)})</>
        )}
      </button>
      <p className="mt-2 text-xs text-center text-gray-400">
        🧪 Mock betaling (voor ontwikkeling)
      </p>
    </div>
  );
}
