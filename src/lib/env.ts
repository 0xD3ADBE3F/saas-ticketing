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
 * Falls back to localhost in development
 */
export function getAppUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
