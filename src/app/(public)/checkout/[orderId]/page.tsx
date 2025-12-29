import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrderForCheckout } from "@/server/services/orderService";
import { formatPrice } from "@/lib/currency";
import { formatDateTime, formatDateRange } from "@/lib/date";

interface CheckoutPageProps {
  params: Promise<{ orderId: string }>;
}

export async function generateMetadata({ params }: CheckoutPageProps) {
  const { orderId } = await params;
  const result = await getOrderForCheckout(orderId);

  if (!result.success) {
    return {
      title: "Bestelling niet gevonden",
    };
  }

  return {
    title: `Bestelling ${result.data.order.orderNumber}`,
    description: `Bestelling voor ${result.data.event.title}`,
  };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { orderId } = await params;
  const result = await getOrderForCheckout(orderId);

  if (!result.success) {
    notFound();
  }

  const { order, event, items } = result.data;

  // Check if order is still pending and not expired
  const isExpired =
    order.status === "PENDING" &&
    order.expiresAt &&
    new Date(order.expiresAt) < new Date();
  const isPending = order.status === "PENDING" && !isExpired;
  const isPaid = order.status === "PAID";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            Ticketplatform
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Status Banner */}
          {isExpired && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-medium">Deze bestelling is verlopen</span>
              </div>
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                De reservering is niet op tijd betaald. Je kunt een nieuwe
                bestelling plaatsen.
              </p>
              <Link
                href={`/e/${event.slug}`}
                className="mt-3 inline-block px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Terug naar evenement
              </Link>
            </div>
          )}

          {isPaid && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="font-medium">Betaling ontvangen</span>
              </div>
              <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                Je tickets zijn onderweg naar {order.buyerEmail}
              </p>
            </div>
          )}

          {isPending && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-medium">Wachtend op betaling</span>
              </div>
              <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
                Je tickets worden gereserveerd tot de betaling is voltooid.
              </p>
            </div>
          )}

          {/* Order Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Bestelnummer
                </p>
                <p className="font-mono font-medium text-gray-900 dark:text-white">
                  {order.orderNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Geplaatst op
                </p>
                <p className="text-gray-900 dark:text-white">
                  {formatDateTime(order.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Event Info */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
              {event.title}
            </h2>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <p>{formatDateRange(event.startsAt, event.endsAt)}</p>
              {event.location && <p>{event.location}</p>}
            </div>
          </div>

          {/* Order Items */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">
              Tickets
            </h3>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {item.quantity}× {item.ticketTypeName}
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {formatPrice(item.totalPrice)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="p-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotaal</span>
                <span>{formatPrice(order.ticketTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Servicekosten</span>
                <span>{formatPrice(order.serviceFee)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-white">
                <span>Totaal</span>
                <span>{formatPrice(order.totalAmount)}</span>
              </div>
            </div>

            {/* Payment Button (for pending orders) */}
            {isPending && (
              <div className="mt-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Betaal met iDEAL om je tickets te ontvangen.
                </p>
                {/* In Slice 5, this will redirect to Mollie payment */}
                <button
                  type="button"
                  disabled
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
                >
                  Betalen met iDEAL ({formatPrice(order.totalAmount)})
                </button>
                <p className="mt-2 text-xs text-center text-gray-400">
                  Betalingsfunctionaliteit wordt binnenkort toegevoegd
                </p>
              </div>
            )}

            {/* Back to Event Link */}
            {(isPaid || isExpired) && (
              <div className="mt-6 text-center">
                <Link
                  href={`/e/${event.slug}`}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                >
                  ← Terug naar evenement
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Buyer Info */}
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Bestelling voor{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {order.buyerEmail}
            </span>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-16">
        <div className="max-w-2xl mx-auto px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            © {new Date().getFullYear()} Ticketplatform. Alle rechten
            voorbehouden.
          </p>
        </div>
      </footer>
    </div>
  );
}
