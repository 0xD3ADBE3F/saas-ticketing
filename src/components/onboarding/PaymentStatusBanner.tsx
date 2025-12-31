"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PaymentStatusBannerProps {
  organizationId: string;
  mollieStatus: "PENDING" | "NEEDS_DATA" | "IN_REVIEW" | "COMPLETED" | null;
  eventId: string;
}

/**
 * Banner shown on Event Dashboard when:
 * - Event is paid (isPaid === true)
 * - AND Mollie account is not active (status !== "COMPLETED")
 *
 * Prompts user to activate payments via Mollie Connect
 */
export function PaymentStatusBanner({
  organizationId,
  mollieStatus,
  eventId,
}: PaymentStatusBannerProps) {
  const router = useRouter();
  const [isActivating, setIsActivating] = useState(false);

  // If Mollie is already completed, no banner needed
  if (mollieStatus === "COMPLETED") {
    return null;
  }

  const handleActivatePayments = async () => {
    setIsActivating(true);

    try {
      // Start Mollie onboarding flow
      const response = await fetch(
        `/api/organizations/${organizationId}/mollie/onboard`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            returnUrl: `${window.location.origin}/dashboard/events/${eventId}?mollie=success`,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.redirectUrl) {
        // Redirect to Mollie OAuth
        window.location.href = data.redirectUrl;
      } else {
        alert(data.error || "Er ging iets mis bij het activeren van betalingen");
        setIsActivating(false);
      }
    } catch (error) {
      console.error("Error activating payments:", error);
      alert("Er ging iets mis. Probeer het later opnieuw.");
      setIsActivating(false);
    }
  };

  const getMessage = () => {
    if (!mollieStatus) {
      return {
        title: "Actie vereist om tickets te verkopen",
        description:
          "Activeer betalingen om tickets te kunnen verkopen voor dit evenement. Dit duurt ongeveer 2 minuten.",
        cta: "Betalingen activeren",
      };
    }

    switch (mollieStatus) {
      case "PENDING":
      case "NEEDS_DATA":
        return {
          title: "Betaalaccount activering niet afgerond",
          description:
            "Je bent gestart met de activering, maar deze is nog niet afgerond. Voltooi de stappen om tickets te kunnen verkopen.",
          cta: "Activering voltooien",
        };
      case "IN_REVIEW":
        return {
          title: "Betaalaccount wordt gecontroleerd",
          description:
            "Je accountgegevens worden gecontroleerd door Mollie. Dit kan tot 1 werkdag duren. Je ontvangt een e-mail zodra je kunt beginnen met verkopen.",
          cta: null,
        };
      default:
        return {
          title: "Actie vereist om tickets te verkopen",
          description:
            "Activeer betalingen om tickets te kunnen verkopen voor dit evenement.",
          cta: "Betalingen activeren",
        };
    }
  };

  const message = getMessage();

  return (
    <div className="mb-6 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-xl shadow-md">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-800 rounded-full flex items-center justify-center text-2xl">
            {mollieStatus === "IN_REVIEW" ? "⏳" : "⚠️"}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {message.title}
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {message.description}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            {message.cta && (
              <button
                onClick={handleActivatePayments}
                disabled={isActivating}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
              >
                {isActivating ? "Bezig..." : message.cta}
              </button>
            )}

            <button
              onClick={() => router.push("/dashboard/events")}
              className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-lg border-2 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 transition-all"
            >
              Terug naar evenementen
            </button>
          </div>

          {/* Info box */}
          <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              💳 Hoe werkt het?
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Geld gaat rechtstreeks naar jouw bankrekening</li>
              <li>• Entro raakt het geld nooit aan</li>
              <li>• KYC-verificatie is wettelijk verplicht</li>
              <li>• 2% platformfee per verkocht ticket</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
