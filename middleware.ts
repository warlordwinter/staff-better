// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Configure which paths to protect
const PROTECTED_PATHS = ["/jobs", "/jobs/", "/groups", "/groups/"];

// Helper: check if the request url pathname starts with any protected prefix
function isProtected(pathname: string) {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

// Read the Supabase access token from cookies (Supabase client stores in "sb:token" or "supabase-auth-token")
function getAccessTokenFromCookie(req: NextRequest): string | null {
  // Common cookie keys used by Supabase clients:
  const cookieNames = ["sb:token", "supabase-auth-token", "sb-access-token"];
  for (const name of cookieNames) {
    const cookieVal = req.cookies.get(name)?.value;
    if (cookieVal) {
      try {
        // If Supabase stores JSON with access_token, parse it
        const parsed = JSON.parse(cookieVal);
        if (parsed?.access_token) return parsed.access_token;
        // if cookie is raw token, return directly
        if (typeof cookieVal === "string" && cookieVal.split(".").length === 3)
          return cookieVal;
      } catch {
        // not JSON — treat as raw token if looks like JWT
        if (cookieVal.split(".").length === 3) return cookieVal;
      }
    }
  }
  // fallback: Authorization header (useful for API requests)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.split(" ")[1];
  return null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  console.log("🧠 Middleware triggered:", req.nextUrl.pathname);

  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  const token = getAccessTokenFromCookie(req);

  // If no token, redirect to login
  if (!token) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    // optional: include callback to return after login
    loginUrl.searchParams.set(
      "callbackUrl",
      req.nextUrl.pathname + req.nextUrl.search
    );
    return NextResponse.redirect(loginUrl);
  }

  // Verify token with Supabase REST endpoint (safe if you don't have JWT secret server-side)
  // This calls supabase auth endpoint to validate session; it returns 200 if valid.
  try {
    const resp = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        },
      }
    );

    if (resp.status !== 200) {
      // invalid token
      const loginUrl = new URL("/login", req.nextUrl.origin);
      loginUrl.searchParams.set(
        "callbackUrl",
        req.nextUrl.pathname + req.nextUrl.search
      );
      return NextResponse.redirect(loginUrl);
    }

    // Optionally, you can fetch the user JSON to inspect roles/claims
    // const user = await resp.json();

    // Allow the request to continue
    return NextResponse.next();
  } catch (err) {
    console.error("Auth verification failed", err);
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set(
      "callbackUrl",
      req.nextUrl.pathname + req.nextUrl.search
    );
    return NextResponse.redirect(loginUrl);
  }
}

// Configure matcher to run middleware only for the protected routes
export const config = {
  matcher: ["/jobs/:path*", "/groups/:path*", "/jobs", "/groups"],
};
