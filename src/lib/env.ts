/**
 * Client-safe environment variables
 * Only NEXT_PUBLIC_ prefixed variables are available here
 */
export const clientEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL!,
  NEXT_PUBLIC_IS_LIVE: process.env.NEXT_PUBLIC_IS_LIVE === "true",
} as const;

/**
 * Get the application URL (for redirects, webhooks, etc.)
 * Always uses NEXT_PUBLIC_APP_URL to ensure consistency
 */
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
