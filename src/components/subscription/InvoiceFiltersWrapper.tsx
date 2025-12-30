"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { InvoiceFilters, type InvoiceFilterValues } from "./InvoiceFilters";
import type { InvoiceStatus, InvoiceType } from "@/generated/prisma";

export function InvoiceFiltersWrapper() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (filters: InvoiceFilterValues) => {
    const params = new URLSearchParams();
    if (filters.type) params.set("type", filters.type);
    if (filters.status) params.set("status", filters.status);
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);

    // Navigate with new filters
    router.push(
      `/dashboard/settings/subscription/billing?${params.toString()}`
    );
  };

  return (
    <InvoiceFilters
      onFilterChange={handleFilterChange}
      defaultValues={{
        type: (searchParams.get("type") as InvoiceType) || undefined,
        status: (searchParams.get("status") as InvoiceStatus) || undefined,
        startDate: searchParams.get("startDate") || undefined,
        endDate: searchParams.get("endDate") || undefined,
      }}
    />
  );
}
