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

export type EmailResult =
  | { success: true; messageId?: string }
  | { success: false; error: string };

type TicketEmailData = {
  to: string;
  buyerName: string | null;
  orderNumber: string;
  event: {
    title: string;
    startsAt: Date;
    endsAt: Date;
    location: string | null;
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
 * Format date in Dutch
 */
function formatDateNL(date: Date): string {
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/**
 * Generate ticket email HTML
 */
function generateTicketEmailHTML(data: TicketEmailData): string {
  const ticketRows = data.tickets
    .map((ticket) => {
      const qrDataUrl = generateQRData(ticket, data.baseUrl);
      const qrImageUrl = getQRImageUrl(qrDataUrl, 150);
      const appleWalletUrl = `${data.baseUrl}/api/wallet/apple/generate?ticketId=${encodeURIComponent(ticket.id)}`;

      return `
        <tr>
          <td style="padding: 20px; border-bottom: 1px solid #eee;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="160" style="vertical-align: top;">
                  <img src="${qrImageUrl}" alt="QR Code" width="150" height="150" style="display: block; border: 1px solid #ddd; border-radius: 8px;" />
                </td>
                <td style="vertical-align: top; padding-left: 20px;">
                  <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">
                    ${ticket.ticketTypeName}
                  </p>
                  <p style="margin: 0 0 4px 0; font-size: 14px; color: #666;">
                    Ticketcode: <strong style="font-family: monospace; color: #1a1a1a;">${ticket.code}</strong>
                  </p>
                  <p style="margin: 16px 0 8px 0; font-size: 12px; color: #999;">
                    Toon deze QR-code bij de ingang
                  </p>
                  <a href="${appleWalletUrl}" style="display: inline-block; margin-top: 8px; text-decoration: none;">
                    <img src="${data.baseUrl}/apple-wallet-badge.svg" alt="Add to Apple Wallet" style="height: 40px; width: 156px; display: block;" />
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Je tickets voor ${data.event.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                🎫 Je tickets zijn klaar!
              </h1>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 30px 20px 30px;">
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #333;">
                Hoi${data.buyerName ? ` ${data.buyerName}` : ""},
              </p>
              <p style="margin: 0; font-size: 16px; color: #666; line-height: 1.5;">
                Bedankt voor je bestelling! Hieronder vind je je ticket${data.tickets.length > 1 ? "s" : ""} voor:
              </p>
            </td>
          </tr>

          <!-- Event Info -->
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; padding: 20px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 10px 0; font-size: 20px; color: #1a1a1a;">
                      ${data.event.title}
                    </h2>
                    <p style="margin: 0 0 5px 0; font-size: 14px; color: #666;">
                      📅 ${formatDateNL(data.event.startsAt)}
                    </p>
                    ${data.event.location ? `
                    <p style="margin: 0; font-size: 14px; color: #666;">
                      📍 ${data.event.location}
                    </p>
                    ` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Tickets -->
          <tr>
            <td style="padding: 0 30px;">
              <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">
                Je ticket${data.tickets.length > 1 ? "s" : ""} (${data.tickets.length})
              </h3>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
                ${ticketRows}
              </table>
            </td>
          </tr>

          <!-- Order Info -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0; font-size: 12px; color: #999;">
                Bestelnummer: <strong>${data.orderNumber}</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
              <p style="margin: 0 0 5px 0; font-size: 12px; color: #999;">
                Bewaar deze e-mail goed. Je hebt de QR-codes nodig om binnen te komen.
              </p>
              <p style="margin: 0; font-size: 12px; color: #999;">
                © ${new Date().getFullYear()} Entro (getentro.app)
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text version of email
 */
function generateTicketEmailText(data: TicketEmailData): string {
  const ticketList = data.tickets
    .map((ticket) => {
      const appleWalletUrl = `${data.baseUrl}/api/wallet/apple/generate?ticketId=${encodeURIComponent(ticket.id)}`;
      return `- ${ticket.ticketTypeName} (Code: ${ticket.code})\n  Voeg toe aan Apple Wallet: ${appleWalletUrl}`;
    })
    .join("\n");

  return `
Je tickets voor ${data.event.title}

Hoi${data.buyerName ? ` ${data.buyerName}` : ""},

Bedankt voor je bestelling! Hieronder vind je je ticket${data.tickets.length > 1 ? "s" : ""}:

EVENEMENT
${data.event.title}
📅 ${formatDateNL(data.event.startsAt)}
${data.event.location ? `📍 ${data.event.location}` : ""}

TICKETS (${data.tickets.length})
${ticketList}

Bestelnummer: ${data.orderNumber}

Bewaar deze e-mail goed. Je hebt de ticketcodes nodig om binnen te komen.
Je kunt je tickets ook toevoegen aan Apple Wallet via de links hierboven.

© ${new Date().getFullYear()} Entro (getentro.app)
  `.trim();
}

/**
 * Send ticket email using Resend (or log in development)
 */
export async function sendTicketEmail(data: TicketEmailData): Promise<EmailResult> {
  const html = generateTicketEmailHTML(data);
  const text = generateTicketEmailText(data);
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
    orderNumber: string;
    buyerEmail: string;
    buyerName: string | null;
  },
  event: {
    title: string;
    startsAt: Date;
    endsAt: Date;
    location: string | null;
  },
  tickets: Array<TicketWithDetails>,
  baseUrl: string
): Promise<EmailResult> {
  return sendTicketEmail({
    to: order.buyerEmail,
    buyerName: order.buyerName,
    orderNumber: order.orderNumber,
    event,
    tickets: tickets.map((t) => ({
      id: t.id,
      code: t.code,
      secretToken: t.secretToken,
      ticketTypeName: t.ticketType.name,
    })),
    baseUrl,
  });
}
