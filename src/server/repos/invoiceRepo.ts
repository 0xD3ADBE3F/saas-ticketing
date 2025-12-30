/**
 * Repository layer for SubscriptionInvoice operations
 * Handles database access with organization scoping
 */

import { prisma } from "@/server/lib/prisma";
import type {
  SubscriptionInvoice,
  InvoiceType,
  InvoiceStatus,
  Prisma,
} from "@/generated/prisma";

export interface CreateInvoiceData {
  organizationId: string;
  subscriptionId?: string;
  type: InvoiceType;
  mollieSalesInvoiceId?: string;
  invoiceNumber?: string;
  invoiceDate: Date;
  dueDate?: Date;
  amount: number; // in cents
  vatAmount: number; // in cents
  vatRate: number; // e.g., 21 for 21%
  currency?: string;
  status?: InvoiceStatus;
  molliePaymentId?: string;
  paidAt?: Date;
  pdfUrl?: string;
  description?: string;
}

export interface InvoiceFilters {
  type?: InvoiceType;
  status?: InvoiceStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * Create a new invoice
 */
export async function create(
  data: CreateInvoiceData
): Promise<SubscriptionInvoice> {
  return prisma.subscriptionInvoice.create({
    data: {
      organizationId: data.organizationId,
      subscriptionId: data.subscriptionId,
      type: data.type,
      mollieSalesInvoiceId: data.mollieSalesInvoiceId,
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate,
      amount: data.amount,
      vatAmount: data.vatAmount,
      vatRate: data.vatRate,
      currency: data.currency,
      status: data.status,
      molliePaymentId: data.molliePaymentId,
      paidAt: data.paidAt,
      pdfUrl: data.pdfUrl,
      description: data.description,
    },
  });
}

/**
 * Find invoice by ID (with organization scoping)
 */
export async function findById(
  id: string,
  organizationId: string
): Promise<SubscriptionInvoice | null> {
  return prisma.subscriptionInvoice.findFirst({
    where: {
      id,
      organizationId,
    },
    include: {
      subscription: true,
    },
  });
}

/**
 * Find invoice by Mollie Sales Invoice ID
 */
export async function findByMollieSalesInvoiceId(
  mollieSalesInvoiceId: string
): Promise<SubscriptionInvoice | null> {
  return prisma.subscriptionInvoice.findUnique({
    where: {
      mollieSalesInvoiceId,
    },
  });
}

/**
 * Find invoice by Mollie Payment ID (to prevent duplicates)
 */
export async function findByMolliePaymentId(
  molliePaymentId: string
): Promise<SubscriptionInvoice | null> {
  return prisma.subscriptionInvoice.findUnique({
    where: {
      molliePaymentId,
    },
  });
}

/**
 * List invoices for an organization with filters and pagination
 */
export async function listInvoicesWithFilters(
  organizationId: string,
  filters?: InvoiceFilters
): Promise<{
  invoices: SubscriptionInvoice[];
  total: number;
  page: number;
  limit: number;
}> {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: Prisma.SubscriptionInvoiceWhereInput = {
    organizationId,
    ...(filters?.type && { type: filters.type }),
    ...(filters?.status && { status: filters.status }),
    ...(filters?.startDate &&
      filters?.endDate && {
        invoiceDate: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      }),
    ...(filters?.startDate &&
      !filters?.endDate && {
        invoiceDate: {
          gte: filters.startDate,
        },
      }),
    ...(!filters?.startDate &&
      filters?.endDate && {
        invoiceDate: {
          lte: filters.endDate,
        },
      }),
  };

  const [invoices, total] = await Promise.all([
    prisma.subscriptionInvoice.findMany({
      where,
      orderBy: {
        invoiceDate: "desc",
      },
      skip,
      take: limit,
      include: {
        subscription: {
          select: {
            plan: true,
          },
        },
      },
    }),
    prisma.subscriptionInvoice.count({ where }),
  ]);

  return {
    invoices,
    total,
    page,
    limit,
  };
}

/**
 * Update invoice status
 */
export async function updateStatus(
  id: string,
  organizationId: string,
  status: InvoiceStatus
): Promise<SubscriptionInvoice> {
  return prisma.subscriptionInvoice.update({
    where: {
      id,
      organizationId,
    },
    data: {
      status,
      updatedAt: new Date(),
    },
  });
}

/**
 * Mark invoice as paid
 */
export async function markAsPaid(
  id: string,
  organizationId: string,
  molliePaymentId: string,
  paidAt: Date
): Promise<SubscriptionInvoice> {
  return prisma.subscriptionInvoice.update({
    where: {
      id,
      organizationId,
    },
    data: {
      status: "PAID",
      molliePaymentId,
      paidAt,
      updatedAt: new Date(),
    },
  });
}

/**
 * Update PDF URL
 */
export async function updatePdfUrl(
  id: string,
  organizationId: string,
  pdfUrl: string
): Promise<SubscriptionInvoice> {
  return prisma.subscriptionInvoice.update({
    where: {
      id,
      organizationId,
    },
    data: {
      pdfUrl,
      updatedAt: new Date(),
    },
  });
}

/**
 * Generate next invoice number for organization
 * Format: YYYY-NNNN (e.g., 2025-0001)
 */
export async function generateInvoiceNumber(
  organizationId: string
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;

  // Get the latest invoice number for this organization in this year
  const latestInvoice = await prisma.subscriptionInvoice.findFirst({
    where: {
      organizationId,
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: "desc",
    },
    select: {
      invoiceNumber: true,
    },
  });

  if (!latestInvoice?.invoiceNumber) {
    return `${prefix}0001`;
  }

  // Extract the numeric part and increment
  const numericPart = latestInvoice.invoiceNumber.split("-")[1];
  const nextNumber = parseInt(numericPart || "0", 10) + 1;

  return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
}

export const invoiceRepo = {
  create,
  findById,
  findByMollieSalesInvoiceId,
  findByMolliePaymentId,
  listInvoicesWithFilters,
  updateStatus,
  markAsPaid,
  updatePdfUrl,
  generateInvoiceNumber,
};
