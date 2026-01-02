import { notFound } from "next/navigation";
import Image from "next/image";
import { getPublicEventByBothSlugs } from "@/server/services/eventService";
import { formatDateTime, formatDateRange, isPast } from "@/lib/date";
import { EventTickets } from "@/components/checkout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, MapPin, Clock, Users, AlertCircle } from "lucide-react";
import { PublicHero } from "@/components/public";

interface PublicEventPageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
  searchParams: Promise<{ error?: string }>;
}

export async function generateMetadata({ params }: PublicEventPageProps) {
  const { orgSlug, eventSlug } = await params;
  const event = await getPublicEventByBothSlugs(orgSlug, eventSlug);

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
  searchParams,
}: PublicEventPageProps) {
  const { orgSlug, eventSlug } = await params;
  const { error } = await searchParams;
  const event = await getPublicEventByBothSlugs(orgSlug, eventSlug);

  if (!event) {
    notFound();
  }

  const isEventPast = isPast(event.endsAt);

  // Calculate total tickets sold
  const totalTicketsSold = event.ticketTypes.reduce(
    (sum, tt) => sum + tt.soldCount,
    0
  );
  const totalCapacity = event.ticketTypes.reduce(
    (sum, tt) => sum + (tt.capacity || 0),
    0
  );

  return (
    <div className="public-pages">
      {/* Hero Section */}
      <PublicHero
        title={event.title}
        subtitle={event.description || undefined}
        size="large"
        gradient="default"
      >
        {/* Event Meta Info */}
        <div className="flex flex-wrap gap-3 text-white/90">
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

          {totalCapacity > 0 &&
            !isEventPast &&
            event.organization.showTicketAvailability && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                <Users className="w-5 h-5" />
                <span className="font-medium">
                  {totalCapacity - totalTicketsSold} tickets beschikbaar
                </span>
              </div>
            )}
        </div>
      </PublicHero>

      {/* Hero Image */}
      {event.heroImageUrl && (
        <div className="public-container -mt-8 mb-8">
          <div className="relative w-full h-64 md:h-96 rounded-xl overflow-hidden border-4 border-white dark:border-gray-900 shadow-2xl animate-fade-in-up">
            <Image
              src={event.heroImageUrl}
              alt={event.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="public-container py-8 md:py-12">
        {/* Show error banner if payment expired */}
        {error === "payment-expired" && (
          <Alert variant="destructive" className="mb-6 animate-fade-in-up">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription>
              <span className="font-semibold block mb-1">
                Reservering verlopen
              </span>
              <p className="text-sm">
                Je betaalvenster is verlopen en de tickets zijn weer
                vrijgegeven. Je kunt opnieuw tickets bestellen.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {isEventPast && (
          <div className="mb-8 p-6 bg-gray-100 dark:bg-gray-800 rounded-xl text-center animate-fade-in-up">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              Dit evenement is afgelopen
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Ticketverkoop is gesloten
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Event Details */}
          <div className="lg:col-span-2 space-y-6 lg:space-y-8">
            {/* Organizer Badge */}
            {event.organization.logoUrl && (
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

            {/* Event Details Card */}
            <section
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
                        {event.locationDescription && (
                          <p className="text-gray-900 dark:text-white font-semibold mb-1">
                            {event.locationDescription}
                          </p>
                        )}
                        <p className="text-gray-700 dark:text-gray-300 font-medium break-words">
                          {event.location}
                        </p>
                        {event.latitude &&
                          event.longitude &&
                          process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                            <div className="mt-4 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                              <iframe
                                width="100%"
                                height="250"
                                style={{ border: 0 }}
                                loading="lazy"
                                src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${event.latitude},${event.longitude}&zoom=14`}
                                allowFullScreen
                              />
                            </div>
                          )}
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
                      <div className="flex items-center gap-3">
                        <p className="text-gray-700 dark:text-gray-300 font-medium truncate">
                          {event.organization.name}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column - Tickets */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <section
                className="public-card animate-fade-in-up"
                style={{ animationDelay: "0.2s" }}
              >
                <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                    Tickets
                  </h2>
                </div>

                <div className="p-4 md:p-6">
                  {isEventPast ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium">
                        Ticketverkoop is gesloten
                      </p>
                    </div>
                  ) : (
                    <EventTickets
                      eventSlug={event.slug}
                      eventTitle={event.title}
                      ticketTypes={event.ticketTypes}
                      isPaid={event.isPaid}
                      showTicketAvailability={
                        event.organization.showTicketAvailability
                      }
                    />
                  )}
                </div>
              </section>
            </div>
          </div>
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
