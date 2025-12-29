"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { OrderStatus, TicketStatus } from "@/generated/prisma";

interface Ticket {
  id: string;
  code: string;
  status: TicketStatus;
  usedAt: string | null;
  ticketType: {
    name: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  buyerEmail: string;
  buyerName: string | null;
  status: OrderStatus;
  ticketTotal: number;
  serviceFee: number;
  totalAmount: number;
  paymentId: string | null;
  paymentMethod: string | null;
  paidAt: string | null;
  createdAt: string;
  orderItems: {
    ticketType: {
      name: string;
    };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
}

interface OrderDetailsProps {
  organizationId: string;
  orderId: string;
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

const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  VALID: "Geldig",
  USED: "Gebruikt",
  REFUNDED: "Terugbetaald",
};

const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  VALID: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  USED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  REFUNDED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

export function OrderDetails({ organizationId, orderId }: OrderDetailsProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [organizationId, orderId]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/orders/${orderId}`
      );

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Bestelling niet gevonden");
        }
        throw new Error("Fout bij ophalen bestelling");
      }

      const data = await res.json();
      setOrder(data.order);
      setTickets(data.tickets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    } finally {
      setLoading(false);
    }
  };

  const handleResendTickets = async () => {
    setResending(true);
    setResendSuccess(false);

    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/orders/${orderId}/resend`,
        {
          method: "POST",
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fout bij verzenden tickets");
      }

      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fout bij verzenden tickets");
    } finally {
      setResending(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("nl-NL", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Bestelling laden...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/orders"
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
        >
          ← Terug naar bestellingen
        </Link>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">
            {error || "Bestelling niet gevonden"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/orders"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm mb-2 inline-block"
          >
            ← Terug naar bestellingen
          </Link>
          <h1 className="text-2xl font-bold">Bestelling {order.orderNumber}</h1>
        </div>
        {order.status === "PAID" && (
          <button
            onClick={handleResendTickets}
            disabled={resending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {resending ? "Verzenden..." : "Tickets opnieuw verzenden"}
          </button>
        )}
      </div>

      {/* Success message */}
      {resendSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-200">
            Tickets succesvol verzonden naar {order.buyerEmail}
          </p>
        </div>
      )}

      {/* Order info */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Buyer info */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h2 className="font-semibold mb-4">Koperinformatie</h2>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">
                Email
              </dt>
              <dd className="font-medium">{order.buyerEmail}</dd>
            </div>
            {order.buyerName && (
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">
                  Naam
                </dt>
                <dd className="font-medium">{order.buyerName}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Payment info */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h2 className="font-semibold mb-4">Betalingsinformatie</h2>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">
                Status
              </dt>
              <dd>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    STATUS_COLORS[order.status]
                  }`}
                >
                  {STATUS_LABELS[order.status]}
                </span>
              </dd>
            </div>
            {order.paymentMethod && (
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">
                  Betaalmethode
                </dt>
                <dd className="font-medium uppercase">{order.paymentMethod}</dd>
              </div>
            )}
            {order.paidAt && (
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">
                  Betaald op
                </dt>
                <dd className="font-medium">{formatDate(order.paidAt)}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">
                Aangemaakt op
              </dt>
              <dd className="font-medium">{formatDate(order.createdAt)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Order items */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h2 className="font-semibold mb-4">Bestelde tickets</h2>
        <table className="w-full">
          <thead className="border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left py-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                Tickettype
              </th>
              <th className="text-right py-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                Aantal
              </th>
              <th className="text-right py-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                Prijs per stuk
              </th>
              <th className="text-right py-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                Totaal
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {order.orderItems.map((item, idx) => (
              <tr key={idx}>
                <td className="py-3">{item.ticketType.name}</td>
                <td className="py-3 text-right">{item.quantity}</td>
                <td className="py-3 text-right">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="py-3 text-right font-medium">
                  {formatCurrency(item.totalPrice)}
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} className="py-2 text-gray-500 dark:text-gray-400">
                Servicekosten
              </td>
              <td className="py-2 text-right">
                {formatCurrency(order.serviceFee)}
              </td>
            </tr>
            <tr className="font-bold">
              <td colSpan={3} className="py-2">
                Totaal
              </td>
              <td className="py-2 text-right">
                {formatCurrency(order.totalAmount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tickets */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h2 className="font-semibold mb-4">Tickets ({tickets.length})</h2>
        {tickets.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            Nog geen tickets aangemaakt
          </p>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div>
                  <p className="font-mono font-medium">{ticket.code}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {ticket.ticketType.name}
                  </p>
                  {ticket.usedAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Gebruikt op {formatDate(ticket.usedAt)}
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    TICKET_STATUS_COLORS[ticket.status]
                  }`}
                >
                  {TICKET_STATUS_LABELS[ticket.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
