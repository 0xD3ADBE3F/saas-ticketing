"use client";

interface OnboardingChecklistProps {
  organizationId: string;
  steps: {
    accountCreated: boolean;
    eventCreated: boolean;
    mollieConnected: boolean;
    ticketsCreated: boolean;
    eventPublished: boolean;
  };
  eventIsPaid: boolean;
}

/**
 * Onboarding checklist component
 * Shows progress through onboarding steps
 * Displayed in the dashboard or event detail page
 */
export function OnboardingChecklist({
  steps,
  eventIsPaid,
}: OnboardingChecklistProps) {
  const allCompleted = Object.values(steps).every((step) => step);

  // Don't show if all completed
  if (allCompleted) {
    return null;
  }

  return (
    <div className="mb-6 p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            🚀 Aan de slag
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Voltooi deze stappen om te beginnen met ticketverkoop
          </p>
        </div>
        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
          {Object.values(steps).filter(Boolean).length} /{" "}
          {Object.keys(steps).length}
        </div>
      </div>

      <div className="space-y-3">
        <ChecklistItem
          completed={steps.accountCreated}
          title="Account aangemaakt"
          description="Je organisatie is aangemaakt"
        />

        <ChecklistItem
          completed={steps.eventCreated}
          title="Evenement aangemaakt"
          description="Maak je eerste evenement aan"
          href="/dashboard/events/new"
        />

        {eventIsPaid && (
          <ChecklistItem
            completed={steps.mollieConnected}
            title="Betalingen geactiveerd"
            description="Mollie-account koppelen voor online betalingen"
            badge={steps.mollieConnected ? null : "Vereist"}
          />
        )}

        <ChecklistItem
          completed={steps.ticketsCreated}
          title="Tickettypes aangemaakt"
          description="Voeg tickettypes toe aan je evenement"
        />

        <ChecklistItem
          completed={steps.eventPublished}
          title="Evenement gepubliceerd"
          description="Zet je evenement live om verkoop te starten"
        />
      </div>

      {!allCompleted && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            💡 <strong>Tip:</strong> Je kunt je evenement op elk moment
            aanpassen. Maak eerst een concept en publiceer wanneer je klaar
            bent.
          </p>
        </div>
      )}
    </div>
  );
}

interface ChecklistItemProps {
  completed: boolean;
  title: string;
  description: string;
  href?: string;
  badge?: string | null;
}

function ChecklistItem({
  completed,
  title,
  description,
  href,
  badge,
}: ChecklistItemProps) {
  const content = (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
        completed
          ? "bg-green-50 dark:bg-green-900/20"
          : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750"
      } ${href && !completed ? "cursor-pointer" : ""}`}
    >
      {/* Checkmark */}
      <div className="flex-shrink-0 mt-0.5">
        {completed ? (
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        ) : (
          <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 rounded-full" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4
            className={`font-medium ${
              completed
                ? "text-green-900 dark:text-green-100"
                : "text-gray-900 dark:text-white"
            }`}
          >
            {title}
          </h4>
          {badge && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <p
          className={`text-sm mt-0.5 ${
            completed
              ? "text-green-700 dark:text-green-300"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {description}
        </p>
      </div>

      {/* Arrow for clickable items */}
      {href && !completed && (
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      )}
    </div>
  );

  if (href && !completed) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }

  return content;
}
