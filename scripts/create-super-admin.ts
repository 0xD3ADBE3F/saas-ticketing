#!/usr/bin/env tsx
/**
 * Create a SuperAdmin user
 *
 * Usage:
 *   pnpm admin:create <user-id> <email>
 *
 * Example:
 *   pnpm admin:create "abc123..." "admin@example.com"
 *
 * Make sure your DATABASE_URL is set in .env file
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

async function main() {
  const [userId, email] = process.argv.slice(2);

  if (!userId || !email) {
    console.error("Usage: pnpm admin:create <user-id> <email>");
    process.exit(1);
  }

  // Check if SuperAdmin already exists
  const existing = await prisma.superAdmin.findUnique({
    where: { userId },
  });

  if (existing) {
    console.log(`✅ SuperAdmin already exists: ${existing.email}`);
    return;
  }

  // Create SuperAdmin
  const superAdmin = await prisma.superAdmin.create({
    data: {
      userId,
      email: email.toLowerCase().trim(),
    },
  });

  console.log("✅ SuperAdmin created successfully!");
  console.log(`   User ID: ${superAdmin.userId}`);
  console.log(`   Email: ${superAdmin.email}`);
  console.log(`   Created: ${superAdmin.createdAt}`);
  console.log("\n   The user can now access the platform admin at /platform");
}

main()
  .catch((error) => {
    console.error("Error creating SuperAdmin:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
