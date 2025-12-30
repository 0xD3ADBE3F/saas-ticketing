"use client";

import type { InvoiceStatus, InvoiceType } from "@/generated/prisma";

interface InvoiceFiltersProps {
  onFilterChange: (filters: InvoiceFilterValues) => void;
  defaultValues?: Partial<InvoiceFilterValues>;
}

export interface InvoiceFilterValues {
  type?: InvoiceType;
  status?: InvoiceStatus;
  startDate?: string;
  endDate?: string;
}

export function InvoiceFilters({
  onFilterChange,
  defaultValues = {},
}: InvoiceFiltersProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const filters: InvoiceFilterValues = {
      type: (formData.get("type") as InvoiceType) || undefined,
      status: (formData.get("status") as InvoiceStatus) || undefined,
      startDate: (formData.get("startDate") as string) || undefined,
      endDate: (formData.get("endDate") as string) || undefined,
    };

    onFilterChange(filters);
  };

  const handleReset = () => {
    onFilterChange({});
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-4 rounded-lg border border-gray-200 space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Type Filter */}
        <div>
          <label
            htmlFor="type"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue={defaultValues.type || ""}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Alle types</option>
            <option value="SUBSCRIPTION">Abonnement</option>
            <option value="PAY_PER_EVENT">Per evenement</option>
            <option value="OVERAGE">Overgebruik</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={defaultValues.status || ""}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Alle statussen</option>
            <option value="DRAFT">Concept</option>
            <option value="SENT">Verzonden</option>
            <option value="PENDING">In behandeling</option>
            <option value="PAID">Betaald</option>
            <option value="OVERDUE">Achterstallig</option>
            <option value="CANCELLED">Geannuleerd</option>
            <option value="FAILED">Mislukt</option>
          </select>
        </div>

        {/* Start Date Filter */}
        <div>
          <label
            htmlFor="startDate"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Van datum
          </label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            defaultValue={defaultValues.startDate || ""}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* End Date Filter */}
        <div>
          <label
            htmlFor="endDate"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Tot datum
          </label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            defaultValue={defaultValues.endDate || ""}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          type="submit"
          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Filter toepassen
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Reset
        </button>
      </div>
    </form>
  );
}
