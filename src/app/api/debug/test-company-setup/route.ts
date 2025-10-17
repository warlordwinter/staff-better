import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertProfile } from "@/lib/supabase/profile";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      companyName = "Test Company",
      firstName = "Test",
      lastName = "User",
      email = user.email,
      phoneNumber = "555-123-4567",
      zipCode = "12345",
      systemReadiness = "yes",
      referralSource = "other",
    } = body;

    console.log("Testing company setup with data:", {
      companyName,
      firstName,
      lastName,
      email,
      phoneNumber,
      zipCode,
      systemReadiness,
      referralSource,
    });

    const result = await upsertProfile({
      companyName,
      firstName,
      lastName,
      email,
      phoneNumber,
      zipCode,
      systemReadiness,
      referralSource,
    });

    return NextResponse.json({
      success: true,
      result,
      message: "Company setup test completed successfully",
    });
  } catch (error: unknown) {
    console.error("Company setup test error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      {
        error: "Company setup test failed",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
