/**
 * Service layer for Mollie Sales Invoice integration
 * Handles invoice creation, retrieval, and management via Mollie Sales Invoice API
 *
 * Note: Using Mollie Sales Invoice API (Beta) to generate formal invoices for
 * organization subscription payments. This is distinct from Mollie's Invoices API
 * which shows Mollie's invoices TO merchants.
 *
 * IMPORTANT: This service uses the PLATFORM Mollie account (MOLLIE_API_KEY), NOT
 * organization OAuth tokens. Invoices are FROM Entro TO organizations.
 */

import { invoiceRepo, type CreateInvoiceData } from "@/server/repos/invoiceRepo";
import type { SubscriptionInvoice, InvoiceType, InvoiceStatus } from "@/generated/prisma";
import { mollieLogger } from "@/server/lib/logger";
import { env } from "@/server/lib/env";
import { prisma } from "@/server/lib/prisma";

const MOLLIE_API_URL = "https://api.mollie.com/v2";
const VAT_RATE = 21; // Dutch VAT rate (21%)

export interface CreateSalesInvoiceParams {
  organizationId: string;
  subscriptionId?: string;
  type: InvoiceType;
  amount: number; // in cents
  description: string;
  molliePaymentId?: string;
  invoiceDate?: Date;
}

export interface MollieSalesInvoiceLine {
  description: string;
  quantity: number;
  unitPrice: {
    currency: string;
    value: string; // e.g., "49.00"
  };
  vatRate: string; // e.g., "21.00"
  totalAmount: {
    currency: string;
    value: string;
  };
}

export interface MollieSalesInvoiceResponse {
  id: string; // inv_xxxx
  invoiceNumber: string; // Mollie-generated invoice number (e.g., "2025.0001")
  reference?: string; // Optional custom reference
  issuedAt: string; // ISO date
  dueAt?: string;
  status: string;
  pdfUrl?: string;
  lines: MollieSalesInvoiceLine[];
  _links?: {
    pdfLink?: {
      href: string;
    };
  };
}

/**
 * Format amount in cents to EUR string (e.g., 4900 → "49.00")
 */
function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Create a Sales Invoice via Mollie API
 *
 * This function calls the Mollie Sales Invoice API (Beta) to generate a formal invoice.
 * Uses the platform's MOLLIE_API_KEY, not organization OAuth tokens.
 */
export async function createSalesInvoice(
  params: CreateSalesInvoiceParams
): Promise<SubscriptionInvoice> {
  const { organizationId, subscriptionId, type, amount, description, molliePaymentId, invoiceDate } = params;

  mollieLogger.info({
    message: "Creating Mollie Sales Invoice",
    organizationId,
    type,
    amount,
  });

  try {
    // Check if invoice already exists for this payment (idempotency)
    if (molliePaymentId) {
      const existing = await invoiceRepo.findByMolliePaymentId(molliePaymentId);
      if (existing) {
        mollieLogger.info({
          message: "Invoice already exists for this payment",
          invoiceId: existing.id,
          molliePaymentId,
        });
        return existing;
      }
    }

    // Fetch organization details for recipient
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        email: true,
        kvkNumber: true,
        streetAddress: true,
        postalCode: true,
        city: true,
        country: true,
      },
    });

    if (!organization) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    if (!organization.email) {
      throw new Error(`Organization ${organizationId} has no email address`);
    }

    if (!organization.kvkNumber) {
      throw new Error(
        `Organization ${organizationId} has no KVK number. KVK number is required for invoice generation.`
      );
    }

    // Validate required address fields
    if (!organization.streetAddress || !organization.postalCode || !organization.city) {
      throw new Error(
        `Organization ${organizationId} is missing required address information. Please complete your organization details in Settings.`
      );
    }

    // Calculate VAT and net amount
    const netAmount = Math.round(amount / (1 + VAT_RATE / 100)); // Reverse calculate net from gross
    const vatAmount = amount - netAmount;

    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 14); // 14 days payment term

    // Call Mollie Sales Invoice API
    const mollieResponse = await fetch(`${MOLLIE_API_URL}/sales-invoices`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.MOLLIE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "paid", // Mark as paid immediately since subscription payment already succeeded
        paymentTerm: "14 days",
        recipientIdentifier: organizationId,
        recipient: {
          type: "business",
          organizationName: organization.name,
          organizationNumber: organization.kvkNumber, // Dutch Chamber of Commerce (KVK) number
          email: organization.email,
          streetAndNumber: organization.streetAddress,
          postalCode: organization.postalCode,
          city: organization.city,
          country: organization.country || "NL",
          locale: "nl_NL",
        },
        lines: [
          {
            description,
            quantity: 1,
            vatRate: VAT_RATE.toFixed(2),
            unitPrice: {
              currency: "EUR",
              value: formatAmount(netAmount), // Net amount without VAT
            },
          },
        ],
        paymentDetails: {
          source: "payment",
          sourceReference: molliePaymentId,
        },
      }),
    });

    if (!mollieResponse.ok) {
      const errorData = await mollieResponse.json().catch(() => ({}));
      throw new Error(
        `Mollie API error: ${mollieResponse.status} ${mollieResponse.statusText} - ${JSON.stringify(errorData)}`
      );
    }

    const mollieInvoice = await mollieResponse.json();

    // Store invoice in database using Mollie-generated invoice number
    const invoice = await invoiceRepo.create({
      organizationId,
      subscriptionId,
      type,
      invoiceNumber: mollieInvoice.invoiceNumber, // Use Mollie's generated invoice number
      invoiceDate: invoiceDate || now,
      dueDate,
      amount,
      vatAmount,
      vatRate: VAT_RATE,
      currency: "EUR",
      status: "PAID", // Marked as paid since payment already succeeded
      molliePaymentId,
      description,
      mollieSalesInvoiceId: mollieInvoice.id,
      pdfUrl: mollieInvoice._links?.pdfLink?.href,
    });

    mollieLogger.info({
      message: "Invoice created successfully via Mollie API",
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      mollieSalesInvoiceId: mollieInvoice.id,
      amount: invoice.amount,
    });

    return invoice;
  } catch (error) {
    mollieLogger.error({
      message: "Failed to create Sales Invoice",
      organizationId,
      type,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
    });
    throw error;
  }
}

