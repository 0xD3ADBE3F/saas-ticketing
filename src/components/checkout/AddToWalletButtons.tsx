"use client";

import { useState } from "react";
import { Smartphone, Wallet } from "lucide-react";

type AddToWalletButtonsProps = {
  ticketId: string;
};

export function AddToWalletButtons({ ticketId }: AddToWalletButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect platform
  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid =
    typeof navigator !== "undefined" && /Android/.test(navigator.userAgent);

  const handleAddToAppleWallet = async () => {
    setLoading(true);
    setError(null);

    try {
      // On iOS, open the API endpoint directly in a new window
      // This allows Safari to handle the .pkpass file properly
      if (isIOS) {
        const url = `/api/wallet/apple/generate?ticketId=${encodeURIComponent(ticketId)}`;
        window.location.href = url;
        setLoading(false);
        return;
      }

      // For desktop/other platforms, download as blob
      const response = await fetch("/api/wallet/apple/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate pass");
      }

      // Download .pkpass file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ticket-${ticketId}.pkpass`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Apple Wallet error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Kon ticket niet toevoegen aan Apple Wallet"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddToGoogleWallet = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/wallet/google/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate pass");
      }

      const { url } = await response.json();

      // Redirect to Google Wallet
      window.location.href = url;
    } catch (err) {
      console.error("Google Wallet error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Kon ticket niet toevoegen aan Google Wallet"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Voeg toe aan wallet voor makkelijke toegang
      </div>

      <div className="flex gap-3">
        {/* Show Apple Wallet button on iOS or desktop */}
        {(isIOS || !isAndroid) && (
          <button
            onClick={handleAddToAppleWallet}
            disabled={loading}
            className="flex-1 bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            aria-label="Voeg toe aan Apple Wallet"
          >
            <Wallet className="w-5 h-5" />
            <span>Apple Wallet</span>
          </button>
        )}

        {/* Show Google Wallet button on Android or desktop */}
        {(isAndroid || !isIOS) && (
          <button
            onClick={handleAddToGoogleWallet}
            disabled={loading}
            className="flex-1 bg-white border-2 border-gray-300 text-gray-900 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
            aria-label="Voeg toe aan Google Wallet"
          >
            <Smartphone className="w-5 h-5" />
            <span>Google Wallet</span>
          </button>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          {error}
        </div>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400">
        Je ticket verschijnt in je wallet en kan offline gebruikt worden.
      </div>
    </div>
  );
}
