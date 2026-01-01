"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { EventStatus } from "@/generated/prisma";
import { useCallback, useState, useTransition } from "react";
import { Search, X, Filter } from "lucide-react";

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
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-focus-within:bg-blue-100 dark:group-focus-within:bg-blue-900/30 transition-colors">
            <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <input
            type="text"
            placeholder="Zoek evenementen..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full h-12 px-4 pl-14 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-600 transition-all text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
          />
          {searchValue && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-lg transition-all active:scale-95 touch-manipulation"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* Status Filter */}
      <div className="relative sm:w-48">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg pointer-events-none">
          <Filter className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>
        <select
          value={currentStatus || ""}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="w-full h-12 pl-14 pr-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 dark:focus:border-purple-600 transition-all appearance-none cursor-pointer text-gray-900 dark:text-white font-medium"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: "right 0.75rem center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "1.25rem 1.25rem",
          }}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Loading indicator */}
      {isPending && (
        <div className="flex items-center justify-center px-3">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
