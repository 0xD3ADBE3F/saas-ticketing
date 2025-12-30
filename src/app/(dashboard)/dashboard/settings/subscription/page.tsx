import { getSubscriptionAction } from "./actions";
import { SubscriptionOverview } from "@/components/subscription/SubscriptionOverview";
import { UsageMeter } from "@/components/subscription/UsageMeter";
import { SubscriptionPaymentPoller } from "@/components/subscription/SubscriptionPaymentPoller";
import Link from "next/link";

export default async function SubscriptionPage() {
  const subscription = await getSubscriptionAction();

  if (!subscription) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <p className="text-gray-600 dark:text-gray-400">
          Er is een fout opgetreden bij het laden van je abonnement.
        </p>
      </div>
    );
  }

  // Check if billing info is incomplete
  const billingIncomplete = !subscription.hasRequiredBillingInfo;

  // Check if there's no active plan (plan is null)
  const hasNoPlan = !subscription.plan;
  console.log({ subscription });

  // Show simple "no plan" state
  if (hasNoPlan) {
    return (
      <div className="space-y-6">
        {/* Payment Status Poller - shows loading state while webhook processes */}
        <SubscriptionPaymentPoller
          organizationId={subscription.organizationId}
          currentPlan={subscription.plan}
        />

        {/* Billing Info Warning */}
        {billingIncomplete && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-red-600 dark:text-red-400 text-xl">⚠️</span>
              <div className="flex-1">
                <p className="font-medium text-red-800 dark:text-red-200">
                  Bedrijfsgegevens vereist
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Om een abonnement af te sluiten moet je eerst de volgende
                  gegevens invullen:
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 mt-2 list-disc list-inside">
                  {subscription.missingBillingFields.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
                <Link
                  href="/dashboard/settings"
                  className="inline-flex items-center gap-2 px-4 py-2 mt-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Gegevens invullen →
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">📋</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">Geen actief abonnement</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Je hebt momenteel geen actief abonnement. Kies een plan om events te
            kunnen publiceren en tickets te verkopen.
          </p>
          {billingIncomplete ? (
            <button
              disabled
              className="inline-flex px-6 py-3 bg-gray-400 text-white rounded-lg cursor-not-allowed font-medium opacity-60"
              title="Vul eerst je bedrijfsgegevens in"
            >
              Kies een plan
            </button>
          ) : (
            <Link
              href="/dashboard/settings/subscription/upgrade"
              className="inline-flex px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Kies een plan
            </Link>
          )}
        </div>
      </div>
    );
  }

  const isPaidPlan = subscription.plan !== "NON_PROFIT";
  const hasOverage = subscription.overageTickets > 0;

  return (
    <div className="space-y-6">
      {/* Payment Status Poller - shows loading state while webhook processes */}
      <SubscriptionPaymentPoller
        organizationId={subscription.organizationId}
        currentPlan={subscription.plan}
      />

      {/* Upgrade in Progress Notice */}
      {subscription.status === "TRIALING" && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-blue-600 dark:text-blue-400">⏳</span>
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">
                Je upgrade wordt verwerkt
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Je upgrade naar <strong>{subscription.planDisplayName}</strong>{" "}
                wordt momenteel verwerkt.
                {subscription.currentPeriodEnd && (
                  <>
                    {" "}
                    Het nieuwe plan wordt actief vanaf{" "}
                    {subscription.currentPeriodEnd.toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    .
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation/Downgrade Notice */}
      {subscription.cancelAtPeriodEnd &&
        subscription.currentPeriodEnd &&
        subscription.status !== "TRIALING" && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Wijziging gepland
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Je nieuwe plan <strong>{subscription.planDisplayName}</strong>{" "}
                  wordt actief op{" "}
                  {subscription.currentPeriodEnd.toLocaleDateString("nl-NL", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  . Tot die tijd kun je nog gebruik maken van alle functies van
                  je huidige plan.
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Past Due Warning */}
      {subscription.status === "PAST_DUE" && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-red-600 dark:text-red-400">❌</span>
            <div className="flex-1">
              <p className="font-medium text-red-800 dark:text-red-200">
                Betaling mislukt
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                We konden je laatste betaling niet verwerken. Werk je
                betaalmethode bij om je abonnement actief te houden.
              </p>
              <button className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                Betaalmethode bijwerken
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Current Plan Card */}
        <SubscriptionOverview subscription={subscription} />

        {/* Usage Meter */}
        <UsageMeter subscription={subscription} />
      </div>

      {/* Plan Features */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h3 className="font-semibold mb-4">Inbegrepen functies</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {subscription.features.map((feature, index) => (
            <div key={index} className="flex items-start gap-2">
              <span
                className={
                  feature.included ? "text-green-500" : "text-gray-400"
                }
              >
                {feature.included ? "✓" : "✗"}
              </span>
              <div>
                <span className="text-sm">{feature.name}</span>
                {feature.note && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">
                    {feature.note}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overage Notice */}
      {hasOverage && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-orange-600 dark:text-orange-400">📈</span>
            <div>
              <p className="font-medium text-orange-800 dark:text-orange-200">
                Je hebt je limiet overschreden
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                Je hebt {subscription.overageTickets} extra tickets verkocht
                boven je limiet. Dit resulteert in €
                {(subscription.overageFeeTotal / 100).toFixed(2)} aan
                overagekosten, die worden verrekend met je volgende uitbetaling.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h3 className="font-semibold mb-4">Beheer</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/settings/subscription/upgrade"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            {subscription.plan === "PRO_ORGANIZER"
              ? "Bekijk plannen"
              : "Upgrade plan"}
          </Link>

          {isPaidPlan && (
            <>
              <Link
                href="/dashboard/settings/subscription/billing"
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Facturen bekijken
              </Link>

              <button className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium">
                Betaalmethode wijzigen
              </button>

              {!subscription.cancelAtPeriodEnd && (
                <button className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium">
                  Abonnement opzeggen
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
