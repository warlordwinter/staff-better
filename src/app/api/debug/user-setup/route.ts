import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CompaniesDaoSupabase } from "@/lib/dao/implementations/supabase/CompaniesDaoSupabase";
import { UsersDaoSupabase } from "@/lib/dao/implementations/supabase/UsersDaoSupabase";

const companiesDao = new CompaniesDaoSupabase();
const usersDao = new UsersDaoSupabase();

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return NextResponse.json(
        {
          error: "Authentication failed",
          details: userError.message,
        },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          error: "No authenticated user",
        },
        { status: 401 }
      );
    }

    // Get user record from database
    const dbUser = await usersDao.getUserByAuthId(user.id);

    // Get company for this user
    const company = await companiesDao.getCompanyByManagerId(user.id);

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
      .eq("user_id", dbUser?.id || user.id);

    // Get all companies (for debugging)
    const allCompanies = await companiesDao.getAllCompanies();

    return NextResponse.json({
      authUser: {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata,
      },
      dbUser,
      company,
      relationships: relationships || [],
      relationshipError: relError?.message,
      allCompanies: allCompanies.map((c) => ({ id: c.id, name: c.name })),
      setupCompleted: user.user_metadata?.company_setup_completed,
    });
  } catch (error: unknown) {
    console.error("Debug endpoint error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      {
        error: "Debug endpoint failed",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
