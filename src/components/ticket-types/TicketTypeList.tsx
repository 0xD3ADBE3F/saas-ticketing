"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TicketType } from "@/generated/prisma";
import { formatPrice } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { Edit2, Trash2 } from "lucide-react";

interface TicketTypeListProps {
  ticketTypes: TicketType[];
  eventId: string;
  canEdit?: boolean;
}

export function TicketTypeList({
  ticketTypes,
  eventId,
  canEdit = true,
}: TicketTypeListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (ticketType: TicketType) => {
    const confirmed = window.confirm(
      `Weet je zeker dat je "${ticketType.name}" wilt verwijderen?`
    );
    if (!confirmed) return;

    setDeletingId(ticketType.id);
    setError(null);

    try {
      const response = await fetch(`/api/ticket-types/${ticketType.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Er is iets misgegaan");
        return;
      }

      router.refresh();
    } catch {
      setError("Er is iets misgegaan. Probeer het opnieuw.");
    } finally {
      setDeletingId(null);
    }
  };

  const getAvailabilityStatus = (ticketType: TicketType) => {
    const available = ticketType.capacity - ticketType.soldCount;
    const percentage = Math.round(
      (ticketType.soldCount / ticketType.capacity) * 100
    );

    if (available === 0) {
      return { label: "Uitverkocht", color: "text-red-600 dark:text-red-400" };
    }
    if (percentage >= 90) {
      return {
        label: `${available} beschikbaar`,
        color: "text-orange-600 dark:text-orange-400",
      };
    }
    return {
      label: `${available} beschikbaar`,
      color: "text-green-600 dark:text-green-400",
    };
  };

  const getSaleStatus = (ticketType: TicketType) => {
    const now = new Date();

    if (ticketType.saleStart && new Date(ticketType.saleStart) > now) {
      return {
        label: `Start ${formatDate(ticketType.saleStart)}`,
        isOnSale: false,
      };
    }
    if (ticketType.saleEnd && new Date(ticketType.saleEnd) < now) {
      return { label: "Verkoop gesloten", isOnSale: false };
    }
    return { label: "Te koop", isOnSale: true };
  };

  if (ticketTypes.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Nog geen tickettypes aangemaakt
        </p>
        {canEdit && (
          <Link
            href={`/dashboard/events/${eventId}/ticket-types/new`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Tickettype toevoegen
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 w-[35%]">
                Naam
              </th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 w-[12%]">
                Prijs
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 w-[15%]">
                Verkocht
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 w-[18%]">
                Beschikbaarheid
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 w-[15%]">
                Status
              </th>
              {canEdit && (
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 w-[5%]">
                  Acties
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {ticketTypes.map((ticketType) => {
              const availability = getAvailabilityStatus(ticketType);
              const saleStatus = getSaleStatus(ticketType);

              return (
                <tr
                  key={ticketType.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {ticketType.name}
                      </div>
                      {ticketType.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                          {ticketType.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right font-semibold text-gray-900 dark:text-white">
                    {ticketType.price === 0
                      ? "Gratis"
                      : formatPrice(ticketType.price)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {ticketType.soldCount} / {ticketType.capacity}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.round(
                          (ticketType.soldCount / ticketType.capacity) * 100
                        )}
                        %
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`text-sm font-medium ${availability.color}`}
                    >
                      {availability.label}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                        saleStatus.isOnSale
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {saleStatus.label}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/dashboard/events/${eventId}/ticket-types/${ticketType.id}/edit`}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Bewerken"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(ticketType)}
                          disabled={
                            deletingId === ticketType.id ||
                            ticketType.soldCount > 0
                          }
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-600 dark:disabled:hover:text-gray-400"
                          title={
                            ticketType.soldCount > 0
                              ? "Kan niet worden verwijderd: er zijn al tickets verkocht"
                              : deletingId === ticketType.id
                                ? "Verwijderen..."
                                : "Verwijderen"
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {ticketTypes.map((ticketType) => {
          const availability = getAvailabilityStatus(ticketType);
          const saleStatus = getSaleStatus(ticketType);

          return (
            <div
              key={ticketType.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {ticketType.name}
                  </h3>
                  {ticketType.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                      {ticketType.description}
                    </p>
                  )}
                </div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {ticketType.price === 0
                    ? "Gratis"
                    : formatPrice(ticketType.price)}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    saleStatus.isOnSale
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {saleStatus.label}
                </span>
                <span className={`text-xs ${availability.color}`}>
                  {ticketType.soldCount}/{ticketType.capacity} verkocht
                </span>
              </div>

              {canEdit && (
                <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <Link
                    href={`/dashboard/events/${eventId}/ticket-types/${ticketType.id}/edit`}
                    className="flex-1 text-center py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    Bewerken
                  </Link>
                  <button
                    onClick={() => handleDelete(ticketType)}
                    disabled={
                      deletingId === ticketType.id || ticketType.soldCount > 0
                    }
                    className="flex-1 text-center py-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === ticketType.id
                      ? "Verwijderen..."
                      : "Verwijderen"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add new button */}
      {canEdit && (
        <div className="pt-2">
          <Link
            href={`/dashboard/events/${eventId}/ticket-types/new`}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Tickettype toevoegen
          </Link>
        </div>
      )}
    </div>
  );
}
