import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const {
      companyName,
      nonTempEmployees,
      email,
      zipCode,
      systemReadiness,
      referralSource,
    } = body;

    // Validate required fields
    if (
      !companyName ||
      !email ||
      !zipCode ||
      !systemReadiness ||
      !referralSource
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Create the company with user_id directly
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        company_name: companyName,
        email: email,
        non_temp_employees: nonTempEmployees,
        zip_code: zipCode,
        system_readiness: systemReadiness,
        referral_source: referralSource,
        setup_completed: true,
        user_id: user.id, // Direct link to user
      })
      .select()
      .single();

    if (companyError) {
      console.error("Error creating company:", companyError);
      return NextResponse.json(
        { error: "Failed to create company" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, companyId: company.id },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Company setup error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to complete company setup";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
