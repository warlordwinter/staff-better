import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Check for the conflicting phone number
    const phoneNumber = "8019959798";

    // Check if this phone number exists in users table
    const { data: existingUser, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("phone_number", phoneNumber)
      .single();

    // Check if this user is linked to any company
    const { data: companyAssociates, error: caError } = await supabase
      .from("company_associates")
      .select(
        `
        *,
        users (
          id,
          first_name,
          last_name,
          phone_number,
          role
        ),
        companies (
          id,
          name
        )
      `
      )
      .eq("users.phone_number", phoneNumber);

    return NextResponse.json({
      phoneNumber,
      existingUser: existingUser || null,
      userError: userError?.message,
      companyAssociates: companyAssociates || [],
      companyAssociatesError: caError?.message,
      summary: {
        userExists: !!existingUser,
        userRole: existingUser?.role,
        linkedToCompanies: companyAssociates?.length || 0,
        companies:
          companyAssociates?.map((ca) => ({
            companyId: ca.companies?.id,
            companyName: ca.companies?.name,
          })) || [],
      },
    });
  } catch (error: unknown) {
    console.error("Debug phone conflict error:", error);
    return NextResponse.json(
      {
        error: "Debug failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
