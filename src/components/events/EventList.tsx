"use client";

import Link from "next/link";
import { Event, EventStatus } from "@/generated/prisma";
import { formatDate, formatDateRange } from "@/lib/date";

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
      <div className="hidden md:block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                Evenement
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                Datum
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                Locatie
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                Status
              </th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                Acties
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {events.map((event) => (
              <tr
                key={event.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <td className="px-4 py-4">
                  <Link
                    href={`/dashboard/events/${event.id}`}
                    className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {event.title}
                  </Link>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                  {formatDateRange(event.startsAt, event.endsAt)}
                </td>
                <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                  {event.location || "-"}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[event.status]}`}
                  >
                    {statusLabels[event.status]}
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/dashboard/events/${event.id}/edit`}
                      className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    >
                      Bewerken
                    </Link>
                    {event.status === "LIVE" && (
                      <Link
                        href={`/e/${event.slug}`}
                        target="_blank"
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
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
            className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-gray-900 dark:text-white">
                {event.title}
              </h3>
              <span
                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[event.status]}`}
              >
                {statusLabels[event.status]}
              </span>
            </div>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <p className="flex items-center gap-2">
                <svg
                  className="w-4 h-4"
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
                {formatDateRange(event.startsAt, event.endsAt)}
              </p>
              {event.location && (
                <p className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
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
                  {event.location}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
