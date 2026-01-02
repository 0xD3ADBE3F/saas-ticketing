"use client";

import { Lock, Unlock } from "lucide-react";

interface FreeEventLimitInfoProps {
  freeEventLimit: number;
  unlockFee: number;
  isUnlocked: boolean;
  onUnlock?: () => void;
  showUnlockButton?: boolean;
  context?: "event" | "ticketType";
}

export function FreeEventLimitInfo({
  freeEventLimit,
  unlockFee,
  isUnlocked,
  onUnlock,
  showUnlockButton = true,
  context = "event",
}: FreeEventLimitInfoProps) {
  // Calculate unlock fee including VAT (21%)
  const unlockFeeInclVat = Math.round(unlockFee * 1.21);

  const contextText = {
    event: {
      title: isUnlocked
        ? "Onbeperkte tickets ontgrendeld"
        : "Ticketlimiet voor gratis evenement",
      description: isUnlocked
        ? "Je kunt tot 2.500 tickets (systeemmaximum) verkopen voor dit evenement."
        : `Voor gratis evenementen geldt een standaardlimiet van ${freeEventLimit} tickets. Betaal eenmalig €${(unlockFeeInclVat / 100).toFixed(2)} om tot 2.500 tickets te kunnen verkopen.`,
      buttonText: "Ontgrendel meer tickets",
    },
    ticketType: {
      title: isUnlocked
        ? "Onbeperkte tickets ontgrendeld"
        : "Capaciteitslimiet voor gratis evenement",
      description: isUnlocked
        ? "Dit evenement heeft onbeperkte tickets ontgrendeld (max. 2.500 totaal)."
        : `Voor gratis evenementen geldt een limiet van ${freeEventLimit} tickets totaal. De totale capaciteit van alle ticket types mag niet meer zijn dan ${freeEventLimit}.`,
      buttonText: "Ontgrendel meer tickets",
    },
  };

  const text = contextText[context];

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
      <div className="flex items-start gap-3">
        {isUnlocked ? (
          <div className="flex-shrink-0">
            <Unlock className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
        ) : (
          <div className="flex-shrink-0">
            <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">
            {text.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {text.description}
          </p>
          {!isUnlocked && showUnlockButton && onUnlock && (
            <button
              type="button"
              onClick={onUnlock}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Unlock className="w-4 h-4" />
              {text.buttonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
