#!/usr/bin/env tsx
/**
 * Manual test script for Mollie Sales Invoice API integration
 *
 * This script tests the invoice creation flow without triggering a real payment.
 * It creates a test organization and simulates invoice generation.
 *
 * Run: npx tsx scripts/test-invoice-api.ts
 */

// Load environment variables first
import { config } from "dotenv";
config();

import { prisma } from "@/server/lib/prisma";
import { mollieInvoiceService } from "@/server/services/mollieInvoiceService";

async function main() {
  console.log("🧪 Testing Mollie Sales Invoice API integration...\n");

  // Find or create a test organization
  let testOrg = await prisma.organization.findFirst({
    where: { name: "Test Organization for Invoices" },
  });

  if (!testOrg) {
    console.log("Creating test organization...");
    testOrg = await prisma.organization.create({
      data: {
        name: "Test Organization for Invoices",
        email: "test-invoices@entro.nl",
        slug: "test-invoices-" + Date.now(),
      },
    });
    console.log(`✅ Created test org: ${testOrg.id}\n`);
  } else {
    console.log(`✅ Using existing test org: ${testOrg.id}\n`);
  }

  // Find or create a test subscription
  let subscription = await prisma.subscription.findFirst({
    where: { organizationId: testOrg.id },
  });

  if (!subscription) {
    console.log("Creating test subscription...");
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    subscription = await prisma.subscription.create({
      data: {
        organizationId: testOrg.id,
        plan: "PROFESSIONAL",
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });
    console.log(`✅ Created test subscription: ${subscription.id}\n`);
  } else {
    console.log(`✅ Using existing subscription: ${subscription.id}\n`);
  }

  // Test invoice generation
  console.log("📄 Generating invoice via Mollie API...");
  console.log("   Organization:", testOrg.name);
  console.log("   Email:", testOrg.email);
  console.log("   Plan: PROFESSIONAL");
  console.log("   Amount: €49.00\n");

  try {
    const invoice = await mollieInvoiceService.generateSubscriptionInvoice({
      organizationId: testOrg.id,
      subscriptionId: subscription.id,
      plan: "PROFESSIONAL",
      amount: 4900, // €49.00 in cents
      molliePaymentId: "tr_test_" + Date.now(), // Fake payment ID for testing
    });

    console.log("\n✅ Invoice created successfully!");
    console.log("   Invoice ID:", invoice.id);
    console.log("   Invoice Number:", invoice.invoiceNumber);
    console.log("   Mollie Sales Invoice ID:", invoice.mollieSalesInvoiceId || "N/A");
    console.log("   PDF URL:", invoice.pdfUrl || "N/A");
    console.log("   Status:", invoice.status);
    console.log("   Amount:", `€${(invoice.amount / 100).toFixed(2)}`);

    if (invoice.pdfUrl) {
      console.log("\n📥 PDF available at:", invoice.pdfUrl);
    } else {
      console.log("\n⚠️  No PDF URL returned (check Mollie dashboard)");
    }
  } catch (error) {
    console.error("\n❌ Invoice creation failed:");
    if (error instanceof Error) {
      console.error("   Error:", error.message);
      console.error("   Stack:", error.stack);
    } else {
      console.error("   Error:", error);
    }
    process.exit(1);
  }

  console.log("\n✅ Test completed!");
  console.log("   Check your Mollie dashboard to verify the invoice was created.");
  console.log("   Dashboard: https://my.mollie.com/dashboard/sales-invoices\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
