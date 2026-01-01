import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/server/lib/supabase";
import { prisma } from "@/server/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Authenticate user
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get the invoice from database with pdfUrl
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: {
        id: true,
        organizationId: true,
        pdfUrl: true,
        invoiceNumber: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // 3. Verify user has access to the organization via membership
    const membership = await prisma.membership.findFirst({
      where: {
        userId: user.id,
        organizationId: invoice.organizationId,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!invoice.pdfUrl) {
      return NextResponse.json(
        { error: "Mollie pdfURL not available" },
        { status: 404 }
      );
    }

    // 4. Fetch PDF from Mollie Sales Invoice API
    const mollieResponse = await fetch(invoice.pdfUrl, {
      headers: {
        Authorization: `Bearer ${process.env.MOLLIE_API_KEY}`,
      },
    });

    if (!mollieResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch PDF from Mollie" },
        { status: mollieResponse.status }
      );
    }

    // 5. Get the PDF as an ArrayBuffer
    const pdfBuffer = await mollieResponse.arrayBuffer();

    // 6. Return PDF with proper headers
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error fetching invoice PDF:", error);

    return NextResponse.json(
      { error: "Failed to download invoice PDF" },
      { status: 500 }
    );
  }
}