/**
 * Store invoice record in database
 */
export async function storeInvoiceRecord(data: CreateInvoiceData): Promise<SubscriptionInvoice> {
  return invoiceRepo.create(data);
}

/**
 * Get invoice by ID (with organization scoping)
 */
export async function getInvoice(
  invoiceId: string,
  organizationId: string
): Promise<SubscriptionInvoice | null> {
  return invoiceRepo.findById(invoiceId, organizationId);
}

/**
 * List invoices for organization with filters
 */
export async function listInvoicesForOrg(
  organizationId: string,
  filters?: {
    type?: InvoiceType;
    status?: InvoiceStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }
) {
  return invoiceRepo.listInvoicesWithFilters(organizationId, filters);
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(
  invoiceId: string,
  organizationId: string,
  status: InvoiceStatus
): Promise<SubscriptionInvoice> {
  return invoiceRepo.updateStatus(invoiceId, organizationId, status);
}

/**
 * Mark invoice as paid (links to Mollie payment)
 */
export async function markInvoiceAsPaid(
  invoiceId: string,
  organizationId: string,
  molliePaymentId: string,
  paidAt?: Date
): Promise<SubscriptionInvoice> {
  mollieLogger.info({
    message: "Marking invoice as paid",
    invoiceId,
    molliePaymentId,
  });

  return invoiceRepo.markAsPaid(invoiceId, organizationId, molliePaymentId, paidAt || new Date());
}

/**
 * Generate invoice after subscription payment
 * Called from subscription webhook after successful payment
 */
export async function generateSubscriptionInvoice(params: {
  organizationId: string;
  subscriptionId: string;
  plan: string;
  amount: number; // in cents
  molliePaymentId: string;
}): Promise<SubscriptionInvoice> {
  const { organizationId, subscriptionId, plan, amount, molliePaymentId } = params;

  const now = new Date();
  const monthName = now.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
  const description = `${plan} Subscription - ${monthName}`;

  // Create invoice via Mollie API (already marked as paid)
  const invoice = await createSalesInvoice({
    organizationId,
    subscriptionId,
    type: "SUBSCRIPTION",
    amount,
    description,
    molliePaymentId,
  });

  return invoice;
}

/**
 * Generate invoice after Pay-Per-Event payment
 * Called from payment webhook after successful event payment
 */
export async function generateEventInvoice(params: {
  organizationId: string;
  eventTitle: string;
  amount: number; // in cents (should be 4900 = €49)
  molliePaymentId: string;
}): Promise<SubscriptionInvoice> {
  const { organizationId, eventTitle, amount, molliePaymentId } = params;

  const description = `Event Publishing Fee - ${eventTitle}`;

  // Create invoice via Mollie API (already marked as paid)
  const invoice = await createSalesInvoice({
    organizationId,
    type: "PAY_PER_EVENT",
    amount,
    description,
    molliePaymentId,
  });

  return invoice;
}

export const mollieInvoiceService = {
  createSalesInvoice,
  storeInvoiceRecord,
  getInvoice,
  listInvoicesForOrg,
  updateInvoiceStatus,
  markInvoiceAsPaid,
  generateSubscriptionInvoice,
  generateEventInvoice,
};
