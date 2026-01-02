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
import {
  CheckCircle,
  ChevronLeft,
  Edit,
  ExternalLink,
  Calendar,
  MapPin,
  Link as LinkIcon,
  BarChart3,
  Ticket,
} from "lucide-react";
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
        <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 backdrop-blur-xl border-2 border-green-200/50 dark:border-green-800/50 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="font-semibold text-green-900 dark:text-green-100">
              Betaling geslaagd! Je evenement is nu live.
            </p>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-6">
        <Link
          href="/dashboard/events"
          className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Evenementen
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 dark:text-white font-semibold">
          {event.title}
        </span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-gray-100 dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">
              {event.title}
            </h1>
            <Badge
              variant={getEventStatusVariant(event.status)}
              className="font-semibold"
            >
              {statusLabels[event.status]}
            </Badge>
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4" />
              <p>{event.location}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <Button variant="outline" asChild className="font-semibold">
            <Link
              href={`/dashboard/events/${event.id}/edit`}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Bewerken
            </Link>
          </Button>
          {event.status === "LIVE" && (
            <Button asChild className="font-semibold shadow-lg">
              <Link
                href={`/e/${event.organization.slug}/${event.slug}`}
                target="_blank"
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
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
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Details
                </h2>
              </div>
            </div>
            <div className="p-6">
              <dl className="space-y-5">
                <div>
                  <dt className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Datum & tijd
                  </dt>
                  <dd className="text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <p className="font-medium">
                        {formatDateTime(event.startsAt)}
                      </p>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 ml-6">
                      tot {formatDateTime(event.endsAt)}
                    </p>
                    {!isEventPast && (
                      <p className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium ml-6">
                        {formatRelativeTime(event.startsAt)}
                      </p>
                    )}
                  </dd>
                </div>

                {event.description && (
                  <div>
                    <dt className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Beschrijving
                    </dt>
                    <dd className="text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                      {event.description}
                    </dd>
                  </div>
                )}

                <div>
                  <dt className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Publieke link
                  </dt>
                  <dd>
                    {event.status === "LIVE" ? (
                      <a
                        href={`/e/${event.organization.slug}/${event.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      >
                        <LinkIcon className="w-4 h-4" />
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/e/${event.organization.slug}/${event.slug}`
                          : `/e/${event.organization.slug}/${event.slug}`}
                      </a>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400 italic">
                        Beschikbaar wanneer evenement live is
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Ticket Types */}
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                    <Ticket className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Tickettypes
                  </h2>
                </div>
                <Button size="sm" asChild className="font-semibold shadow-lg">
                  <Link href={`/dashboard/events/${event.id}/ticket-types/new`}>
                    + Tickettype
                  </Link>
                </Button>
              </div>
            </div>
            <div className="p-6">
              <TicketTypeList ticketTypes={ticketTypes} eventId={event.id} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Actions */}
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Status
              </h2>
            </div>
            <div className="p-6">
              <EventStatusActions event={event} />
            </div>
          </div>

          {/* Stats */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 backdrop-blur-xl border-2 border-blue-200/50 dark:border-blue-800/50 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-5 border-b border-blue-200/50 dark:border-blue-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
                  <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Statistieken
                </h2>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tickets verkocht
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {stats.totalSold} / {stats.totalCapacity}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tickets gescand
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    0
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Omzet
                  </span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatPrice(stats.totalRevenue)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tickettypes
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {stats.ticketTypes}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
