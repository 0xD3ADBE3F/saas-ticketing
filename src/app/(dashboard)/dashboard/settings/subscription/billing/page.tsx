import { getInvoicesAction, getSubscriptionAction } from "../actions";
import { BillingHistory } from "@/components/subscription/BillingHistory";
import { InvoiceFiltersWrapper } from "@/components/subscription/InvoiceFiltersWrapper";
import type { InvoiceType, InvoiceStatus } from "@/generated/prisma";

interface PageProps {
  searchParams: Promise<{
    type?: InvoiceType;
    status?: InvoiceStatus;
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}

export default async function BillingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1");
  const limit = 20;

  // Get subscription data for summary
  const subscription = await getSubscriptionAction();

  // Get invoices with filters
  const { invoices, total } = await getInvoicesAction({
    type: params.type,
    status: params.status,
    startDate: params.startDate,
    endDate: params.endDate,
    page,
    limit,
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Facturatie</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Bekijk en download je facturen voor abonnementen en evenementen
        </p>
      </div>

      {/* Subscription Summary Card */}
      {subscription && subscription.plan && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Actief abonnement</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Plan
              </dt>
              <dd className="mt-1 text-sm">{subscription.planDisplayName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Status
              </dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    subscription.status === "ACTIVE"
                      ? "bg-green-100 text-green-800"
                      : subscription.status === "PAST_DUE"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {subscription.status === "ACTIVE"
                    ? "Actief"
                    : subscription.status === "PAST_DUE"
                      ? "Achterstallig"
                      : subscription.status === "CANCELLED"
                        ? "Geannuleerd"
                        : subscription.status}
                </span>
              </dd>
            </div>
            {subscription.currentPeriodEnd && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {subscription.cancelAtPeriodEnd
                    ? "Verloopt op"
                    : "Volgende verlenging"}
                </dt>
                <dd className="mt-1 text-sm">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString(
                    "nl-NL",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  )}
                </dd>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <InvoiceFiltersWrapper />

      {/* Invoice Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-medium">Facturen ({total})</h2>
        </div>
        <BillingHistory
          initialInvoices={invoices}
          totalCount={total}
          currentPage={page}
          pageSize={limit}
        />
      </div>
    </div>
  );
}
