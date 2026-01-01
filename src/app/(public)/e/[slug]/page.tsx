import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicEvent } from "@/server/services/eventService";
import { formatDateTime, formatDateRange, isPast } from "@/lib/date";
import { EventTickets } from "@/components/checkout";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin } from "lucide-react";

interface PublicEventPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PublicEventPageProps) {
  const { slug } = await params;
  const event = await getPublicEvent(slug);

  if (!event) {
    return {
      title: "Evenement niet gevonden",
    };
  }

  return {
    title: event.title,
    description: event.description || `Koop tickets voor ${event.title}`,
    openGraph: {
      title: event.title,
      description: event.description || `Koop tickets voor ${event.title}`,
      type: "website",
    },
  };
}

export default async function PublicEventPage({
  params,
}: PublicEventPageProps) {
  const { slug } = await params;
  const event = await getPublicEvent(slug);

  if (!event) {
    notFound();
  }

  const isEventPast = isPast(event.endsAt);
  const isSameDay =
    event.startsAt.toDateString() === event.endsAt.toDateString();

  // Apply theme from organization settings
  const themeClass = event.organization.portalTheme === 'DARK' ? 'dark' : '';

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-950 ${themeClass}`}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          {event.organization.logoUrl ? (
            <img
              src={event.organization.logoUrl}
              alt={event.organization.name}
              className="h-10 w-auto object-contain"
            />
          ) : (
            <Link
              href="/"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              {event.organization.name}
            </Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Event Header */}
          <div className="p-6 sm:p-8 border-b border-gray-200 dark:border-gray-800">
            {isEventPast && (
              <Badge variant="neutral" className="mb-4">
                Dit evenement is afgelopen
              </Badge>
            )}

            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {event.title}
            </h1>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 text-gray-600 dark:text-gray-400">
              {/* Date */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDateRange(event.startsAt, event.endsAt)}
                  </p>
                  {!isSameDay && (
                    <p className="text-sm">
                      {formatDateTime(event.startsAt)} -{" "}
                      {formatDateTime(event.endsAt)}
                    </p>
                  )}
                </div>
              </div>

              {/* Location */}
              {event.location && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {event.location}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="p-6 sm:p-8 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Over dit evenement
              </h2>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            </div>
          )}

          {/* Tickets Section */}
          <div className="p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Tickets
            </h2>

            {isEventPast ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>Ticketverkoop voor dit evenement is gesloten.</p>
              </div>
            ) : (
              <EventTickets
                eventSlug={event.slug}
                eventTitle={event.title}
                ticketTypes={event.ticketTypes}
              />
            )}
          </div>
        </div>

        {/* Organization Info */}
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Georganiseerd door{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {event.organization.name}
            </span>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            © {new Date().getFullYear()} Entro (getentro.app). Alle rechten
            voorbehouden.
          </p>
        </div>
      </footer>
    </div>
  );
}
