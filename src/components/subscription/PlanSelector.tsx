"use client";

import { useState } from "react";
import type { PlanInfo } from "@/app/(dashboard)/dashboard/settings/subscription/actions";
import type { PricingPlan } from "@/generated/prisma";
import { PlanComparisonCard } from "./PlanComparisonCard";
import { UpgradeModal } from "./UpgradeModal";
import { DowngradeModal } from "./DowngradeModal";

interface PlanSelectorProps {
  plans: PlanInfo[];
  currentPlan: PricingPlan | null;
  currentUsage: {
    ticketsSold: number;
    periodEnd: Date | null;
  };
}

export function PlanSelector({
  plans,
  currentPlan,
  currentUsage,
}: PlanSelectorProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanInfo | null>(null);
  const [modalType, setModalType] = useState<"upgrade" | "downgrade" | null>(
    null
  );

  const handlePlanSelect = (planId: PricingPlan) => {
    const plan = plans.find((p) => p.plan === planId);
    if (!plan || plan.plan === currentPlan) return;

    // If no current plan, treat all plan selections as upgrades (signing up)
    const isUpgrade =
      currentPlan === null || getPlanOrder(planId) > getPlanOrder(currentPlan);
    setSelectedPlan(plan);
    setModalType(isUpgrade ? "upgrade" : "downgrade");
  };

  const handleCloseModal = () => {
    setSelectedPlan(null);
    setModalType(null);
  };

  const currentPlanInfo = currentPlan
    ? plans.find((p) => p.plan === currentPlan)
    : null;

  return (
    <>
      {/* Plan Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <PlanComparisonCard
            key={plan.plan}
            plan={plan}
            currentPlan={currentPlan}
            onSelect={handlePlanSelect}
          />
        ))}
      </div>

      {/* Comparison Table */}
      <div className="mt-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold">Vergelijk plannen</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-left p-4 font-medium">Feature</th>
                {plans.map((plan) => (
                  <th
                    key={plan.plan}
                    className={`text-center p-4 font-medium ${
                      plan.plan === currentPlan
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : ""
                    }`}
                  >
                    {plan.displayName}
                    {plan.plan === currentPlan && (
                      <span className="block text-xs text-blue-600 dark:text-blue-400 font-normal mt-1">
                        Huidig
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              <tr>
                <td className="p-4 text-gray-600 dark:text-gray-400">Prijs</td>
                {plans.map((plan) => (
                  <td
                    key={plan.plan}
                    className={`text-center p-4 font-medium ${
                      plan.plan === currentPlan
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : ""
                    }`}
                  >
                    {plan.priceDescription}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-gray-600 dark:text-gray-400">
                  Ticket limiet
                </td>
                {plans.map((plan) => (
                  <td
                    key={plan.plan}
                    className={`text-center p-4 ${
                      plan.plan === currentPlan
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : ""
                    }`}
                  >
                    {plan.ticketLimit.toLocaleString("nl-NL")} /{" "}
                    {plan.limitPeriod === "month" ? "maand" : "event"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-gray-600 dark:text-gray-400">
                  Actieve evenementen
                </td>
                {plans.map((plan) => (
                  <td
                    key={plan.plan}
                    className={`text-center p-4 ${
                      plan.plan === currentPlan
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : ""
                    }`}
                  >
                    {plan.activeEventsLimit === null
                      ? "Onbeperkt"
                      : plan.activeEventsLimit}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-gray-600 dark:text-gray-400">
                  Overage kosten
                </td>
                {plans.map((plan) => (
                  <td
                    key={plan.plan}
                    className={`text-center p-4 ${
                      plan.plan === currentPlan
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : ""
                    }`}
                  >
                    {plan.overageAllowed && plan.overageFee !== null
                      ? `€${(plan.overageFee / 100).toFixed(2)}/ticket`
                      : "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-gray-600 dark:text-gray-400">
                  Whitelabel
                </td>
                {plans.map((plan) => (
                  <td
                    key={plan.plan}
                    className={`text-center p-4 ${
                      plan.plan === currentPlan
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : ""
                    }`}
                  >
                    {plan.plan === "PRO_ORGANIZER" ? (
                      <span className="text-green-600 dark:text-green-400">
                        ✓ Inbegrepen
                      </span>
                    ) : (
                      <span className="text-gray-500">+2% fee</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Upgrade Modal - show for upgrades AND initial signups (when currentPlan is null) */}
      {modalType === "upgrade" && selectedPlan && (
        <UpgradeModal
          fromPlan={currentPlanInfo ?? null}
          toPlan={selectedPlan}
          periodEnd={currentUsage.periodEnd}
          onClose={handleCloseModal}
        />
      )}

      {/* Downgrade Modal - only show when currentPlanInfo exists */}
      {modalType === "downgrade" && selectedPlan && currentPlanInfo && (
        <DowngradeModal
          fromPlan={currentPlanInfo}
          toPlan={selectedPlan}
          currentUsage={currentUsage.ticketsSold}
          periodEnd={currentUsage.periodEnd}
          onClose={handleCloseModal}
        />
      )}
    </>
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
