import { getSubscriptionAction, getAvailablePlansAction } from "../actions";
import { PlanSelector } from "@/components/subscription/PlanSelector";
import Link from "next/link";

export default async function UpgradePage() {
  const [subscription, plans] = await Promise.all([
    getSubscriptionAction(),
    getAvailablePlansAction(),
  ]);

  if (!subscription) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <p className="text-gray-600 dark:text-gray-400">
          Er is een fout opgetreden bij het laden van de plannen.
        </p>
      </div>
    );
  }

  const hasNoPlan = !subscription.plan;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/settings/subscription"
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 mb-2"
          >
            ← Terug naar abonnement
          </Link>
          <h2 className="text-xl font-bold">Kies je plan</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Selecteer het plan dat het beste bij jouw organisatie past
          </p>
        </div>
      </div>

      {/* Current Plan Notice - only show if user has a plan */}
      {!hasNoPlan && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-blue-600 dark:text-blue-400">ℹ️</span>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Je huidige plan is <strong>{subscription.planDisplayName}</strong>
              .
              {subscription.plan !== "PRO_ORGANIZER" && (
                <> Upgrade voor meer tickets en functies.</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* No Plan Notice */}
      {hasNoPlan && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400">📋</span>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Je hebt nog geen plan. Kies hieronder een plan om te beginnen.
            </p>
          </div>
        </div>
      )}

      {/* Plan Selector */}
      <PlanSelector
        plans={plans}
        currentPlan={subscription.plan}
        currentUsage={{
          ticketsSold: subscription.ticketsSold,
          periodEnd: subscription.currentPeriodEnd,
        }}
      />

      {/* FAQ / Help Section */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h3 className="font-semibold mb-4">Veelgestelde vragen</h3>
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              Wat gebeurt er als ik upgrade?
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Bij een upgrade wordt je nieuwe plan direct actief. Je betaalt een
              naar rato berekend bedrag voor de resterende dagen van je huidige
              factureringsperiode.
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              Wat gebeurt er als ik downgrade?
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Bij een downgrade blijft je huidige plan actief tot het einde van
              je factureringsperiode. Daarna wordt je nieuwe plan actief.
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              Wat zijn overage kosten?
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Als je meer tickets verkoopt dan je limiet toelaat, betaal je een
              klein bedrag per extra ticket. Dit wordt verrekend met je
              uitbetaling.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
