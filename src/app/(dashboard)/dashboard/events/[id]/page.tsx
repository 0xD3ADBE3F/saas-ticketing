import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/server/lib/supabase";
import { getEvent } from "@/server/services/eventService";
import { formatDateTime, formatRelativeTime, isPast } from "@/lib/date";
import { EventStatusActions } from "@/components/events/EventStatusActions";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
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
}: EventDetailPageProps) {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const result = await getEvent(id, user.id);

  if (!result.success || !result.data) {
    notFound();
  }

  const event = result.data;
  const isEventPast = isPast(event.endsAt);

  return (
    <div>
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
            <span
              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[event.status]}`}
            >
              {statusLabels[event.status]}
            </span>
          </div>
          {event.location && (
            <p className="text-gray-600 dark:text-gray-400">{event.location}</p>
          )}
        </div>

        <div className="flex gap-2">
          <Link
            href={`/dashboard/events/${event.id}/edit`}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Bewerken
          </Link>
          {event.status === "LIVE" && (
            <Link
              href={`/e/${event.slug}`}
              target="_blank"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Bekijk publieke pagina
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Details */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Details</h2>

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
          </div>

          {/* Ticket Types Placeholder */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Tickettypes</h2>
              <button
                disabled
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg opacity-50 cursor-not-allowed"
              >
                + Tickettype
              </button>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              Tickettypes worden toegevoegd in een volgende fase.
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Actions */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Status</h2>
            <EventStatusActions event={event} />
          </div>

          {/* Stats Placeholder */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Statistieken</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Tickets verkocht
                </span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Tickets gescand
                </span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Omzet</span>
                <span className="font-medium">€0,00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
