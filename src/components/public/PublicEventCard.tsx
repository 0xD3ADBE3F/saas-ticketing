"use client";

import Link from "next/link";
import Image from "next/image";
import { Calendar, MapPin, Building2, ExternalLink } from "lucide-react";
import type { PublicEvent } from "@/server/repos/eventRepo";
import {
  PublicCard,
  PublicCardHeader,
  PublicCardTitle,
  PublicCardContent,
  PublicCardFooter,
} from "./PublicCard";
import { PublicButton } from "./PublicButton";

interface PublicEventCardProps {
  event: PublicEvent;
}

/**
 * PublicEventCard - Display event info on public events listing
 *
 * Shows event details, organizer info, and availability status
 */
export function PublicEventCard({ event }: PublicEventCardProps) {
  const totalCapacity = event.ticketTypes.reduce(
    (sum, tt) => sum + tt.capacity,
    0
  );
  const totalSold = event.ticketTypes.reduce(
    (sum, tt) => sum + tt.soldCount,
    0
  );
  const ticketsLeft = totalCapacity - totalSold;
  const isSoldOut = ticketsLeft <= 0;
  const almostSoldOut = !isSoldOut && ticketsLeft <= totalCapacity * 0.1;

  // Get lowest ticket price
  const lowestPrice = event.ticketTypes.reduce(
    (min, tt) => (tt.price < min ? tt.price : min),
    Infinity
  );

  // Format date and time
  const eventDate = new Date(event.startsAt);
  const dateStr = eventDate.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = eventDate.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <PublicCard className="overflow-hidden">
      <Link href={`/e/${event.slug}`} className="block group">
        <div className="flex flex-col lg:flex-row gap-0">
          {/* Event Image or Placeholder */}
          <div className="lg:w-80 flex-shrink-0 relative overflow-hidden">
            <div className="aspect-[16/10] lg:aspect-[4/5] bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-50 dark:from-blue-900/40 dark:via-blue-900/30 dark:to-indigo-900/20 flex items-center justify-center relative group-hover:scale-105 transition-transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
              <Calendar className="w-16 h-16 text-blue-400/40 dark:text-blue-400/30" />

              {/* Status Badge Overlay */}
              {event.organization.showTicketAvailability && (
                <div className="absolute top-4 right-4">
                  {isSoldOut ? (
                    <span className="public-badge public-badge-error shadow-lg">
                      Uitverkocht
                    </span>
                  ) : almostSoldOut ? (
                    <span className="public-badge public-badge-warning shadow-lg">
                      Bijna vol
                    </span>
                  ) : (
                    <span className="public-badge public-badge-success shadow-lg">
                      Beschikbaar
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Event Details */}
          <div className="flex-1 flex flex-col p-6 lg:p-8">
            <PublicCardHeader className="mb-4">
              <PublicCardTitle className="text-2xl group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">
                {event.title}
              </PublicCardTitle>

              {/* Date & Time - Prominent */}
              <div className="flex items-center gap-2 text-base text-public-foreground font-medium mb-3">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span>
                  {dateStr} om {timeStr}
                </span>
              </div>

              {/* Location */}
              {event.location && (
                <div className="flex items-center gap-2 text-sm text-public-muted-foreground">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
            </PublicCardHeader>

            <PublicCardContent className="flex-1">
              {/* Description */}
              {event.description && (
                <p className="text-sm text-public-muted-foreground line-clamp-3 leading-relaxed">
                  {event.description}
                </p>
              )}
            </PublicCardContent>

            {/* Footer with Organizer & CTA */}
            <PublicCardFooter className="mt-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                {/* Organizer Card */}
                <div className="flex items-center gap-3 min-w-0">
                  {event.organization.logoUrl ? (
                    <div className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <Image
                        src={event.organization.logoUrl}
                        alt={event.organization.name}
                        width={40}
                        height={40}
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-public-muted-foreground">
                      Georganiseerd door
                    </p>
                    <p className="text-sm font-medium text-public-foreground truncate">
                      {event.organization.name}
                    </p>
                  </div>
                  {event.organization.websiteUrl && (
                    <a
                      href={event.organization.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-public-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Bezoek website organisator"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {/* Pricing & CTA */}
                <div className="flex items-center gap-4 sm:flex-shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-public-muted-foreground">
                      {lowestPrice === 0 ? "Toegang" : "Vanaf"}
                    </span>
                    <span className="text-2xl font-bold text-public-foreground">
                      {lowestPrice === 0
                        ? "Gratis"
                        : `€${(lowestPrice / 100).toFixed(2)}`}
                    </span>
                  </div>

                  <PublicButton
                    variant="primary"
                    size="lg"
                    disabled={isSoldOut}
                    className="min-w-[140px]"
                  >
                    {isSoldOut ? "Uitverkocht" : "Bekijk tickets"}
                  </PublicButton>
                </div>
              </div>
            </PublicCardFooter>
          </div>
        </div>
      </Link>
    </PublicCard>
  );
}
