"use client";

import { useState } from "react";
import { CancelSubscriptionModal } from "@/components/subscription/CancelSubscriptionModal";
import { cancelSubscriptionAction, undoCancellationAction } from "./actions";
import type { SubscriptionData } from "./actions";

interface CancelSubscriptionButtonProps {
  subscription: SubscriptionData;
  mode: "cancel" | "undo";
}

export function CancelSubscriptionButton({
  subscription,
  mode,
}: CancelSubscriptionButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUndo = async () => {
    setIsLoading(true);
    const result = await undoCancellationAction();

    if (result.success) {
      // Page will be revalidated by the server action
      window.location.reload();
    } else {
      alert(result.error || "Er is een fout opgetreden");
      setIsLoading(false);
    }
  };

  if (mode === "undo") {
    return (
      <button
        onClick={handleUndo}
        disabled={isLoading}
        className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      >
        {isLoading ? "Bezig..." : "Opzegging ongedaan maken"}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
      >
        Abonnement opzeggen
      </button>

      {showModal && (
        <CancelSubscriptionModal
          subscription={subscription}
          onCancel={() => setShowModal(false)}
          onConfirm={async () => {
            const result = await cancelSubscriptionAction();
            if (result.success) {
              setShowModal(false);
              // Page will be revalidated by the server action
              window.location.reload();
            }
            return result;
          }}
        />
      )}
    </>
  );
}
