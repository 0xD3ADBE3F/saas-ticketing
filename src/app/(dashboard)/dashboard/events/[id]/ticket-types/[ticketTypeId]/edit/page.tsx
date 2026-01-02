import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/server/lib/supabase";
import { getTicketTypeWithEvent } from "@/server/services/ticketTypeService";
import { TicketTypeForm } from "@/components/ticket-types/TicketTypeForm";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Edit, Ticket } from "lucide-react";

interface EditTicketTypePageProps {
  params: Promise<{ id: string; ticketTypeId: string }>;
}

export default async function EditTicketTypePage({
  params,
}: EditTicketTypePageProps) {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const { id: eventId, ticketTypeId } = await params;
  const result = await getTicketTypeWithEvent(ticketTypeId, user.id);

  if (!result.success || !result.data) {
    notFound();
  }

  const ticketType = result.data;

  // Verify the ticket type belongs to this event
  if (ticketType.eventId !== eventId) {
    notFound();
  }

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-6">
        <Link
          href="/dashboard/events"
          className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Evenementen
        </Link>
        <span className="text-gray-400">/</span>
        <Link
          href={`/dashboard/events/${eventId}`}
          className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
        >
          {ticketType.event.title}
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 dark:text-white font-semibold">
          {ticketType.name}
        </span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-pink-900 dark:from-gray-100 dark:via-purple-100 dark:to-pink-100 bg-clip-text text-transparent mb-2">
          Tickettype bewerken
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Wijzig de details van dit tickettype
        </p>
      </div>

      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-800/50 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <Edit className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Tickettype details
            </h2>
          </div>
        </div>
        <div className="p-6">
          <TicketTypeForm
            ticketType={ticketType}
            eventId={eventId}
            eventIsPaid={ticketType.event.isPaid}
            mode="edit"
          />
        </div>
      </div>
    </div>
  );
}
