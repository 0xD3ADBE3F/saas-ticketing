/**
 * Mollie Invoice Service
 * Generic service for creating Mollie Sales Invoices
 */

import { mollieLogger } from "@/server/lib/logger";
import { env } from "@/server/lib/env";

const MOLLIE_API_URL = "https://api.mollie.com/v2";
const VAT_RATE = 21; // 21% VAT

/**
 * Format amount in cents to EUR string (e.g., 5500 → "55.00")
 */
export function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Calculate VAT amount from total (inclusive)
 */
export function calculateVATFromInclusive(
  totalInclVAT: number,
  vatRate = VAT_RATE
): {
  amountExclVAT: number;
  vatAmount: number;
} {
  const amountExclVAT = Math.round((totalInclVAT * 100) / (100 + vatRate));
  const vatAmount = totalInclVAT - amountExclVAT;
  return { amountExclVAT, vatAmount };
}

export interface MollieInvoiceRecipient {
  type: "business" | "consumer";
  // Business fields
  organizationName?: string;
  vatNumber?: string;
  organizationNumber?: string;
  // Consumer fields (Mollie uses givenName/familyName)
  givenName?: string;
  familyName?: string;
  // Common fields
  email: string;
  streetAndNumber: string;
  postalCode: string;
  city: string;
  country: string;
  locale?: string;
}

export interface MollieInvoiceLine {
  description: string;
  quantity: number;
  vatRate: string; // e.g., "21.00"
  unitPrice: {
    currency: "EUR";
    value: string; // e.g., "25.00"
  };
}

export interface CreateMollieInvoiceParams {
  recipientIdentifier: string; // Organization ID
  recipient: MollieInvoiceRecipient;
  lines: MollieInvoiceLine[];
  memo?: string;
  emailDetails?: {
    subject: string;
    body: string;
  };
  paymentTerm?: string; // e.g., "1 days", "30 days"
  markAsPaid?: boolean; // If true, immediately mark as paid
}

export interface MollieInvoiceResponse {
  id: string;
  invoiceNumber: string;
  status: string;
  issuedAt: string;
  dueAt?: string;
  _links?: {
    pdfLink?: {
      href: string;
    };
  };
}

/**
 * Create a Mollie Sales Invoice
 * Handles API call, error logging, and optionally marking as paid
 */
export async function createMollieSalesInvoice(
  params: CreateMollieInvoiceParams
): Promise<MollieInvoiceResponse> {
  const {
    recipientIdentifier,
    recipient,
    lines,
    memo,
    emailDetails,
    paymentTerm = "30 days",
    markAsPaid = false,
  } = params;

  mollieLogger.info(
    {
      recipientIdentifier,
      linesCount: lines.length,
      markAsPaid,
    },
    "Creating Mollie sales invoice"
  );

  // Create invoice
  const createResponse = await fetch(`${MOLLIE_API_URL}/sales-invoices`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.MOLLIE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status: "issued",
      paymentTerm,
      vatScheme: "standard",
      vatMode: "exclusive", // Apply VAT on top of amount
      recipientIdentifier,
      recipient,
      lines,
      ...(memo && { memo }),
      ...(emailDetails && { emailDetails }),
    }),
  });

  if (!createResponse.ok) {
    const errorData = await createResponse.json().catch(() => ({}));
    mollieLogger.error(
      {
        status: createResponse.status,
        statusText: createResponse.statusText,
        error: errorData,
        recipientIdentifier,
      },
      "Mollie API error when creating sales invoice"
    );
    throw new Error(
      `Mollie API error: ${createResponse.status} ${createResponse.statusText} - ${JSON.stringify(errorData)}`
    );
  }

  const mollieInvoice: MollieInvoiceResponse = await createResponse.json();

  mollieLogger.info(
    {
      mollieInvoiceId: mollieInvoice.id,
      invoiceNumber: mollieInvoice.invoiceNumber,
      recipientIdentifier,
    },
    "Mollie sales invoice created successfully"
  );

  // Mark as paid if requested
  if (markAsPaid) {
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
      mollieLogger.error(
        {
          status: updateResponse.status,
          error: errorData,
          invoiceId: mollieInvoice.id,
        },
        "Failed to mark Mollie invoice as paid"
      );
      // Don't throw - continue with issued status
    } else {
      mollieLogger.info(
        { invoiceId: mollieInvoice.id },
        "Mollie invoice marked as paid"
      );
      mollieInvoice.status = "paid";
    }
  }

  return mollieInvoice;
}
