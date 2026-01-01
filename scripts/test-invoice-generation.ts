#!/usr/bin/env tsx

/**
 * Test script for platform fee invoice generation
 * Usage: npx tsx scripts/test-invoice-generation.ts [eventId]
 */

import { prisma } from "../src/server/lib/prisma";
import { platformFeeInvoiceService } from "../src/server/services/platformFeeInvoiceService";

async function testInvoiceGeneration(eventId?: string) {
  try {
    console.log("🧪 Testing invoice generation...\n");

    if (eventId) {
      // Test single event
      console.log(`Generating invoice for event: ${eventId}`);
      const invoice = await platformFeeInvoiceService.generateEventInvoice(
        eventId
      );

      if (invoice) {
        console.log("✅ Invoice generated successfully!");
        console.log({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: `€${(invoice.amount / 100).toFixed(2)}`,
          vatAmount: `€${(invoice.vatAmount / 100).toFixed(2)}`,
          status: invoice.status,
          pdfUrl: invoice.pdfUrl,
        });
      } else {
        console.log("ℹ️ No invoice generated (possibly zero platform fee)");
      }
    } else {
      // Test batch generation (events from last 7 days)
      console.log("Generating invoices for events from last 7 days...");
      const invoices = await platformFeeInvoiceService.generateMissingInvoices(
        7
      );

      console.log(`\n✅ Generated ${invoices.length} invoice(s):`);
      invoices.forEach((inv) => {
        console.log({
          invoiceNumber: inv.invoiceNumber,
          organizationId: inv.organizationId,
          eventId: inv.eventId,
          amount: `€${(inv.amount / 100).toFixed(2)}`,
          status: inv.status,
        });
      });
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get eventId from command line args
const eventId = process.argv[2];

testInvoiceGeneration(eventId);
