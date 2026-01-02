/**
 * Email service for invoice notifications
 * Sends emails when invoices are created, paid, or overdue
 */

import { Resend } from "resend";
import { env } from "@/server/lib/env";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import type { Invoice } from "@/generated/prisma";
import { mollieLogger } from "@/server/lib/logger";

const resend = new Resend(env.RESEND_API_KEY);

interface SendInvoiceEmailParams {
  invoice: Invoice;
  organizationName: string;
  organizationEmail: string;
  eventTitle?: string;
  ticketsSold?: number;
  grossRevenue?: number;
}

/**
 * Send email when a new invoice is created
 */
export async function sendInvoiceCreatedEmail(
  params: SendInvoiceEmailParams
): Promise<void> {
  const {
    invoice,
    organizationName,
    organizationEmail,
    eventTitle,
    ticketsSold,
    grossRevenue,
  } = params;

  const totalAmount = invoice.amount + invoice.vatAmount;

  try {
    const { data, error } = await resend.emails.send({
      from: "Entro <billing@getentro.app>",
      to: organizationEmail,
      subject: `New Invoice - ${invoice.invoiceNumber}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Invoice from Entro</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
    <h1 style="color: #4f46e5; margin: 0 0 10px 0;">Entro</h1>
    <h2 style="color: #1f2937; margin: 0;">New Invoice Available</h2>
  </div>

  <div style="background-color: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 10px; margin-bottom: 30px;">
    <p style="font-size: 16px; color: #1f2937; margin-top: 0;">
      Hi ${organizationName},
    </p>

    <p style="font-size: 16px; color: #374151;">
      Your invoice ${eventTitle ? `for <strong>${eventTitle}</strong>` : ""} is now available.
    </p>

    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Invoice Number:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right;">${invoice.invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Invoice Date:</td>
          <td style="padding: 8px 0; text-align: right;">${formatDate(invoice.invoiceDate)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Due Date:</td>
          <td style="padding: 8px 0; text-align: right;">${invoice.dueDate ? formatDate(invoice.dueDate) : "Upon receipt"}</td>
        </tr>
        ${ticketsSold ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Tickets Sold:</td>
          <td style="padding: 8px 0; text-align: right;">${ticketsSold}</td>
        </tr>
        ` : ""}
        ${grossRevenue ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Gross Revenue:</td>
          <td style="padding: 8px 0; text-align: right;">${formatCurrency(grossRevenue)}</td>
        </tr>
        ` : ""}
        <tr style="border-top: 2px solid #e5e7eb;">
          <td style="padding: 12px 0 0 0; color: #1f2937; font-weight: 600; font-size: 18px;">Total Amount:</td>
          <td style="padding: 12px 0 0 0; font-weight: 600; font-size: 18px; text-align: right; color: #4f46e5;">${formatCurrency(totalAmount)}</td>
        </tr>
        <tr>
          <td style="padding: 0; color: #9ca3af; font-size: 13px;" colspan="2">
            (incl. ${formatCurrency(invoice.vatAmount)} VAT)
          </td>
        </tr>
      </table>
    </div>

    ${invoice.pdfUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${invoice.pdfUrl}"
         style="display: inline-block; background-color: #4f46e5; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        View Invoice PDF
      </a>
    </div>
    ` : ""}

    <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">
      The invoice has been sent to your registered billing email address. You can also view all your invoices in the dashboard under <strong>Instellingen → Facturatie</strong>.
    </p>
  </div>

  <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; font-size: 13px; color: #6b7280; text-align: center;">
    <p style="margin: 0;">
      Questions about this invoice? Contact us at <a href="mailto:support@getentro.app" style="color: #4f46e5; text-decoration: none;">support@getentro.app</a>
    </p>
    <p style="margin: 10px 0 0 0;">
      © ${new Date().getFullYear()} Entro. All rights reserved.
    </p>
  </div>

</body>
</html>
      `,
    });

    if (error) {
      throw error;
    }

    mollieLogger.info({
      message: "Invoice created email sent successfully",
      invoiceId: invoice.id,
      to: organizationEmail,
      emailId: data?.id,
    });
  } catch (error) {
    mollieLogger.error({
      message: "Failed to send invoice created email",
      invoiceId: invoice.id,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - email failure shouldn't break invoice creation
  }
}

/**
 * Send email when an invoice is paid
 */
export async function sendInvoicePaidEmail(
  params: SendInvoiceEmailParams
): Promise<void> {
  const { invoice, organizationName, organizationEmail } = params;

  const totalAmount = invoice.amount + invoice.vatAmount;

  try {
    const { data, error } = await resend.emails.send({
      from: "Entro <billing@getentro.app>",
      to: organizationEmail,
      subject: `Payment Received - ${invoice.invoiceNumber}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="background-color: #f0fdf4; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
    <h1 style="color: #16a34a; margin: 0 0 10px 0;">✓ Payment Received</h1>
    <h2 style="color: #1f2937; margin: 0;">Thank you for your payment!</h2>
  </div>

  <div style="background-color: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 10px; margin-bottom: 30px;">
    <p style="font-size: 16px; color: #1f2937; margin-top: 0;">
      Hi ${organizationName},
    </p>

    <p style="font-size: 16px; color: #374151;">
      We have received your payment for invoice <strong>${invoice.invoiceNumber}</strong>.
    </p>

    <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #16a34a;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #16a34a; font-weight: 600;">Amount Paid:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right; color: #16a34a; font-size: 18px;">${formatCurrency(totalAmount)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Payment Date:</td>
          <td style="padding: 8px 0; text-align: right;">${invoice.paidAt ? formatDate(invoice.paidAt) : formatDate(new Date())}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Invoice Number:</td>
          <td style="padding: 8px 0; text-align: right;">${invoice.invoiceNumber}</td>
        </tr>
      </table>
    </div>

    ${invoice.pdfUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${invoice.pdfUrl}"
         style="display: inline-block; background-color: #4f46e5; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Download Receipt
      </a>
    </div>
    ` : ""}

    <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">
      A receipt has been sent to your email. You can also view all your invoices in the dashboard.
    </p>
  </div>

  <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; font-size: 13px; color: #6b7280; text-align: center;">
    <p style="margin: 0;">
      Questions? Contact us at <a href="mailto:support@getentro.app" style="color: #4f46e5; text-decoration: none;">support@getentro.app</a>
    </p>
    <p style="margin: 10px 0 0 0;">
      © ${new Date().getFullYear()} Entro. All rights reserved.
    </p>
  </div>

</body>
</html>
      `,
    });

    if (error) {
      throw error;
    }

    mollieLogger.info({
      message: "Invoice paid email sent successfully",
      invoiceId: invoice.id,
      to: organizationEmail,
      emailId: data?.id,
    });
  } catch (error) {
    mollieLogger.error({
      message: "Failed to send invoice paid email",
      invoiceId: invoice.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export const invoiceEmailService = {
  sendInvoiceCreatedEmail,
  sendInvoicePaidEmail,
};
