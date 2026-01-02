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
  PublicFeatureBadge,
  PublicCheckoutSummary,
  PublicHero,
} from "@/components/public";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  Shield,
  Lock,
  Calendar,
  MapPin,
  Users,
  Mail,
} from "lucide-react";
import { ConfettiAnimation } from "@/components/checkout/ConfettiAnimation";

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

  // Check if order is free (no payment required)
  const isFreeOrder = order.totalAmount === 0;

  // Check if order is still pending and not expired
  const isExpired =
    order.status === "PENDING" &&
    order.expiresAt &&
    new Date(order.expiresAt) < new Date();
  const isPending = order.status === "PENDING" && !isExpired && !isFreeOrder;
  const isPaid =
    order.status === "PAID" || (isFreeOrder && order.status === "PENDING");
  const isFailed = order.status === "FAILED";
  const isCancelled = order.status === "CANCELLED";

  // Fetch tickets if order is paid or free
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const ticketsResult = isPaid
    ? await getTicketsWithQR(orderId, baseUrl)
    : null;

  return (
    <div className="public-pages">
      {/* Payment Status Poller - polls for updates after payment redirect */}
      <PaymentStatusPoller orderId={order.id} orderStatus={order.status} />

      {/* Confetti for paid orders */}
      {isPaid && <ConfettiAnimation />}

      {/* Hero Section - Success State */}
      {isPaid ? (
        <PublicHero
          title={
            isFreeOrder ? "Bestelling voltooid! 🎉" : "Betaling geslaagd! 🎉"
          }
          subtitle={`Je tickets voor ${event.title} zijn gereserveerd`}
          size="large"
          gradient="success"
        >
          <div className="flex flex-wrap gap-3 justify-center text-white/90">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
              <Mail className="w-5 h-5" />
              <span className="font-medium">
                Verzonden naar {order.buyerEmail}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">
                Bestelling #{order.orderNumber}
              </span>
            </div>
          </div>
        </PublicHero>
      ) : (
        <PublicHero
          title={
            isExpired
              ? "Bestelling verlopen"
              : isCancelled
                ? "Bestelling geannuleerd"
                : isFailed
                  ? "Betaling mislukt"
                  : `Bestelling #${order.orderNumber}`
          }
          subtitle={event.title}
          size="default"
          gradient="default"
        >
          <div className="flex flex-wrap gap-3 justify-center text-white/90">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">
                {formatDateRange(event.startsAt, event.endsAt)}
              </span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                <MapPin className="w-5 h-5" />
                <span className="font-medium">{event.location}</span>
              </div>
            )}
          </div>
        </PublicHero>
      )}

      {/* Main Content */}
      <main className="public-container py-8 md:py-12">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Left Column - Order Details */}
            <div className="lg:col-span-2 space-y-6 lg:space-y-8">
              {/* Status Banner - Only for non-paid states */}
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

              {/* Organizer Badge - for paid orders */}
              {isPaid && event.organization.logoUrl && (
                <section
                  className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6 shadow-sm animate-fade-in-up"
                  style={{ animationDelay: "0.05s" }}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                      <img
                        src={event.organization.logoUrl}
                        alt={event.organization.name}
                        className="h-12 w-auto max-w-[120px] object-contain"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mb-1">
                        Georganiseerd door
                      </p>
                      <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {event.organization.name}
                      </p>
                      {event.organization.websiteUrl && (
                        <a
                          href={event.organization.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
                        >
                          Bezoek website →
                        </a>
                      )}
                    </div>
                  </div>
                </section>
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
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-6">
                      Evenement Details
                    </h2>

                    <div className="space-y-6">
                      {/* Date & Time */}
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            Datum & Tijd
                          </h3>
                          <p className="text-gray-700 dark:text-gray-300 font-medium">
                            {formatDateRange(event.startsAt, event.endsAt)}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {formatDateTime(event.startsAt)} -{" "}
                            {formatDateTime(event.endsAt)}
                          </p>
                        </div>
                      </div>

                      {/* Location */}
                      {event.location && (
                        <div className="flex gap-4">
                          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                              Locatie
                            </h3>
                            <p className="text-gray-700 dark:text-gray-300 font-medium break-words">
                              {event.location}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Organizer */}
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            Organisator
                          </h3>
                          <p className="text-gray-700 dark:text-gray-300 font-medium truncate">
                            {event.organization.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Event Details Card - for paid orders */}
              {isPaid && (
                <section
                  className="public-card animate-fade-in-up"
                  style={{ animationDelay: "0.15s" }}
                >
                  <div className="p-6 md:p-8">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-6">
                      Evenement Details
                    </h2>

                    <div className="space-y-6">
                      {/* Date & Time */}
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            Datum & Tijd
                          </h3>
                          <p className="text-gray-700 dark:text-gray-300 font-medium">
                            {formatDateRange(event.startsAt, event.endsAt)}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {formatDateTime(event.startsAt)} -{" "}
                            {formatDateTime(event.endsAt)}
                          </p>
                        </div>
                      </div>

                      {/* Location */}
                      {event.location && (
                        <div className="flex gap-4">
                          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                              Locatie
                            </h3>
                            <p className="text-gray-700 dark:text-gray-300 font-medium break-words">
                              {event.location}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Organizer */}
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            Organisator
                          </h3>
                          <p className="text-gray-700 dark:text-gray-300 font-medium truncate">
                            {event.organization.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
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
            {!isCancelled && (
              <div className="lg:col-span-1">
                <div className="lg:sticky lg:top-24">
                  {/* Order Summary - show for all states */}
                  {!isPaid && (
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
                            Je wordt doorgestuurd naar iDEAL om veilig te
                            betalen
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
                  )}

                  {/* Order Summary for Paid Orders */}
                  {isPaid && (
                    <div
                      className="public-card animate-fade-in-up"
                      style={{ animationDelay: "0.2s" }}
                    >
                      <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                          Bestelling
                        </h2>
                      </div>
                      <div className="p-4 md:p-6 space-y-4">
                        <div className="space-y-3">
                          {items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-start"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {item.ticketTypeName}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {item.quantity}x {formatPrice(item.unitPrice)}
                                </p>
                              </div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {formatPrice(item.totalPrice)}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                              Subtotaal
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {formatPrice(order.ticketTotal)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                              Servicekosten
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {formatPrice(
                                order.serviceFee +
                                  (order.paymentFeeBuyerInclVat
                                    ? Number(order.paymentFeeBuyerInclVat)
                                    : 0)
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between text-base font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
                            <span className="text-gray-900 dark:text-white">
                              Totaal
                            </span>
                            <span className="text-gray-900 dark:text-white">
                              {formatPrice(order.totalAmount)}
                            </span>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span>
                              {isFreeOrder
                                ? "Gratis bestelling"
                                : "Betaald met iDEAL"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
              {/* Organizer badge with card encapsulation */}
              {event.organization.logoUrl && (
                <div className="inline-flex items-center gap-3 mb-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2.5 shadow-sm">
                  <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-900 rounded p-1.5 border border-gray-200 dark:border-gray-700">
                    <img
                      src={event.organization.logoUrl}
                      alt={event.organization.name}
                      className="h-6 w-auto max-w-[80px] object-contain"
                    />
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
                      Georganiseerd door
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {event.organization.name}
                    </span>
                    {event.organization.websiteUrl && (
                      <a
                        href={event.organization.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline block mt-0.5"
                      >
                        Bezoek website →
                      </a>
                    )}
                  </div>
                </div>
              )}
              {!event.organization.logoUrl && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Georganiseerd door {event.organization.name}
                </p>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
