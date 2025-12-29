"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { EventStatus } from "@/generated/prisma";
import { useCallback, useState, useTransition } from "react";

interface EventFiltersProps {
  currentStatus?: EventStatus;
  currentSearch?: string;
}

const statusOptions: { value: EventStatus | ""; label: string }[] = [
  { value: "", label: "Alle statussen" },
  { value: "DRAFT", label: "Concept" },
  { value: "LIVE", label: "Live" },
  { value: "ENDED", label: "Afgelopen" },
  { value: "CANCELLED", label: "Geannuleerd" },
];

export function EventFilters({
  currentStatus,
  currentSearch,
}: EventFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(currentSearch || "");

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.push(`/dashboard/events?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const handleStatusChange = (status: string) => {
    updateParams("status", status);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams("search", searchValue);
  };

  const handleClearSearch = () => {
    setSearchValue("");
    updateParams("search", "");
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex-1">
        <div className="relative">
          <input
            type="text"
            placeholder="Zoek evenementen..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full px-4 py-2 pl-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchValue && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </form>

      {/* Status Filter */}
      <select
        value={currentStatus || ""}
        onChange={(e) => handleStatusChange(e.target.value)}
        className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Loading indicator */}
      {isPending && (
        <div className="flex items-center justify-center px-3">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
