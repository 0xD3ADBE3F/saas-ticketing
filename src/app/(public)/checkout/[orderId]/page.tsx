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
import {
  PublicProgressSteps,
  PublicFeatureBadge,
  PublicCheckoutSummary,
} from "@/components/public";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  Shield,
  Lock,
} from "lucide-react";

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
    <div className="public-pages">
      {/* Payment Status Poller - polls for updates after payment redirect */}
      <PaymentStatusPoller orderId={order.id} orderStatus={order.status} />

      {/* Header */}
      <header className="public-header sticky top-0 z-50">
        <div className="public-container flex justify-between items-center py-4">
          <Link
            href="/"
            className="text-xl font-bold text-gray-900 dark:text-white"
          >
            Entro
          </Link>
          {!isPaid && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Bestelling #{order.orderNumber}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="public-container py-8 md:py-12">
        {/* Progress Steps */}
        {!isExpired && !isCancelled && (
          <div className="max-w-3xl mx-auto mb-8 md:mb-12 animate-fade-in-up">
            <PublicProgressSteps
              steps={[
                {
                  label: "Tickets kiezen",
                  status: "completed",
                },
                {
                  label: "Betalen",
                  status: isPaid
                    ? "completed"
                    : isPending || isFailed
                      ? "current"
                      : "upcoming",
                },
                {
                  label: "Voltooien",
                  status: isPaid ? "current" : "upcoming",
                },
              ]}
            />
          </div>
        )}

        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Left Column - Order Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Status Banner */}
              {isExpired && (
                <Alert variant="destructive" className="animate-fade-in-up">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription>
                    <span className="font-semibold block mb-2">
                      Deze bestelling is verlopen
                    </span>
                    <p className="mb-4 text-sm">
                      De reservering is niet op tijd betaald. Je kunt een nieuwe
                      bestelling plaatsen.
                    </p>
                    <Button asChild variant="destructive" size="sm">
                      <Link href={`/e/${event.slug}`}>
                        Terug naar evenement
                      </Link>
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {isPaid && (
                <Alert variant="success" className="animate-fade-in-up">
                  <CheckCircle className="h-5 w-5" />
                  <AlertDescription>
                    <span className="font-semibold block mb-2">
                      Betaling ontvangen!
                    </span>
                    <p className="text-sm">
                      Je tickets zijn verstuurd naar{" "}
                      <strong>{order.buyerEmail}</strong>
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {isFailed && (
                <Alert variant="destructive" className="animate-fade-in-up">
                  <XCircle className="h-5 w-5" />
                  <AlertDescription>
                    <span className="font-semibold block mb-2">
                      Betaling mislukt
                    </span>
                    <p className="text-sm">
                      De betaling is niet geslaagd. Je kunt het opnieuw
                      proberen.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {isCancelled && (
                <Alert variant="default" className="animate-fade-in-up">
                  <Ban className="h-5 w-5" />
                  <AlertDescription>
                    <span className="font-semibold block mb-2">
                      Bestelling geannuleerd
                    </span>
                    <p className="text-sm">Deze bestelling is geannuleerd.</p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Show tickets for paid orders */}
              {isPaid && ticketsResult?.success && (
                <div
                  className="public-card animate-fade-in-up"
                  style={{ animationDelay: "0.1s" }}
                >
                  <div className="p-6 md:p-8">
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
                </div>
              )}

              {/* Event Info Card - for pending/failed/expired orders */}
              {!isPaid && !isCancelled && (
                <div
                  className="public-card animate-fade-in-up"
                  style={{ animationDelay: "0.1s" }}
                >
                  <div className="p-6 md:p-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      {event.title}
                    </h2>
                    <div className="space-y-2 text-gray-600 dark:text-gray-400">
                      <p className="font-medium">
                        {formatDateRange(event.startsAt, event.endsAt)}
                      </p>
                      {event.location && <p>{event.location}</p>}
                      {event.organization.websiteUrl && (
                        <p>
                          <a
                            href={event.organization.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            🌐{" "}
                            {event.organization.websiteUrl.replace(
                              /^https?:\/\//,
                              ""
                            )}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Trust signals for pending payments */}
              {isPending && (
                <div
                  className="flex flex-wrap gap-3 justify-center lg:justify-start animate-fade-in-up"
                  style={{ animationDelay: "0.2s" }}
                >
                  <PublicFeatureBadge icon="shield" variant="success">
                    SSL beveiligde verbinding
                  </PublicFeatureBadge>
                  <PublicFeatureBadge icon="lock" variant="primary">
                    iDEAL veilig betalen
                  </PublicFeatureBadge>
                </div>
              )}
            </div>

            {/* Right Column - Order Summary */}
            {!isPaid && !isCancelled && (
              <div className="lg:col-span-1">
                <div className="lg:sticky lg:top-24">
                  <div
                    className="animate-fade-in-up"
                    style={{ animationDelay: "0.3s" }}
                  >
                    <PublicCheckoutSummary
                      items={items.map((item) => ({
                        name: item.ticketTypeName,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        subtotal: item.totalPrice,
                      }))}
                      subtotal={order.ticketTotal}
                      serviceFee={
                        order.serviceFee +
                        (order.paymentFeeBuyerInclVat
                          ? Number(order.paymentFeeBuyerInclVat)
                          : 0)
                      }
                      total={order.totalAmount}
                      isSticky={true}
                    />

                    {/* Payment/Action Buttons */}
                    {isPending && (
                      <div className="mt-6 space-y-4">
                        <PaymentButton
                          orderId={order.id}
                          totalAmount={order.totalAmount}
                        />
                        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                          Je wordt doorgestuurd naar iDEAL om veilig te betalen
                        </p>
                      </div>
                    )}

                    {isFailed && (
                      <div className="mt-6 space-y-3">
                        <PaymentButton
                          orderId={order.id}
                          totalAmount={order.totalAmount}
                        />
                        <form
                          action={`/api/orders/${order.id}/cancel`}
                          method="POST"
                        >
                          <Button
                            type="submit"
                            variant="outline"
                            className="w-full"
                          >
                            Bestelling annuleren
                          </Button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Back to Event Link */}
          {(isPaid || isExpired || isCancelled) && (
            <div className="mt-8 text-center">
              <Link
                href={`/e/${event.slug}`}
                className="public-btn public-btn-outline"
              >
                ← Terug naar evenement
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-12 md:mt-20 bg-gray-50 dark:bg-gray-900/50">
        <div className="public-container py-8 md:py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                © {new Date().getFullYear()} Entro. Alle rechten voorbehouden.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm">
              <Link
                href="/algemene-voorwaarden"
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Algemene voorwaarden
              </Link>
              <Link
                href="/privacy"
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
