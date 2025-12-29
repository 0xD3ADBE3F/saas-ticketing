import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicEvent } from "@/server/services/eventService";
import { formatDateTime, formatDateRange, isPast } from "@/lib/date";
import { EventTickets } from "@/components/checkout";

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            Ticketplatform
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Event Header */}
          <div className="p-6 sm:p-8 border-b border-gray-200 dark:border-gray-800">
            {isEventPast && (
              <div className="mb-4 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm rounded-full inline-block">
                Dit evenement is afgelopen
              </div>
            )}

            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {event.title}
            </h1>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 text-gray-600 dark:text-gray-400">
              {/* Date */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
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
                    <svg
                      className="w-5 h-5 text-blue-600 dark:text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
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
            © {new Date().getFullYear()} Ticketplatform. Alle rechten
            voorbehouden.
          </p>
        </div>
      </footer>
    </div>
  );
}
