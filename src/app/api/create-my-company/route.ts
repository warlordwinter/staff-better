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
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { companyName } = body;

    if (!companyName) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    // Check if company already exists for this user
    const { data: existingCompany } = await supabase
      .from("companies")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingCompany) {
      return NextResponse.json(
        { success: true, companyId: existingCompany.id, message: "Company already exists" },
        { status: 200 }
      );
    }

    // Create the company
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: companyName,
        email: user.email || "",
        phone_number: "",
        zip_code: "00000",
        system_readiness: null, // Set to null since it's nullable
        referral_source: "existing_user",
        setup_completed: true,
        user_id: user.id,
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
      { success: true, companyId: company.id, message: "Company created successfully" },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Create company error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create company";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
