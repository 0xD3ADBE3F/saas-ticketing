"use client";

import { useState } from "react";
import { formatDateRange } from "@/lib/date";
import { AddToWalletButtons } from "./AddToWalletButtons";

interface Ticket {
  id: string;
  code: string;
  ticketType: {
    name: string;
  };
  event: {
    title: string;
    startsAt: string | Date;
    endsAt: string | Date;
    location: string | null;
  };
  qrData: string;
}

interface TicketDisplayProps {
  tickets: Ticket[];
  orderNumber: string;
  buyerEmail: string;
}

export function TicketDisplay({
  tickets,
  orderNumber,
  buyerEmail,
}: TicketDisplayProps) {
  const [expandedTicket, setExpandedTicket] = useState<string | null>(
    tickets.length === 1 ? tickets[0].id : null
  );

  // Group tickets by type for summary
  const ticketsByType = tickets.reduce(
    (acc, ticket) => {
      const type = ticket.ticketType.name;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Generate QR image URL
  const getQRImageUrl = (qrData: string) => {
    const encodedData = encodeURIComponent(qrData);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedData}&format=png&margin=10`;
  };

  return (
    <div className="space-y-6">
      {/* Ticket Summary */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
          Je tickets ({tickets.length})
        </h4>
        <div className="space-y-2">
          {Object.entries(ticketsByType).map(([type, count]) => (
            <div
              key={type}
              className="flex justify-between text-sm text-gray-600 dark:text-gray-400"
            >
              <span>{type}</span>
              <span>×{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Tickets */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900 dark:text-white">
          Toon bij de ingang
        </h4>
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            {/* Ticket Header - Always Visible */}
            <button
              onClick={() =>
                setExpandedTicket(
                  expandedTicket === ticket.id ? null : ticket.id
                )
              }
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                    />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {ticket.ticketType.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {ticket.code}
                  </p>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  expandedTicket === ticket.id ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Expanded QR Code */}
            {expandedTicket === ticket.id && (
              <div className="p-4 flex flex-col items-center border-t border-gray-200 dark:border-gray-700">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getQRImageUrl(ticket.qrData)}
                    alt={`QR Code voor ticket ${ticket.code}`}
                    width={200}
                    height={200}
                    className="w-[200px] h-[200px]"
                  />
                </div>
                <p className="mt-3 text-center">
                  <span className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                    {ticket.code}
                  </span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {ticket.event.title}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {formatDateRange(ticket.event.startsAt, ticket.event.endsAt)}
                </p>

                {/* Add to Wallet Buttons */}
                <div className="mt-4 w-full">
                  <AddToWalletButtons ticketId={ticket.id} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
          💡 Tips
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
          <li>• Bewaar deze pagina of de e-mail met je tickets</li>
          <li>• Toon de QR-code bij de ingang</li>
          <li>• Elk ticket kan maar één keer gescand worden</li>
        </ul>
      </div>
    </div>
  );
}
