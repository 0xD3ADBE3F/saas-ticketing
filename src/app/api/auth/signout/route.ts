import { createSupabaseServerClient } from "@/server/lib/supabase";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL!));
}
