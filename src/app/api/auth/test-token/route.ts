import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getCompanyId } from "@/lib/auth/getCompanyId";

/**
 * GET /api/auth/test-token
 * 
 * Generates a test JWT token with company_id for testing the message router Lambda.
 * This endpoint requires authentication and will include the user's company_id in the token.
 * 
 * The token is signed with the same JWT_VERIFICATION_KEY used by the message router Lambda.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get the current authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get the user's company_id
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        {
          error: "Company not found",
          message:
            "User does not have an associated company. Please complete company setup first.",
        },
        { status: 400 }
      );
    }

    // Get the JWT verification key from environment
    // This should be the same key used in the message router Lambda
    const jwtVerificationKey =
      process.env.JWT_VERIFICATION_KEY ||
      process.env.SUPABASE_JWT_SECRET;

    if (!jwtVerificationKey) {
      return NextResponse.json(
        {
          error: "Configuration error",
          message:
            "JWT_VERIFICATION_KEY not configured. This should be set to your Supabase JWT secret.",
        },
        { status: 500 }
      );
    }

    // Get the user's current session to get the original token claims
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Create a custom JWT token with company_id
    // Include standard Supabase claims plus company_id
    const token = jwt.sign(
      {
        // Standard Supabase claims
        iss: "supabase",
        ref: process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(
          "."
        )[0],
        role: user.role || "authenticated",
        sub: user.id,
        email: user.email,
        // Custom claim for message router
        company_id: companyId,
        // Include other useful claims
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiration
      },
      jwtVerificationKey,
      {
        algorithm: "HS256",
      }
    );

    return NextResponse.json({
      token,
      company_id: companyId,
      user_id: user.id,
      expires_in: 3600, // 1 hour
      message:
        "Use this token in the Authorization header: Bearer <token> when testing the message router Lambda",
    });
  } catch (error) {
    console.error("Error generating test token:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

