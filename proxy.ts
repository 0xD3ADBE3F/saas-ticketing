import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const startTime = Date.now();

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes
  const isProtectedRoute = request.nextUrl.pathname.startsWith("/dashboard");
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/auth/login") ||
    request.nextUrl.pathname.startsWith("/auth/register");

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Performance optimizations: Add cache headers
  const pathname = request.nextUrl.pathname;

  // Public events pages can be cached
  if (pathname.startsWith("/events") || pathname.startsWith("/e/")) {
    // Cache for 2 minutes (stale-while-revalidate for 10 minutes)
    supabaseResponse.headers.set(
      "Cache-Control",
      "public, s-maxage=120, stale-while-revalidate=600"
    );
  }

  // API routes should not be cached
  if (pathname.startsWith("/api/")) {
    supabaseResponse.headers.set("Cache-Control", "no-store, must-revalidate");
  }

  // Add response time header in development
  if (process.env.NODE_ENV === "development") {
    const duration = Date.now() - startTime;
    supabaseResponse.headers.set("X-Response-Time", `${duration}ms`);

    // Log slow responses
    if (duration > 1000) {
      console.warn(`🐌 Slow response: ${pathname} took ${duration}ms`);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
