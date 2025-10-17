import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CompaniesDaoSupabase } from "@/lib/dao/implementations/supabase/CompaniesDaoSupabase";

const companiesDao = new CompaniesDaoSupabase();

export async function GET() {
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

    console.log("Testing company lookup for auth user:", user.id);

    // Test the company lookup
    const company = await companiesDao.getCompanyByManagerId(user.id);

    // Also get the database user info
    const { data: dbUser, error: dbUserError } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", user.id)
      .single();

    // Get company-manager relationships
    const { data: relationships, error: relError } = await supabase
      .from("company_managers")
      .select(
        `
        *,
        companies (*),
        users (*)
      `
      )
      .eq("user_id", dbUser?.id || "none");

    return NextResponse.json({
      authUser: {
        id: user.id,
        email: user.email,
      },
      dbUser: dbUser || null,
      dbUserError: dbUserError?.message,
      company: company || null,
      relationships: relationships || [],
      relationshipError: relError?.message,
    });
  } catch (error: unknown) {
    console.error("Company lookup test error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      {
        error: "Company lookup test failed",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
