/**
 * API endpoint for generating a platform fee invoice for a specific event
 * POST /api/events/[id]/generate-invoice
 *
 * Requires: User must be admin of the event's organization
 */

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/server/lib/supabase";
import { prisma } from "@/server/lib/prisma";
import { platformFeeInvoiceService } from "@/server/services/platformFeeInvoiceService";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // 1. Authenticate user
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get event and verify organization membership
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organization: {
          include: {
            memberships: {
              where: {
                userId: user.id,
                role: "ADMIN",
              },
            },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.organization.memberships.length === 0) {
      return NextResponse.json(
        { error: "You do not have permission to generate invoices for this event" },
        { status: 403 }
      );
    }

    // 3. Generate invoice
    const invoice = await platformFeeInvoiceService.generateEventInvoice(id);

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice could not be generated (possibly zero platform fee)" },
        { status: 400 }
      );
    }

    // 4. Return success
    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        vatAmount: invoice.vatAmount,
        status: invoice.status,
        pdfUrl: invoice.pdfUrl,
      },
    });
  } catch (error) {
    console.error("Failed to generate invoice:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate invoice",
      },
      { status: 500 }
    );
  }
}
