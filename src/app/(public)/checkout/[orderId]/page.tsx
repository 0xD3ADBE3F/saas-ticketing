import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrderForCheckout } from "@/server/services/orderService";
import { getTicketsWithQR } from "@/server/services/ticketService";
import { formatPrice } from "@/lib/currency";
import { formatDateTime, formatDateRange } from "@/lib/date";
import { PaymentButton } from "@/components/checkout/PaymentButton";
import { TicketDisplay } from "@/components/checkout/TicketDisplay";
import { PaymentStatusPoller } from "@/components/checkout/PaymentStatusPoller";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, XCircle, Clock, Ban } from "lucide-react";

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
  const isFailed = order.status === "FAILED";
  const isCancelled = order.status === "CANCELLED";

  // Fetch tickets if order is paid
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const ticketsResult = isPaid
    ? await getTicketsWithQR(orderId, baseUrl)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Payment Status Poller - polls for updates after payment redirect */}
      <PaymentStatusPoller orderId={order.id} orderStatus={order.status} />

      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            Entro
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Status Banner */}
          {isExpired && (
            <Alert
              variant="destructive"
              className="rounded-none border-x-0 border-t-0"
            >
              <AlertCircle className="h-5 w-5" />
              <AlertDescription>
                <span className="font-medium block mb-1">
                  Deze bestelling is verlopen
                </span>
                <p className="mb-3">
                  De reservering is niet op tijd betaald. Je kunt een nieuwe
                  bestelling plaatsen.
                </p>
                <Button asChild variant="destructive" size="sm">
                  <Link href={`/e/${event.slug}`}>Terug naar evenement</Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {isPaid && (
            <Alert
              variant="success"
              className="rounded-none border-x-0 border-t-0"
            >
              <CheckCircle className="h-5 w-5" />
              <AlertDescription>
                <span className="font-medium block mb-1">
                  Betaling ontvangen
                </span>
                <p>Je tickets zijn verstuurd naar {order.buyerEmail}</p>
              </AlertDescription>
            </Alert>
          )}

          {isFailed && (
            <Alert
              variant="destructive"
              className="rounded-none border-x-0 border-t-0"
            >
              <XCircle className="h-5 w-5" />
              <AlertDescription>
                <span className="font-medium block mb-1">Betaling mislukt</span>
                <p>
                  De betaling is niet geslaagd. Je kunt het opnieuw proberen of
                  de bestelling annuleren.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {isCancelled && (
            <Alert
              variant="default"
              className="rounded-none border-x-0 border-t-0"
            >
              <Ban className="h-5 w-5" />
              <AlertDescription>
                <span className="font-medium block mb-1">
                  Bestelling geannuleerd
                </span>
                <p>Deze bestelling is geannuleerd.</p>
              </AlertDescription>
            </Alert>
          )}

          {/* Show tickets for paid orders */}
          {isPaid && ticketsResult?.success && (
            <div className="p-6">
              <TicketDisplay
                tickets={ticketsResult.data.tickets.map((t) => ({
                  id: t.id,
                  code: t.code,
                  ticketType: { name: t.ticketType.name },
                  event: {
                    title: t.event.title,
                    startsAt: t.event.startsAt,
                    endsAt: t.event.endsAt,
                    location: t.event.location,
                  },
                  qrData: t.qrData,
                }))}
                orderNumber={order.orderNumber}
                buyerEmail={order.buyerEmail}
              />
            </div>
          )}

          {isPending && (
            <Alert
              variant="warning"
              className="rounded-none border-x-0 border-t-0"
            >
              <Clock className="h-5 w-5" />
              <AlertDescription>
                <span className="font-medium block mb-1">
                  Wachtend op betaling
                </span>
                <p>
                  Je tickets worden gereserveerd tot de betaling is voltooid.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Order Header - Only show for pending/expired orders */}
          {!isPaid && (
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
          )}

          {/* Event Info - Only show for pending/expired orders */}
          {!isPaid && (
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
                {event.title}
              </h2>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p>{formatDateRange(event.startsAt, event.endsAt)}</p>
                {event.location && <p>{event.location}</p>}
              </div>
            </div>
          )}

          {/* Order Items - Only show for pending/expired orders */}
          {!isPaid && (
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
          )}

          {/* Order Summary - Only show for pending/expired orders */}
          {!isPaid && (
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
                {order.paymentFeeBuyerInclVat &&
                  Number(order.paymentFeeBuyerInclVat) > 0 && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        Betaalkosten
                        <span
                          className="inline-block w-4 h-4 rounded-full border border-gray-400 text-xs leading-none flex items-center justify-center cursor-help"
                          title="Deze kosten dekken de betalingsverwerking. De daadwerkelijke kosten kunnen per betaalmethode afwijken."
                        >
                          ?
                        </span>
                      </span>
                      <span>
                        {formatPrice(Number(order.paymentFeeBuyerInclVat))}
                      </span>
                    </div>
                  )}
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
                  <PaymentButton
                    orderId={order.id}
                    totalAmount={order.totalAmount}
                  />
                </div>
              )}

              {/* Retry/Cancel Buttons (for failed orders) */}
              {isFailed && (
                <div className="mt-6 space-y-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Probeer het opnieuw of annuleer de bestelling.
                  </p>
                  <PaymentButton
                    orderId={order.id}
                    totalAmount={order.totalAmount}
                  />
                  <form action={`/api/orders/${order.id}/cancel`} method="POST">
                    <Button type="submit" variant="outline" className="w-full">
                      Bestelling annuleren
                    </Button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Back to Event Link */}
          {(isPaid || isExpired || isCancelled) && (
            <div className="p-6 text-center">
              <Link
                href={`/e/${event.slug}`}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
              >
                ← Terug naar evenement
              </Link>
            </div>
          )}
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
            © {new Date().getFullYear()} Entro (getentro.app). Alle rechten
            voorbehouden.
          </p>
        </div>
      </footer>
    </div>
  );
}
