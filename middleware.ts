/**
 * Middleware - Protected Routes
 * Handles authentication checks and route protection
 */

import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase URL or anon key. Check .env.local for NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

const SUPABASE_URL = supabaseUrl as string;
const SUPABASE_ANON_KEY = supabaseAnonKey as string;

// Routes that require authentication
const protectedRoutes = [
  "/profile",
  "/appointments",
  "/orders",
  "/cart",
  "/admin",
  "/store-manager",
  "/pos",
];

// Routes that should redirect if already authenticated
const authRoutes = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

const applyCookies = (source: NextResponse, target: NextResponse) => {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const response = NextResponse.next();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set({ name, value, ...options });
        });
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const isAuthRoute = authRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // If trying to access protected route without auth, redirect to login
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    applyCookies(response, redirectResponse);
    return redirectResponse;
  }

  // If authenticated and trying to access auth routes, redirect to home
  if (isAuthRoute && isAuthenticated) {
    const redirectResponse = NextResponse.redirect(new URL("/", request.url));
    applyCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}

export const config = {
  // Only run middleware on these routes
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - sw.js (service worker)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)",
  ],
};
