import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL environment variable is not set. Please check your .env file."
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Create a connection pool for the PostgreSQL adapter with optimized settings
if (!globalForPrisma.pool) {
  globalForPrisma.pool = new Pool({
    connectionString,
    // Connection pool optimization
    max: process.env.NODE_ENV === "production" ? 20 : 5, // Max connections
    min: 2, // Minimum connections to keep alive
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 10000, // Timeout for acquiring connection
    maxUses: 7500, // Recycle connections after 7500 uses to prevent memory leaks
    allowExitOnIdle: process.env.NODE_ENV !== "production", // Allow pool to close in dev
  });

  // Handle pool errors to prevent crashes
  globalForPrisma.pool.on("error", (err) => {
    console.error("Unexpected database pool error:", err);
  });

  // Log pool events in development
  if (process.env.NODE_ENV === "development") {
    globalForPrisma.pool.on("connect", () => {
      console.log("New database connection established");
    });
    globalForPrisma.pool.on("remove", () => {
      console.log("Database connection removed from pool");
    });
  }
}

const pool = globalForPrisma.pool;
const adapter = new PrismaPg(pool);

// Initialize Prisma client with adapter and optimized logging
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? [
            { level: "query", emit: "event" },
            { level: "error", emit: "stdout" },
            { level: "warn", emit: "stdout" },
          ]
        : [{ level: "error", emit: "stdout" }],
  });

  // Log slow queries in development (queries taking > 1s)
  if (process.env.NODE_ENV === "development") {
    globalForPrisma.prisma.$on("query" as never, (e: any) => {
      if (e.duration > 1000) {
        console.warn(`🐌 Slow query detected (${e.duration}ms):`, {
          query: e.query,
          params: e.params,
          duration: `${e.duration}ms`,
        });
      }
    });
  }
}

export const prisma = globalForPrisma.prisma;

// Graceful shutdown handler
if (typeof process !== "undefined") {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
    await pool.end();
  });
}
