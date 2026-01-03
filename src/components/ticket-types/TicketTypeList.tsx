"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import type { TicketType } from "@/generated/prisma";
import { formatPrice } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import {
  Edit2,
  Trash2,
  TrendingUp,
  DollarSign,
  Users,
  Layers,
} from "lucide-react";

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

  // Calculate summary statistics
  const stats = useMemo(() => {
    const totalCapacity = ticketTypes.reduce((sum, tt) => sum + tt.capacity, 0);
    const totalSold = ticketTypes.reduce((sum, tt) => sum + tt.soldCount, 0);
    const totalRevenue = ticketTypes.reduce(
      (sum, tt) => sum + tt.price * tt.soldCount,
      0
    );
    const avgPrice =
      ticketTypes.length > 0
        ? ticketTypes.reduce((sum, tt) => sum + tt.price, 0) /
          ticketTypes.length
        : 0;

    return { totalCapacity, totalSold, totalRevenue, avgPrice };
  }, [ticketTypes]);

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
      <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
        <div className="max-w-sm mx-auto">
          <div className="mb-4 inline-flex p-4 bg-white dark:bg-gray-900 rounded-full shadow-sm">
            <Layers className="w-8 h-8 text-gray-400 dark:text-gray-600" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
            Nog geen tickettypes aangemaakt
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            Begin met het toevoegen van tickettypes om tickets te kunnen
            verkopen
          </p>
          {canEdit && (
            <Link
              href={`/dashboard/events/${eventId}/ticket-types/new`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl font-semibold"
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200/50 dark:border-blue-800/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
              Types
            </span>
          </div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {ticketTypes.length}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200/50 dark:border-purple-800/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg">
              <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">
              Verkocht
            </span>
          </div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {stats.totalSold}
            <span className="text-sm font-normal text-purple-600 dark:text-purple-400">
              {" "}
              / {stats.totalCapacity}
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200/50 dark:border-green-800/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 dark:bg-green-500/20 rounded-lg">
              <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
              Omzet
            </span>
          </div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-100">
            {formatPrice(stats.totalRevenue)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-4 border border-orange-200/50 dark:border-orange-800/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/10 dark:bg-orange-500/20 rounded-lg">
              <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide">
              Gem. Prijs
            </span>
          </div>
          <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
            {formatPrice(stats.avgPrice)}
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/80 dark:to-gray-800/50">
              <tr>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider min-w-[200px]">
                  Naam
                </th>
                <th className="text-right px-3 py-3.5 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  Prijs
                </th>
                <th className="text-right px-3 py-3.5 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  Omzet
                </th>
                <th className="text-left px-3 py-3.5 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider min-w-[140px]">
                  Voortgang
                </th>
                {canEdit && (
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    Acties
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {ticketTypes.map((ticketType) => {
                const availability = getAvailabilityStatus(ticketType);
                const saleStatus = getSaleStatus(ticketType);
                const revenue = ticketType.price * ticketType.soldCount;
                const soldPercentage = Math.round(
                  (ticketType.soldCount / ticketType.capacity) * 100
                );

                return (
                  <tr
                    key={ticketType.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {ticketType.name}
                          </span>
                          {!saleStatus.isOnSale && (
                            <span className="inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                              {saleStatus.label}
                            </span>
                          )}
                        </div>
                        {ticketType.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                            {ticketType.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <span className="font-bold text-sm text-gray-900 dark:text-white">
                        {ticketType.price === 0
                          ? "Gratis"
                          : formatPrice(ticketType.price)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatPrice(revenue)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {ticketType.soldCount} / {ticketType.capacity}
                          </span>
                          <span
                            className={`font-bold tabular-nums ${
                              soldPercentage >= 90
                                ? "text-red-600 dark:text-red-400"
                                : soldPercentage >= 70
                                  ? "text-orange-600 dark:text-orange-400"
                                  : "text-green-600 dark:text-green-400"
                            }`}
                          >
                            {soldPercentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full transition-all rounded-full ${
                              soldPercentage >= 90
                                ? "bg-gradient-to-r from-orange-500 to-red-500"
                                : soldPercentage >= 70
                                  ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                                  : "bg-gradient-to-r from-green-400 to-green-600"
                            }`}
                            style={{ width: `${soldPercentage}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">
                          {availability.label}
                        </div>
                      </div>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/dashboard/events/${eventId}/ticket-types/${ticketType.id}/edit`}
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
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
                            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-600 dark:disabled:hover:text-gray-400"
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
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {ticketTypes.map((ticketType) => {
          const availability = getAvailabilityStatus(ticketType);
          const saleStatus = getSaleStatus(ticketType);
          const revenue = ticketType.price * ticketType.soldCount;
          const soldPercentage = Math.round(
            (ticketType.soldCount / ticketType.capacity) * 100
          );

          return (
            <div
              key={ticketType.id}
              className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                    {ticketType.name}
                  </h3>
                  {ticketType.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                      {ticketType.description}
                    </p>
                  )}
                </div>
                <span className="font-bold text-lg text-gray-900 dark:text-white ml-3">
                  {ticketType.price === 0
                    ? "Gratis"
                    : formatPrice(ticketType.price)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {ticketType.soldCount} / {ticketType.capacity} verkocht
                  </span>
                  <span className="font-bold text-gray-600 dark:text-gray-400">
                    {soldPercentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full transition-all rounded-full ${
                      soldPercentage >= 90
                        ? "bg-gradient-to-r from-orange-500 to-red-500"
                        : soldPercentage >= 70
                          ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                          : "bg-gradient-to-r from-green-400 to-green-600"
                    }`}
                    style={{ width: `${soldPercentage}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                  <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">
                    Omzet
                  </div>
                  <div className="text-sm font-bold text-green-700 dark:text-green-300">
                    {formatPrice(revenue)}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">
                    Beschikbaar
                  </div>
                  <div className={`text-sm font-bold ${availability.color}`}>
                    {availability.label}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <span
                  className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full ${
                    saleStatus.isOnSale
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {saleStatus.label}
                </span>
              </div>

              {canEdit && (
                <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <Link
                    href={`/dashboard/events/${eventId}/ticket-types/${ticketType.id}/edit`}
                    className="flex-1 text-center py-2.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    Bewerken
                  </Link>
                  <button
                    onClick={() => handleDelete(ticketType)}
                    disabled={
                      deletingId === ticketType.id || ticketType.soldCount > 0
                    }
                    className="flex-1 text-center py-2.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
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
