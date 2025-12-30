import type { SubscriptionData } from "@/app/(dashboard)/dashboard/settings/subscription/actions";

interface SubscriptionOverviewProps {
  subscription: SubscriptionData;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  ACTIVE: {
    label: "Actief",
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  },
  PAST_DUE: {
    label: "Betaling mislukt",
    color: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  },
  CANCELLED: {
    label: "Opgezegd",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  },
  TRIALING: {
    label: "Proefperiode",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  },
};

const planIcons: Record<string, string> = {
  NON_PROFIT: "🏛️",
  PAY_PER_EVENT: "🎫",
  ORGANIZER: "🏢",
  PRO_ORGANIZER: "⭐",
};

export function SubscriptionOverview({
  subscription,
}: SubscriptionOverviewProps) {
  const statusInfo = statusLabels[subscription.status] || statusLabels.ACTIVE;
  const planIcon = subscription.plan
    ? planIcons[subscription.plan] || "📋"
    : "📋";

  const hasNextBilling =
    subscription.currentPeriodEnd &&
    !subscription.cancelAtPeriodEnd &&
    subscription.plan !== "NON_PROFIT" &&
    subscription.plan !== null;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Huidig plan
        </h3>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}
        >
          {statusInfo.label}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{planIcon}</span>
        <div>
          <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {subscription.planDisplayName}
          </h4>
          <p className="text-gray-600 dark:text-gray-400">
            {subscription.planPriceDescription}
          </p>
        </div>
      </div>

      {/* Plan Details */}
      <div className="space-y-2 text-sm border-t border-gray-100 dark:border-gray-800 pt-4">
        {subscription.ticketLimit !== null && (
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              Ticket limiet
            </span>
            <span className="font-medium">
              {subscription.ticketLimit.toLocaleString("nl-NL")} /{" "}
              {subscription.limitPeriod === "month" ? "maand" : "evenement"}
            </span>
          </div>
        )}

        {subscription.activeEventsLimit !== null && (
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              Actieve evenementen
            </span>
            <span className="font-medium">
              {subscription.activeEventsLimit === 1
                ? "1 tegelijk"
                : "Onbeperkt"}
            </span>
          </div>
        )}

        {subscription.overageAllowed && subscription.overageFee !== null && (
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              Overage kosten
            </span>
            <span className="font-medium">
              €{(subscription.overageFee / 100).toFixed(2)} / ticket
            </span>
          </div>
        )}

        {!subscription.overageAllowed && (
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Overage</span>
            <span className="text-gray-500 dark:text-gray-500">
              Niet beschikbaar
            </span>
          </div>
        )}
      </div>

      {/* Next Billing */}
      {hasNextBilling && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Volgende factuur
            </span>
            <span className="font-medium">
              {subscription.currentPeriodEnd?.toLocaleDateString("nl-NL", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      )}

      {/* Branding Status */}
      {subscription.brandingRemoved && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-500">✓</span>
            <span className="text-gray-600 dark:text-gray-400">
              Entro-branding verwijderd (+2% platform fee)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
