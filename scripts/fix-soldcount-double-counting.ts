/**
 * Fix soldCount Double-Counting Bug
 *
 * This script fixes a bug where soldCount was incremented twice:
 * 1. When order was created (orderService.ts)
 * 2. When payment was marked as paid (paymentService.ts)
 *
 * This resulted in soldCount being 2x the actual number of tickets sold.
 *
 * The script recalculates soldCount for all ticket types based on actual paid orders.
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";

// Use DIRECT_URL if available (bypasses pooler), otherwise fall back to DATABASE_URL
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

// Check if connection string is available
if (!connectionString) {
  console.error("❌ Error: DATABASE_URL or DIRECT_URL environment variable is not set");
  console.error("   Make sure you have a .env file with DATABASE_URL configured");
  process.exit(1);
}

// Create connection pool and adapter
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Create Prisma client with adapter
const prisma = new PrismaClient({ adapter });

async function fixSoldCountDoubleCount() {
  console.log("🔍 Analyzing soldCount values...\n");

  // Get all ticket types with their current soldCount
  const ticketTypes = await prisma.ticketType.findMany({
    include: {
      event: {
        select: {
          id: true,
          title: true,
        },
      },
      orderItems: {
        include: {
          order: {
            select: {
              status: true,
            },
          },
        },
      },
    },
  });

  let fixedCount = 0;
  let totalTypes = ticketTypes.length;

  console.log(`Found ${totalTypes} ticket types\n`);

  for (const ticketType of ticketTypes) {
    // Calculate the correct soldCount (sum of quantities from PAID orders)
    const correctSoldCount = ticketType.orderItems.reduce((sum, item) => {
      if (item.order.status === "PAID") {
        return sum + item.quantity;
      }
      return sum;
    }, 0);

    const currentSoldCount = ticketType.soldCount;

    if (currentSoldCount !== correctSoldCount) {
      console.log(
        `📝 Ticket Type: ${ticketType.name} (Event: ${ticketType.event.title})`
      );
      console.log(`   Current soldCount: ${currentSoldCount}`);
      console.log(`   Correct soldCount: ${correctSoldCount}`);
      console.log(`   Difference: ${currentSoldCount - correctSoldCount}`);

      // Update the soldCount
      await prisma.ticketType.update({
        where: { id: ticketType.id },
        data: { soldCount: correctSoldCount },
      });

      console.log(`   ✅ Fixed!\n`);
      fixedCount++;
    }
  }

  console.log(`\n✨ Summary:`);
  console.log(`   Total ticket types: ${totalTypes}`);
  console.log(`   Fixed: ${fixedCount}`);
  console.log(`   Already correct: ${totalTypes - fixedCount}`);
}

// Run the script
fixSoldCountDoubleCount()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
