/**
 * Platform Fee Invoice Service
 * Generates invoices for platform fees after events end
 */

import { prisma } from "@/server/lib/prisma";
import { payoutService } from "@/server/services/payoutService";
import { invoiceRepo } from "@/server/repos/invoiceRepo";
import { invoiceEmailService } from "@/server/services/invoiceEmailService";
import { mollieLogger } from "@/server/lib/logger";
import type { Invoice } from "@/generated/prisma";
import { env } from "@/server/lib/env";

const MOLLIE_API_URL = "https://api.mollie.com/v2";
const VAT_RATE = 21; // 21% VAT on platform fees

/**
 * Format amount in cents to EUR string (e.g., 5500 → "55.00")
 */
function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Calculate VAT amount from total (inclusive)
 */
function calculateVATFromInclusive(totalInclVAT: number, vatRate = VAT_RATE): {
  amountExclVAT: number;
  vatAmount: number;
} {
  const amountExclVAT = Math.round((totalInclVAT * 100) / (100 + vatRate));
  const vatAmount = totalInclVAT - amountExclVAT;
  return { amountExclVAT, vatAmount };
}

/**
 * Generate platform fee invoice for a completed event
 * This creates a Mollie Sales Invoice and stores it in our database
 */
export async function generateEventInvoice(eventId: string): Promise<Invoice | null> {
  mollieLogger.info({
    message: "Generating platform fee invoice",
    eventId,
  });

  try {
    // 1. Fetch event details
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            email: true,
            vatNumber: true,
            streetAndNumber: true,
            postalCode: true,
            city: true,
            country: true,
          },
        },
      },
    });

    if (!event) {
      mollieLogger.error({
        message: "Event not found",
        eventId,
      });
      return null;
    }

    if (event.status !== "ENDED") {
      mollieLogger.info({
        message: "Event has not ended yet, skipping invoice generation",
        eventId,
        status: event.status,
      });
      return null;
    }

    // 2. Check for existing invoice
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        eventId,
        type: "PLATFORM_FEE",
      },
    });

    if (existingInvoice) {
      mollieLogger.info({
        message: "Invoice already exists for this event",
        eventId,
        invoiceId: existingInvoice.id,
      });
      return existingInvoice;
    }

    // 3. Calculate platform fee breakdown
    const breakdown = await payoutService.getEventPayoutBreakdown(
      eventId,
      event.organizationId
    );

    if (!breakdown) {
      mollieLogger.error({
        message: "Could not calculate payout breakdown",
        eventId,
      });
      return null;
    }

    // Skip if platform fee is zero (free event or no sales)
    if (breakdown.platformFee === 0) {
      mollieLogger.info({
        message: "Platform fee is zero, skipping invoice",
        eventId,
        ticketsSold: breakdown.ticketsSold,
      });
      return null;
    }

    // 4. Validate organization billing info
    const org = event.organization;
    const billingEmail = org.email;
    if (!billingEmail) {
      mollieLogger.error({
        message: "Organization missing email",
        organizationId: event.organizationId,
        eventId,
      });
      throw new Error(
        `Organization ${event.organizationId} is missing billing email. Please complete billing information in Settings.`
      );
    }

    if (
      !org.streetAndNumber ||
      !org.postalCode ||
      !org.city
    ) {
      mollieLogger.error({
        message: "Organization missing address",
        organizationId: event.organizationId,
        eventId,
      });
      throw new Error(
        `Organization ${event.organizationId} is missing billing address. Please complete billing information in Settings.`
      );
    }

    // 5. Calculate VAT (platform fee is VAT-inclusive)
    const { amountExclVAT, vatAmount } = calculateVATFromInclusive(
      breakdown.platformFee,
      VAT_RATE
    );

    // 6. Format event date
    const eventDate = new Date(event.endsAt).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const description = `Platform fees - ${event.title} (${eventDate})`;

    // 7. Create Sales Invoice via Mollie API
    const mollieResponse = await fetch(`${MOLLIE_API_URL}/sales-invoices`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.MOLLIE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "issued", // Issue first, then mark as paid
        paymentTerm: "1 days", // 1 day (minimum allowed)
        vatScheme: "standard",
        vatMode: "exclusive", // Apply VAT on top of amount
        recipientIdentifier: event.organizationId,
        recipient: {
          type: "business",
          organizationName: org.name,
          ...(org.vatNumber && { vatNumber: org.vatNumber }),
          email: billingEmail,
          streetAndNumber: org.streetAndNumber,
          postalCode: org.postalCode,
          city: org.city,
          country: org.country || "NL",
          locale: "nl_NL",
        },
        lines: [
          {
            description: `Platform service fees for ${event.title}`,
            quantity: 1,
            vatRate: "21.00",
            unitPrice: {
              currency: "EUR",
              value: formatAmount(amountExclVAT),
            },
          },
        ],
        memo: `Event: ${event.title}\nDate: ${eventDate}\nTickets sold: ${breakdown.ticketsSold}\nGross revenue: €${formatAmount(breakdown.grossRevenue)}`,
        emailDetails: {
          subject: `Invoice for ${event.title} - Entro Platform Fees`,
          body: `Dear ${org.name},\n\nThank you for using Entro for your event "${event.title}"!\n\nPlease find your invoice for the platform service fees attached. The invoice covers ${breakdown.ticketsSold} tickets sold, with a total gross revenue of €${formatAmount(breakdown.grossRevenue)}.\n\nPayment is due within 30 days from the invoice date.\n\nIf you have any questions about this invoice, please don't hesitate to contact our support team.\n\nBest regards,\nThe Entro Team`,
        },
      }),
    });

    if (!mollieResponse.ok) {
      const errorData = await mollieResponse.json().catch(() => ({}));
      mollieLogger.error({
        message: "Mollie API error when creating sales invoice",
        status: mollieResponse.status,
        statusText: mollieResponse.statusText,
        error: errorData,
        eventId,
      });
      throw new Error(
        `Mollie API error: ${mollieResponse.status} ${mollieResponse.statusText} - ${JSON.stringify(errorData)}`
      );
    }

    const mollieInvoice = await mollieResponse.json();

    mollieLogger.info({
      message: "Mollie sales invoice created successfully",
      mollieInvoiceId: mollieInvoice.id,
      invoiceNumber: mollieInvoice.invoiceNumber,
      eventId,
    });

    // 7.5. Mark invoice as paid in Mollie (separate PATCH request)
    const updateResponse = await fetch(
      `${MOLLIE_API_URL}/sales-invoices/${mollieInvoice.id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${env.MOLLIE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "paid",
          paymentDetails: {
            source: "manual",
          },
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json().catch(() => ({}));
      mollieLogger.error({
        message: "Failed to mark Mollie invoice as paid",
        status: updateResponse.status,
        error: errorData,
        invoiceId: mollieInvoice.id,
      });
      // Don't throw - continue with issued status
    } else {
      mollieLogger.info({
        message: "Mollie invoice marked as paid",
        invoiceId: mollieInvoice.id,
      });
    }

    // 8. Store invoice in database
    const invoice = await invoiceRepo.create({
      organizationId: event.organizationId,
      eventId,
      type: "PLATFORM_FEE",
      mollieSalesInvoiceId: mollieInvoice.id,
      invoiceNumber: mollieInvoice.invoiceNumber,
      invoiceDate: mollieInvoice.issuedAt
        ? new Date(mollieInvoice.issuedAt)
        : new Date(),
      dueDate: mollieInvoice.dueAt ? new Date(mollieInvoice.dueAt) : undefined,
      amount: amountExclVAT,
      vatAmount,
      vatRate: VAT_RATE,
      currency: "EUR",
      status: "PAID", // Fees already collected from transactions
      paidAt: new Date(), // Mark as paid immediately
      pdfUrl: mollieInvoice._links?.pdfLink?.href,
      description,
    });

    mollieLogger.info({
      message: "Platform fee invoice generated successfully",
      invoiceId: invoice.id,
      eventId,
      organizationId: event.organizationId,
      amount: amountExclVAT,
      vatAmount,
      platformFee: breakdown.platformFee,
    });

    // 9. Send email notification to organization
    try {
      await invoiceEmailService.sendInvoiceCreatedEmail({
        invoice,
        organizationName: org.name,
        organizationEmail: billingEmail,
        eventTitle: event.title,
        ticketsSold: breakdown.ticketsSold,
        grossRevenue: breakdown.grossRevenue,
      });
    } catch (emailError) {
      // Log but don't throw - email failure shouldn't break invoice creation
      mollieLogger.error({
        message: "Failed to send invoice email (invoice created successfully)",
        invoiceId: invoice.id,
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }

    return invoice;
  } catch (error) {
    mollieLogger.error({
      message: "Failed to generate platform fee invoice",
      eventId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Generate invoices for all events that ended without an invoice
 * This is called by the cronjob
 */
export async function generateMissingInvoices(): Promise<Invoice[]> {
  mollieLogger.info({
    message: "Generating missing platform fee invoices for all ended events",
  });

  // Find ALL events that have ended with no invoice
  const eventsNeedingInvoices = await prisma.event.findMany({
    where: {
      status: "ENDED",
      // No existing platform fee invoice
      invoices: {
        none: {
          type: "PLATFORM_FEE",
        },
      },
    },
    select: {
      id: true,
      title: true,
      organizationId: true,
      endsAt: true,
    },
  });

  mollieLogger.info({
    message: "Found events needing invoices",
    count: eventsNeedingInvoices.length,
    events: eventsNeedingInvoices.map((e) => ({
      id: e.id,
      title: e.title,
      endsAt: e.endsAt,
    })),
  });

  const generatedInvoices: Invoice[] = [];
  const errors: Array<{ eventId: string; error: string }> = [];

  for (const event of eventsNeedingInvoices) {
    try {
      const invoice = await generateEventInvoice(event.id);
      if (invoice) {
        generatedInvoices.push(invoice);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        eventId: event.id,
        error: errorMessage,
      });
      mollieLogger.error({
        message: "Failed to generate invoice for event",
        eventId: event.id,
        eventTitle: event.title,
        error: errorMessage,
      });
      // Continue with other events even if one fails
    }
  }

  mollieLogger.info({
    message: "Invoice generation batch complete",
    total: eventsNeedingInvoices.length,
    successful: generatedInvoices.length,
    failed: errors.length,
    errors,
  });

  return generatedInvoices;
}

export const platformFeeInvoiceService = {
  generateEventInvoice,
  generateMissingInvoices,
};
