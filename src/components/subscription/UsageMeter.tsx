import type { SubscriptionData } from "@/app/(dashboard)/dashboard/settings/subscription/actions";

interface UsageMeterProps {
  subscription: SubscriptionData;
}

export function UsageMeter({ subscription }: UsageMeterProps) {
  const {
    ticketsSold,
    ticketLimit,
    usagePercentage,
    overageTickets,
    overageFeeTotal,
    limitPeriod,
    overageAllowed,
    plan,
  } = subscription;

  // Don't render if there's no plan
  if (plan === null || ticketLimit === null) {
    return null;
  }

  // Determine color based on usage percentage
  const getProgressColor = () => {
    if (!overageAllowed && usagePercentage >= 100) {
      return "bg-red-500"; // Hard limit reached
    }
    if (usagePercentage >= 100) {
      return "bg-orange-500"; // Overage
    }
    if (usagePercentage >= 80) {
      return "bg-yellow-500"; // Warning
    }
    return "bg-green-500"; // Normal
  };

  const getStatusText = () => {
    if (!overageAllowed && usagePercentage >= 100) {
      return {
        text: "Limiet bereikt",
        color: "text-red-600 dark:text-red-400",
      };
    }
    if (usagePercentage >= 100) {
      return {
        text: "Limiet overschreden",
        color: "text-orange-600 dark:text-orange-400",
      };
    }
    if (usagePercentage >= 80) {
      return {
        text: "Bijna vol",
        color: "text-yellow-600 dark:text-yellow-400",
      };
    }
    return { text: "Normaal", color: "text-green-600 dark:text-green-400" };
  };

  const status = getStatusText();
  const progressColor = getProgressColor();

  // Calculate next reset date
  const getResetDate = () => {
    if (limitPeriod === "event") {
      return "Per evenement";
    }
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Cap visual percentage at 100 for the progress bar
  const visualPercentage = Math.min(usagePercentage, 100);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Verbruik {limitPeriod === "month" ? "deze maand" : "dit evenement"}
        </h3>
        <span className={`text-sm font-medium ${status.color}`}>
          {status.text}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${progressColor} transition-all duration-500 ease-out`}
            style={{ width: `${visualPercentage}%` }}
          />
        </div>
      </div>

      {/* Numbers */}
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {ticketsSold.toLocaleString("nl-NL")}
          </span>
          <span className="text-gray-500 dark:text-gray-400 ml-1">
            / {ticketLimit.toLocaleString("nl-NL")}
          </span>
        </div>
        <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          {usagePercentage}%
        </span>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        tickets verkocht
      </p>

      {/* Overage Info */}
      {overageTickets > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-orange-500">📈</span>
            <div>
              <span className="font-medium text-orange-800 dark:text-orange-200">
                +{overageTickets.toLocaleString("nl-NL")} overage tickets
              </span>
              <span className="text-orange-700 dark:text-orange-300 ml-2">
                (€{(overageFeeTotal / 100).toFixed(2)})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Hard Limit Warning */}
      {!overageAllowed && usagePercentage >= 100 && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2 text-sm">
            <span className="text-red-500 mt-0.5">⚠️</span>
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">
                Limiet bereikt
              </p>
              <p className="text-red-700 dark:text-red-300 mt-1">
                Je kunt geen tickets meer verkopen. Upgrade naar een betaald
                plan voor meer tickets.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reset Info */}
      <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Reset datum</span>
          <span className="font-medium">{getResetDate()}</span>
        </div>
      </div>

      {/* Warning at 80% */}
      {usagePercentage >= 80 && usagePercentage < 100 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            💡 Je nadert je ticketlimiet.{" "}
            {overageAllowed ? (
              <>Na de limiet worden overage kosten in rekening gebracht.</>
            ) : (
              <>Upgrade je plan om meer tickets te kunnen verkopen.</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
