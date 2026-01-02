"use client";

import Link from "next/link";
import { Event, EventStatus } from "@/generated/prisma";
import { formatDate, formatDateRange } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { getEventStatusVariant } from "@/lib/status-variants";
import {
  Calendar,
  MapPin,
  ChevronRight,
  Edit,
  ExternalLink,
  Ticket,
} from "lucide-react";

interface EventListProps {
  events: Event[];
}

const statusLabels: Record<EventStatus, string> = {
  DRAFT: "Concept",
  LIVE: "Live",
  ENDED: "Afgelopen",
  CANCELLED: "Geannuleerd",
};

const statusColors: Record<EventStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  LIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  ENDED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function EventList({ events }: EventListProps) {
  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Evenement
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Datum
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Locatie
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Status
              </th>
              <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Acties
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200/50 dark:divide-gray-800/50">
            {events.map((event) => (
              <tr
                key={event.id}
                className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group"
              >
                <td className="px-6 py-5">
                  <Link
                    href={`/dashboard/events/${event.id}`}
                    className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 group"
                  >
                    {event.title}
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    {formatDateRange(event.startsAt, event.endsAt)}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    {event.location ? (
                      <>
                        <MapPin className="w-4 h-4" />
                        {event.location}
                      </>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <Badge
                    variant={getEventStatusVariant(event.status)}
                    className="font-medium"
                  >
                    {statusLabels[event.status]}
                  </Badge>
                </td>
                <td className="px-6 py-5">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/dashboard/events/${event.id}/edit`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Bewerken
                    </Link>
                    {event.status === "LIVE" && (
                      <Link
                        href={`/e/${event.organization.slug}/${event.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Bekijk
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/dashboard/events/${event.id}`}
            className="block group"
          >
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-2xl p-5 hover:border-blue-300 dark:hover:border-blue-600 transition-all hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5 active:scale-[0.98] touch-manipulation">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white pr-2 flex-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {event.title}
                </h3>
                <Badge
                  variant={getEventStatusVariant(event.status)}
                  className="font-medium shrink-0"
                >
                  {statusLabels[event.status]}
                </Badge>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                  <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span>{formatDateRange(event.startsAt, event.endsAt)}</span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                    <div className="p-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span>{event.location}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                  <span>Details bekijken</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
                {event.status === "LIVE" && (
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Live
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
