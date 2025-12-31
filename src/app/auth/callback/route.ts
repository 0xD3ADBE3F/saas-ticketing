import { createSupabaseServerClient } from "@/server/lib/supabase";
import { getAppUrl } from "@/lib/env";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const appUrl = getAppUrl();

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if this is a new user (created in last 10 seconds)
      const createdAt = new Date(data.user.created_at);
      const now = new Date();
      const isNewUser = (now.getTime() - createdAt.getTime()) < 10000; // 10 seconds

      // For new users, redirect to onboarding unless explicitly specified
      if (isNewUser && next === "/dashboard") {
        return NextResponse.redirect(`${appUrl}/onboarding`);
      }

      return NextResponse.redirect(`${appUrl}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${appUrl}/auth/error`);
}
