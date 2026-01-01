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
import { ShoppingCart, Loader2 } from "lucide-react";

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
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  PAID: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  REFUNDED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
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
      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div>
            <Label htmlFor="search" className="mb-2">
              Zoeken (email of ordernummer)
            </Label>
            <Input
              id="search"
              type="text"
              placeholder="Zoeken..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status" className="mb-2">
              Status
            </Label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus | "ALL")}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent"
            >
              <option value="ALL">Alle statussen</option>
              <option value="PENDING">In afwachting</option>
              <option value="PAID">Betaald</option>
              <option value="FAILED">Mislukt</option>
              <option value="CANCELLED">Geannuleerd</option>
              <option value="REFUNDED">Terugbetaald</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <Label htmlFor="dateFrom" className="mb-2">
              Van datum
            </Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent"
            />
          </div>

          {/* Date To */}
          <div>
            <Label htmlFor="dateTo" className="mb-2">
              Tot datum
            </Label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {total} {total === 1 ? "bestelling" : "bestellingen"} gevonden
          </p>
        </div>
      </Card>

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
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ordernummer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Koper
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Evenement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tickets
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Bedrag
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Datum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div>
                        <div className="font-medium">{order.buyerEmail}</div>
                        {order.buyerName && (
                          <div className="text-gray-500 dark:text-gray-400">
                            {order.buyerName}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {order.event.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {order.orderItems.reduce(
                        (sum, item) => sum + item.quantity,
                        0
                      )}{" "}
                      tickets
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getOrderStatusVariant(order.status)}>
                        {STATUS_LABELS[order.status]}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Details
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
