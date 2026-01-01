import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getOrderForCheckout } from "@/server/services/orderService";
import { getTicketsWithQR } from "@/server/services/ticketService";
import { formatPrice } from "@/lib/currency";
import { formatDateRange } from "@/lib/date";
import { TicketDisplay } from "@/components/checkout/TicketDisplay";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle, CheckCircle, ArrowLeft, MapPin } from "lucide-react";

interface CompletePageProps {
  params: Promise<{ orderId: string }>;
}

export async function generateMetadata({ params }: CompletePageProps) {
  const { orderId } = await params;
  const result = await getOrderForCheckout(orderId);

  if (!result.success) {
    return {
      title: "Bestelling niet gevonden",
    };
  }

  const isFree = result.data.order.totalAmount === 0;

  return {
    title: isFree
      ? `Bestelling voltooid - ${result.data.order.orderNumber}`
      : `Betaling voltooid - ${result.data.order.orderNumber}`,
    description: `Je tickets voor ${result.data.event.title}`,
  };
}

export default async function CompletePage({ params }: CompletePageProps) {
  const { orderId } = await params;
  const result = await getOrderForCheckout(orderId);

  if (!result.success) {
    notFound();
  }

  const { order, event, items } = result.data;

  // If order is still pending, redirect back to checkout
  if (order.status === "PENDING") {
    redirect(`/checkout/${orderId}`);
  }

  // If order failed or cancelled, show appropriate message
  if (order.status === "CANCELLED" || order.status === "FAILED") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
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

        <main className="max-w-2xl mx-auto px-4 py-8">
          <Card>
            <Alert
              variant="destructive"
              className="rounded-none border-x-0 border-t-0"
            >
              <XCircle className="h-6 w-6" />
              <AlertDescription>
                <h1 className="text-xl font-semibold mb-1">
                  Betaling{" "}
                  {order.status === "CANCELLED" ? "geannuleerd" : "mislukt"}
                </h1>
                <p>
                  {order.status === "CANCELLED"
                    ? "Je hebt de betaling geannuleerd."
                    : "Er is iets misgegaan met de betaling."}
                </p>
              </AlertDescription>
            </Alert>

            <CardContent className="p-6">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Je kunt het opnieuw proberen door een nieuwe bestelling te
                plaatsen.
              </p>
              <Button asChild>
                <Link href={`/e/${event.slug}`}>
                  <ArrowLeft className="w-4 h-4" />
                  Terug naar evenement
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Order is paid - show success and tickets
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const ticketsResult = await getTicketsWithQR(orderId, baseUrl);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
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
          {/* Success Banner */}
          <div className="p-6 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-green-700 dark:text-green-400">
                  {order.totalAmount === 0
                    ? "Bestelling geslaagd!"
                    : "Betaling geslaagd!"}
                </h1>
                <p className="text-green-600 dark:text-green-400">
                  Je tickets zijn bevestigd en verzonden naar {order.buyerEmail}
                </p>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {event.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {formatDateRange(event.startsAt, event.endsAt)}
                </p>
                {event.location && (
                  <p className="text-gray-500 dark:text-gray-500 text-sm flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {event.location}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Bestelnummer
                </p>
                <p className="font-mono text-sm text-gray-900 dark:text-white">
                  {order.orderNumber}
                </p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Bestelde tickets
            </h3>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-900 dark:text-white">
                    {item.quantity}× {item.ticketTypeName}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {formatPrice(item.totalPrice)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-500">
                <span>Servicekosten</span>
                <span>{formatPrice(order.serviceFee)}</span>
              </div>
              {order.paymentFeeBuyerInclVat &&
                Number(order.paymentFeeBuyerInclVat) > 0 && (
                  <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-500">
                    <span>Betaalkosten</span>
                    <span>
                      {formatPrice(Number(order.paymentFeeBuyerInclVat))}
                    </span>
                  </div>
                )}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center font-medium">
                <span className="text-gray-900 dark:text-white">Totaal</span>
                <span className="text-gray-900 dark:text-white">
                  {formatPrice(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Tickets */}
          {ticketsResult?.success && ticketsResult.data.tickets.length > 0 && (
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
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
                💡 Bewaar deze pagina of check je e-mail voor de tickets. Toon
                de QR-code bij de ingang.
              </p>
            </div>
          )}

          {/* Back Link */}
          <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800">
            <Link
              href={`/e/${event.slug}`}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              ← Terug naar evenement
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
