import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/server/lib/supabase";
import { getEvent } from "@/server/services/eventService";
import {
  getEventTicketTypes,
  getEventTicketStats,
} from "@/server/services/ticketTypeService";
import { formatPrice } from "@/lib/currency";
import { formatDateTime, formatRelativeTime, isPast } from "@/lib/date";
import { EventStatusActions } from "@/components/events/EventStatusActions";
import { TicketTypeList } from "@/components/ticket-types/TicketTypeList";
import { prisma } from "@/server/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getEventStatusVariant } from "@/lib/status-variants";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}

const statusLabels = {
  DRAFT: "Concept",
  LIVE: "Live",
  ENDED: "Afgelopen",
  CANCELLED: "Geannuleerd",
};

const statusColors = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  LIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  ENDED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default async function EventDetailPage({
  params,
  searchParams,
}: EventDetailPageProps) {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const { payment } = await searchParams;
  const paymentSuccess = payment === "success";

  const result = await getEvent(id, user.id);

  if (!result.success || !result.data) {
    notFound();
  }

  const event = result.data;
  const isEventPast = isPast(event.endsAt);

  // Fetch ticket types and stats
  const [ticketTypes, stats] = await Promise.all([
    getEventTicketTypes(id, user.id),
    getEventTicketStats(id, user.id),
  ]);

  return (
    <div>
      {/* Payment Success Message */}
      {paymentSuccess && (
        <Alert variant="success" className="mb-6">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="font-medium">
            Betaling geslaagd! Je evenement is nu live.
          </AlertDescription>
        </Alert>
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link
          href="/dashboard/events"
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          Evenementen
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white">{event.title}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <Badge variant={getEventStatusVariant(event.status)}>
              {statusLabels[event.status]}
            </Badge>
          </div>
          {event.location && (
            <p className="text-gray-600 dark:text-gray-400">{event.location}</p>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/events/${event.id}/edit`}>Bewerken</Link>
          </Button>
          {event.status === "LIVE" && (
            <Button asChild>
              <Link href={`/e/${event.slug}`} target="_blank">
                Bekijk publieke pagina
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Datum & tijd
                  </dt>
                  <dd className="mt-1 text-gray-900 dark:text-white">
                    <p>{formatDateTime(event.startsAt)}</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      tot {formatDateTime(event.endsAt)}
                    </p>
                    {!isEventPast && (
                      <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                        {formatRelativeTime(event.startsAt)}
                      </p>
                    )}
                  </dd>
                </div>

                {event.description && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Beschrijving
                    </dt>
                    <dd className="mt-1 text-gray-900 dark:text-white whitespace-pre-wrap">
                      {event.description}
                    </dd>
                  </div>
                )}

                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Publieke link
                  </dt>
                  <dd className="mt-1">
                    {event.status === "LIVE" ? (
                      <a
                        href={`/e/${event.slug}`}
                        target="_blank"
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/e/${event.slug}`
                          : `/e/${event.slug}`}
                      </a>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">
                        Beschikbaar wanneer evenement live is
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Ticket Types */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Tickettypes</CardTitle>
                <Button size="sm" asChild>
                  <Link href={`/dashboard/events/${event.id}/ticket-types/new`}>
                    + Tickettype
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <TicketTypeList ticketTypes={ticketTypes} eventId={event.id} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <EventStatusActions event={event} />
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Statistieken</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Tickets verkocht
                  </span>
                  <span className="font-medium">
                    {stats.totalSold} / {stats.totalCapacity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Tickets gescand
                  </span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Omzet
                  </span>
                  <span className="font-medium">
                    {formatPrice(stats.totalRevenue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Tickettypes
                  </span>
                  <span className="font-medium">{stats.ticketTypes}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
