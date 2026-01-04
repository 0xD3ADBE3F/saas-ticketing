/**
 * Email Service
 *
 * Handles sending ticket emails to buyers
 * Uses Resend for production, console logging for development
 */

import { Resend } from "resend";
import { TicketWithDetails } from "@/server/repos/ticketRepo";
import { getQRImageUrl } from "./qrService";
import { generateQRData } from "./ticketService";
import { generateTicketConfirmationHTML } from "@/emails/html/ticket-confirmation";
import { generateTicketConfirmationText } from "@/emails/text/ticket-confirmation";

export type EmailResult =
  | { success: true; messageId?: string }
  | { success: false; error: string };

type TicketEmailData = {
  to: string;
  buyerName: string | null;
  orderNumber: string;
  orderId: string;
  event: {
    title: string;
    startsAt: Date;
    endsAt: Date;
    location: string | null;
  };
  organization: {
    name: string;
    logoUrl: string | null;
  };
  tickets: Array<{
    id: string;
    code: string;
    secretToken: string;
    ticketTypeName: string;
  }>;
  baseUrl: string;
};

/**
 * Check if Resend is configured
 */
function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Send ticket email using Resend (or log in development)
 */
export async function sendTicketEmail(data: TicketEmailData): Promise<EmailResult> {
  // Prepare ticket data with QR image URLs for HTML template
  const ticketsWithQR = data.tickets.map((ticket) => {
    const qrDataUrl = generateQRData(ticket, data.baseUrl);
    const qrImageUrl = getQRImageUrl(qrDataUrl, 150);
    return {
      ...ticket,
      qrImageUrl,
    };
  });

  const html = generateTicketConfirmationHTML({
    ...data,
    tickets: ticketsWithQR,
  });

  const text = generateTicketConfirmationText(data);
  const subject = `🎫 Je tickets voor ${data.event.title}`;

  // In development without Resend, just log
  if (!isResendConfigured()) {
    console.log("📧 [DEV] Would send email to:", data.to);
    console.log("📧 [DEV] Subject:", subject);
    console.log("📧 [DEV] Tickets:", data.tickets.map((t) => t.code).join(", "));
    return { success: true, messageId: "dev-" + Date.now() };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Entro <noreply@email.stormzaak.nl>",
      to: data.to,
      subject,
      html,
      text,
    });

    if (result.error) {
      console.error("Resend error:", result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error("Email send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

/**
 * Send tickets for an order
 */
export async function sendOrderTickets(
  order: {
    id: string;
    orderNumber: string;
    buyerEmail: string;
    buyerName: string | null;
  },
  event: {
    title: string;
    startsAt: Date;
    endsAt: Date;
    location: string | null;
    organization: {
      name: string;
      logoUrl: string | null;
    };
  },
  tickets: Array<TicketWithDetails>,
  baseUrl: string
): Promise<EmailResult> {
  return sendTicketEmail({
    to: order.buyerEmail,
    buyerName: order.buyerName,
    orderNumber: order.orderNumber,
    orderId: order.id,
    event: {
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      location: event.location,
    },
    organization: event.organization,
    tickets: tickets.map((t) => ({
      id: t.id,
      code: t.code,
      secretToken: t.secretToken,
      ticketTypeName: t.ticketType.name,
    })),
    baseUrl,
  });
}
