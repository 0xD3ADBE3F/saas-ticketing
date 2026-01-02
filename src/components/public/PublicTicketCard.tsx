"use client";

import { ReactNode } from "react";
import { Check } from "lucide-react";

interface PublicTicketCardProps {
  name: string;
  price: string;
  description?: string;
  available: number;
  totalCapacity?: number;
  onSelect?: () => void;
  isSelected?: boolean;
  badge?: ReactNode;
  isSoldOut?: boolean;
}

export function PublicTicketCard({
  name,
  price,
  description,
  available,
  totalCapacity,
  onSelect,
  isSelected = false,
  badge,
  isSoldOut = false,
}: PublicTicketCardProps) {
  const handleClick = () => {
    if (!isSoldOut && onSelect) {
      onSelect();
    }
  };

  const availabilityPercent = totalCapacity
    ? (available / totalCapacity) * 100
    : 100;
  const isLowStock = availabilityPercent < 20 && availabilityPercent > 0;

  return (
    <div
      onClick={handleClick}
      className={`public-card public-card-interactive relative transition-all duration-200 border ${
        isSelected
          ? "ring-2 ring-blue-600 dark:ring-blue-500 shadow-lg border-blue-300 dark:border-blue-700"
          : "border-gray-200 dark:border-gray-700"
      } ${
        isSoldOut
          ? "opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-900"
          : "hover:shadow-xl cursor-pointer bg-white dark:bg-gray-800"
      }`}
      role="button"
      tabIndex={isSoldOut ? -1 : 0}
      aria-pressed={isSelected}
      aria-disabled={isSoldOut}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isSoldOut && onSelect) {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-4 right-4 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center animate-fade-in-up">
          <Check className="w-5 h-5 text-white" />
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {name}
            </h3>
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="mb-4">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {price}
          </div>
        </div>

        {/* Availability */}
        <div className="space-y-2">
          {isSoldOut ? (
            <div className="public-badge public-badge-error">Uitverkocht</div>
          ) : isLowStock ? (
            <div className="public-badge public-badge-warning animate-pulse">
              Laatste {available} beschikbaar
            </div>
          ) : (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {available} beschikbaar
            </div>
          )}

          {badge && <div>{badge}</div>}
        </div>

        {/* Availability bar */}
        {!isSoldOut && totalCapacity && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isLowStock
                    ? "bg-orange-500"
                    : "bg-gradient-to-r from-blue-500 to-purple-500"
                }`}
                style={{ width: `${Math.max(5, availabilityPercent)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
