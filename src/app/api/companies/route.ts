import { NextRequest, NextResponse } from "next/server";
import { CompaniesDaoSupabase } from "@/lib/dao/implementations/supabase/CompaniesDaoSupabase";
import { UsersDaoSupabase } from "@/lib/dao/implementations/supabase/UsersDaoSupabase";
import { createClient } from "@/lib/supabase/server";

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
      console.error("Authentication error in companies API:", userError);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }

    if (!user) {
      console.error("No user found in companies API");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    console.log("Fetching company for user:", user.id);

    // Get the user's company
    const company = await companiesDao.getCompanyByManagerId(user.id);

    if (!company) {
      console.error("No company found for user:", user.id);
      return NextResponse.json(
        {
          error: "No company found. Please complete company setup first.",
        },
        { status: 404 }
      );
    }

    console.log("Found company:", company.id, "for user:", user.id);
    return NextResponse.json(company);
  } catch (error: unknown) {
    console.error("Error in companies API:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      email,
      phone_number,
      zip_code,
      system_readiness,
      referral_source,
    } = body;

    // Create the company
    const company = await companiesDao.createCompany({
      name,
      email,
      phone_number,
      zip_code,
      system_readiness,
      referral_source,
      setup_completed: true,
    });

    // Create or update the user record
    let dbUser = await usersDao.getUserByAuthId(user.id);
    if (!dbUser) {
      // Create new user record
      const [firstName, ...lastNameParts] = (
        user.user_metadata?.full_name ||
        user.email ||
        "User"
      ).split(" ");
      dbUser = await usersDao.createUser({
        first_name: firstName || "User",
        last_name: lastNameParts.join(" ") || "",
        email: user.email,
        auth_id: user.id,
        role: "manager",
      });
    } else {
      // Update existing user to be a manager
      dbUser = await usersDao.updateUser(dbUser.id, { role: "manager" });
    }

    // Create the company-manager relationship
    const { error: relationshipError } = await supabase
      .from("company_managers")
      .insert({
        company_id: company.id,
        user_id: dbUser.id,
      });

    if (relationshipError) {
      throw new Error(
        `Failed to create company-manager relationship: ${relationshipError.message}`
      );
    }

    return NextResponse.json(company, { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to create company:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create company";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
