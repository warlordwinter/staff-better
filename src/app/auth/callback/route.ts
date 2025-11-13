import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/home";

  // If there's an error, redirect to error page
  if (error) {
    console.error("Auth callback error:", error, errorDescription);
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  if (code) {
    const supabase = await createClient();

    console.log("Attempting to exchange code for session...");
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Session exchange error:", exchangeError);
      console.error("Error details:", {
        message: exchangeError.message,
        status: exchangeError.status,
        name: exchangeError.name,
      });

      // If it's an email error, try to handle it gracefully
      if (exchangeError.message.includes("email")) {
        console.log("Email error detected, trying alternative approach...");
        // You might want to redirect to a page that asks for email manually
        return NextResponse.redirect(`${origin}/auth/auth-code-error`);
      }

      return NextResponse.redirect(`${origin}/auth/auth-code-error`);
    }

    if (data.session) {
      console.log("Session created successfully:", data.session.user.email);

      // Check if this is a new user by looking at user metadata and creation date
      const hasCompletedSetup =
        data.session.user.user_metadata?.company_setup_completed === true;

      // Also check if this is a very new user (created within last few minutes)
      // const isNewUser = new Date(data.session.user.created_at).getTime() >
      //   (Date.now() - 5 * 60 * 1000); // Created within last 5 minutes

      if (!hasCompletedSetup) {
        // New user or user who hasn't completed setup - redirect to company setup
        console.log("User needs company setup, redirecting to setup page");
        return NextResponse.redirect(`${origin}/company-setup`);
      } else {
        // Returning user - redirect to home page (always, ignore next parameter)
        console.log("Returning user, redirecting to home page");
        return NextResponse.redirect(`${origin}/home`);
      }
    } else {
      console.error("No session data returned");
      return NextResponse.redirect(`${origin}/auth/auth-code-error`);
    }
  }

  // Fallback error
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
