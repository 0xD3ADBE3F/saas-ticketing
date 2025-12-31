import { z } from "zod";

/**
 * Server-side environment variables schema
 * These are only available on the server
 */
const serverEnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  // Supabase
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Payments - Platform
  MOLLIE_API_KEY: z.string().min(1),

  // Mollie Connect (OAuth)
  MOLLIE_CONNECT_CLIENT_ID: z.string().min(1),
  MOLLIE_CONNECT_CLIENT_SECRET: z.string().min(1),
  MOLLIE_REDIRECT_URI: z.string().url().optional(),
  // Platform access token (from OAuth flow - has clients.write scope)
  MOLLIE_PLATFORM_ACCESS_TOKEN: z.string().min(1).optional(),
  MOLLIE_PLATFORM_REFRESH_TOKEN: z.string().min(1).optional(),
  // Test mode - set to "true" to use Mollie test mode
  MOLLIE_TEST_MODE: z.enum(["true", "false"]).default("false"),

  // Security
  TICKET_SIGNING_SECRET: z.string().min(32),
  TOKEN_ENCRYPTION_KEY: z.string().length(64), // 32 bytes = 64 hex chars

  // Email
  RESEND_API_KEY: z.string().min(1),

  // App
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

/**
 * Client-side environment variables schema
 * These are exposed to the browser (NEXT_PUBLIC_ prefix)
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

/**
 * Combined environment schema
 */
const envSchema = serverEnvSchema.merge(clientEnvSchema);

export type Env = z.infer<typeof envSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Validated environment variables
 * Throws on startup if validation fails
 */
function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
}

/**
 * Skip validation in edge cases (build time, etc.)
 * but always validate in runtime
 */
const skipValidation =
  !!process.env.SKIP_ENV_VALIDATION ||
  process.env.npm_lifecycle_event === "lint";

export const env = skipValidation
  ? (process.env as unknown as Env)
  : validateEnv();
