"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { OrderStatus, TicketStatus } from "@/generated/prisma";
import {
  ChevronLeft,
  Mail,
  User,
  CreditCard,
  Calendar,
  Send,
  Ticket as TicketIcon,
  CheckCircle2,
} from "lucide-react";

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <Link
            href="/dashboard/orders"
            className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium text-sm mb-3 inline-flex"
          >
            <ChevronLeft className="w-4 h-4" />
            Terug naar bestellingen
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-gray-100 dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">
            Bestelling {order.orderNumber}
          </h1>
        </div>
        {order.status === "PAID" && (
          <button
            onClick={handleResendTickets}
            disabled={resending}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            <Send className="w-4 h-4" />
            {resending ? "Verzenden..." : "Tickets opnieuw verzenden"}
          </button>
        )}
      </div>

      {/* Success message */}
      {resendSuccess && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 backdrop-blur-xl border-2 border-green-200/50 dark:border-green-800/50 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="font-semibold text-green-900 dark:text-green-100">
              Tickets succesvol verzonden naar {order.buyerEmail}
            </p>
          </div>
        </div>
      )}

      {/* Order info */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Buyer info */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Koperinformatie
              </h2>
            </div>
          </div>
          <div className="p-6">
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Email
                </dt>
                <dd className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {order.buyerEmail}
                </dd>
              </div>
              {order.buyerName && (
                <div>
                  <dt className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Naam
                  </dt>
                  <dd className="font-medium text-gray-900 dark:text-white">
                    {order.buyerName}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Payment info */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Betalingsinformatie
              </h2>
            </div>
          </div>
          <div className="p-6">
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Status
                </dt>
                <dd>
                  <span
                    className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full ${
                      STATUS_COLORS[order.status]
                    }`}
                  >
                    {STATUS_LABELS[order.status]}
                  </span>
                </dd>
              </div>
              {order.paymentMethod && (
                <div>
                  <dt className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Betaalmethode
                  </dt>
                  <dd className="font-medium text-gray-900 dark:text-white uppercase">
                    {order.paymentMethod}
                  </dd>
                </div>
              )}
              {order.paidAt && (
                <div>
                  <dt className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Betaald op
                  </dt>
                  <dd className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {formatDate(order.paidAt)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Aangemaakt op
                </dt>
                <dd className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {formatDate(order.createdAt)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Order items */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Bestelde tickets
          </h2>
        </div>
        <div className="p-6">
          <table className="w-full">
            <thead className="border-b-2 border-gray-200/50 dark:border-gray-700">
              <tr>
                <th className="text-left py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Tickettype
                </th>
                <th className="text-right py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Aantal
                </th>
                <th className="text-right py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Prijs per stuk
                </th>
                <th className="text-right py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Totaal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700">
              {order.orderItems.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-4 font-medium text-gray-900 dark:text-white">
                    {item.ticketType.name}
                  </td>
                  <td className="py-4 text-right text-gray-700 dark:text-gray-300">
                    {item.quantity}
                  </td>
                  <td className="py-4 text-right text-gray-700 dark:text-gray-300">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="py-4 text-right font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(item.totalPrice)}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-200/50 dark:border-gray-700">
                <td
                  colSpan={3}
                  className="py-3 text-gray-600 dark:text-gray-400 font-medium"
                >
                  Servicekosten
                </td>
                <td className="py-3 text-right font-medium text-gray-900 dark:text-white">
                  {formatCurrency(order.serviceFee)}
                </td>
              </tr>
              <tr className="border-t-2 border-gray-200/50 dark:border-gray-700">
                <td
                  colSpan={3}
                  className="py-3 text-lg font-bold text-gray-900 dark:text-white"
                >
                  Totaal
                </td>
                <td className="py-3 text-right text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(order.totalAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tickets */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <TicketIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Tickets ({tickets.length})
            </h2>
          </div>
        </div>
        <div className="p-6">
          {tickets.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              Nog geen tickets aangemaakt
            </p>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-xl hover:border-purple-300 dark:hover:border-purple-600 transition-all"
                >
                  <div className="flex-1">
                    <p className="font-mono font-bold text-gray-900 dark:text-white text-lg">
                      {ticket.code}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {ticket.ticketType.name}
                    </p>
                    {ticket.usedAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        Gebruikt op {formatDate(ticket.usedAt)}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full shrink-0 ${
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
    </div>
  );
}
