import type { PlanInfo } from "@/app/(dashboard)/dashboard/settings/subscription/actions";
import type { PricingPlan } from "@/generated/prisma";

interface PlanComparisonCardProps {
  plan: PlanInfo;
  currentPlan: PricingPlan | null;
  onSelect?: (plan: PricingPlan) => void;
  disabled?: boolean;
}

export function PlanComparisonCard({
  plan,
  currentPlan,
  onSelect,
  disabled,
}: PlanComparisonCardProps) {
  const isCurrentPlan = currentPlan !== null && plan.plan === currentPlan;
  // If no current plan, treat all plans as potential upgrades (signing up)
  const isUpgrade =
    currentPlan === null || getPlanOrder(plan.plan) > getPlanOrder(currentPlan);
  const isDowngrade =
    currentPlan !== null && getPlanOrder(plan.plan) < getPlanOrder(currentPlan);

  const planIcons: Record<PricingPlan, string> = {
    NON_PROFIT: "🏛️",
    PAY_PER_EVENT: "🎫",
    ORGANIZER: "🏢",
    PRO_ORGANIZER: "⭐",
  };

  const getButtonText = () => {
    if (isCurrentPlan) return "Huidig plan";
    // When no current plan, show "Selecteren" instead of "Upgraden"
    if (currentPlan === null) return "Selecteren";
    if (isUpgrade) return "Upgraden";
    if (isDowngrade) return "Downgraden";
    return "Selecteren";
  };

  const getButtonStyle = () => {
    if (isCurrentPlan) {
      return "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-default";
    }
    if (isUpgrade || currentPlan === null) {
      return "bg-blue-600 hover:bg-blue-700 text-white";
    }
    return "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300";
  };

  return (
    <div
      className={`relative bg-white dark:bg-gray-900 border rounded-lg p-6 flex flex-col transition-all ${
        isCurrentPlan
          ? "border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20"
          : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
      } ${plan.isPopular && !isCurrentPlan ? "ring-2 ring-purple-500/20 border-purple-300 dark:border-purple-700" : ""}`}
    >
      {/* Badges */}
      <div className="absolute -top-3 left-4 flex gap-2">
        {isCurrentPlan && (
          <span className="px-2.5 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full">
            Huidig
          </span>
        )}
        {plan.isPopular && !isCurrentPlan && (
          <span className="px-2.5 py-0.5 bg-purple-600 text-white text-xs font-medium rounded-full">
            Populair
          </span>
        )}
      </div>

      {/* Header */}
      <div className="text-center mb-4 pt-2">
        <span className="text-3xl mb-2 block">{planIcons[plan.plan]}</span>
        <h3 className="font-bold text-lg">{plan.displayName}</h3>
      </div>

      {/* Price */}
      <div className="text-center mb-6">
        {plan.monthlyPrice === 0 ? (
          <div>
            <span className="text-3xl font-bold">Gratis</span>
          </div>
        ) : plan.eventPrice !== null ? (
          <div>
            <span className="text-3xl font-bold">
              €{(plan.eventPrice / 100).toFixed(0)}
            </span>
            <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">
              /evenement
            </span>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              (excl. BTW)
            </div>
          </div>
        ) : plan.monthlyPrice !== null ? (
          <div>
            <span className="text-3xl font-bold">
              €{(plan.monthlyPrice / 100).toFixed(0)}
            </span>
            <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">
              /maand
            </span>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              (excl. BTW)
            </div>
          </div>
        ) : null}
      </div>

      {/* Key Stats */}
      <div className="space-y-3 mb-6 flex-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Tickets</span>
          <span className="font-medium">
            {plan.ticketLimit.toLocaleString("nl-NL")} /{" "}
            {plan.limitPeriod === "month" ? "maand" : "event"}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Evenementen</span>
          <span className="font-medium">
            {plan.activeEventsLimit === null
              ? "Onbeperkt"
              : plan.activeEventsLimit}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Overage</span>
          <span className="font-medium">
            {plan.overageAllowed && plan.overageFee !== null
              ? `€${(plan.overageFee / 100).toFixed(2)}/ticket`
              : "—"}
          </span>
        </div>
      </div>

      {/* Features Preview */}
      <div className="space-y-2 mb-6 text-sm border-t border-gray-100 dark:border-gray-800 pt-4">
        {plan.features.slice(5, 10).map((feature, index) => (
          <div key={index} className="flex items-start gap-2">
            <span
              className={feature.included ? "text-green-500" : "text-gray-400"}
            >
              {feature.included ? "✓" : "✗"}
            </span>
            <span className="text-gray-700 dark:text-gray-300">
              {feature.name}
            </span>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <button
        onClick={() => !isCurrentPlan && !disabled && onSelect?.(plan.plan)}
        disabled={isCurrentPlan || disabled}
        className={`w-full py-2.5 px-4 rounded-lg font-medium transition-colors ${getButtonStyle()}`}
      >
        {getButtonText()}
      </button>
    </div>
  );
}

/**
 * Get the order of a plan for comparison
 */
function getPlanOrder(plan: PricingPlan): number {
  const order: Record<PricingPlan, number> = {
    NON_PROFIT: 0,
    PAY_PER_EVENT: 1,
    ORGANIZER: 2,
    PRO_ORGANIZER: 3,
  };
  return order[plan];
}
