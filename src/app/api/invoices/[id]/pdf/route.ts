import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/server/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Authenticate user
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // 2. Get the invoice from database with pdfUrl
    const { data: invoice, error: invoiceError } = await supabase
      .from("subscription_invoices")
      .select("id, organizationId, pdfUrl, invoiceNumber")
      .eq("id", id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // 3. Verify user has access to the organization via membership
    const { data: membership, error: membershipError } = await supabase
      .from("memberships")
      .select("id")
      .eq("userId", user.id)
      .eq("organizationId", invoice.organizationId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
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
