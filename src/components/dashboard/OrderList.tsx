"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { OrderStatus } from "@/generated/prisma";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { getOrderStatusVariant } from "@/lib/status-variants";
import {
  ShoppingCart,
  Loader2,
  Search,
  Filter,
  Calendar,
  Mail,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

interface Order {
  id: string;
  orderNumber: string;
  buyerEmail: string;
  buyerName: string | null;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  event: {
    title: string;
    slug: string;
  };
  orderItems: {
    ticketType: {
      name: string;
    };
    quantity: number;
  }[];
}

interface OrderListProps {
  organizationId: string;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "In afwachting",
  PAID: "Betaald",
  FAILED: "Mislukt",
  CANCELLED: "Geannuleerd",
  REFUNDED: "Terugbetaald",
  EXPIRED: "Verlopen",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  PAID: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  REFUNDED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  EXPIRED: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export function OrderList({ organizationId }: OrderListProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [status, setStatus] = useState<OrderStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (status !== "ALL") params.set("status", status);
      if (search) params.set("search", search);
      if (dateFrom) params.set("dateFrom", new Date(dateFrom).toISOString());
      if (dateTo) params.set("dateTo", new Date(dateTo).toISOString());

      const res = await fetch(
        `/api/organizations/${organizationId}/orders?${params.toString()}`
      );

      if (!res.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await res.json();
      setOrders(data.orders);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [organizationId, status, search, dateFrom, dateTo]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("nl-NL", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-2xl p-6 shadow-xl">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div>
            <Label
              htmlFor="search"
              className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Zoeken
            </Label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-focus-within:bg-blue-100 dark:group-focus-within:bg-blue-900/30 transition-colors">
                <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <Input
                id="search"
                type="text"
                placeholder="Email of ordernummer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 h-11 border-2 border-gray-200/50 dark:border-gray-800/50 focus:border-blue-400 dark:focus:border-blue-600"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <Label
              htmlFor="status"
              className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Status
            </Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg pointer-events-none">
                <Filter className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <select
                id="status"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as OrderStatus | "ALL")
                }
                className="w-full h-11 pl-12 pr-10 border-2 border-gray-200/50 dark:border-gray-800/50 rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 dark:focus:border-purple-600 transition-all appearance-none cursor-pointer font-medium"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: "right 0.75rem center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "1.25rem 1.25rem",
                }}
              >
                <option value="ALL">Alle statussen</option>
                <option value="PENDING">In afwachting</option>
                <option value="PAID">Betaald</option>
                <option value="FAILED">Mislukt</option>
                <option value="CANCELLED">Geannuleerd</option>
                <option value="REFUNDED">Terugbetaald</option>
                <option value="EXPIRED">Verlopen</option>
              </select>
            </div>
          </div>

          {/* Date From */}
          <div>
            <Label
              htmlFor="dateFrom"
              className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Van datum
            </Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg pointer-events-none">
                <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="pl-12 h-11 border-2 border-gray-200/50 dark:border-gray-800/50 focus:border-green-400 dark:focus:border-green-600"
              />
            </div>
          </div>

          {/* Date To */}
          <div>
            <Label
              htmlFor="dateTo"
              className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Tot datum
            </Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg pointer-events-none">
                <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="pl-12 h-11 border-2 border-gray-200/50 dark:border-gray-800/50 focus:border-green-400 dark:focus:border-green-600"
              />
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-5 pt-5 border-t border-gray-200/50 dark:border-gray-800/50">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            <span className="text-blue-600 dark:text-blue-400">{total}</span>{" "}
            {total === 1 ? "bestelling" : "bestellingen"} gevonden
          </p>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Bestellingen laden...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && <Alert variant="destructive">{error}</Alert>}

      {/* Orders list */}
      {!loading && !error && orders.length === 0 && (
        <EmptyState
          icon={ShoppingCart}
          title="Geen bestellingen"
          description="Geen bestellingen gevonden"
        />
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Ordernummer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Koper
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Evenement
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Tickets
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Bedrag
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Datum
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group"
                  >
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          {order.buyerEmail}
                        </div>
                        {order.buyerName && (
                          <div className="text-gray-500 dark:text-gray-400 mt-0.5">
                            {order.buyerName}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-700 dark:text-gray-300">
                      {order.event.title}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {order.orderItems.reduce(
                        (sum, item) => sum + item.quantity,
                        0
                      )}{" "}
                      tickets
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <Badge
                        variant={getOrderStatusVariant(order.status)}
                        className="font-medium"
                      >
                        {STATUS_LABELS[order.status]}
                      </Badge>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                      >
                        Details
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
