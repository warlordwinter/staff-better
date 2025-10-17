import { NextRequest, NextResponse } from "next/server";
import { AssociatesDaoSupabase } from "@/lib/dao/implementations/supabase/AssociatesDaoSupabase";
import { CompaniesDaoSupabase } from "@/lib/dao/implementations/supabase/CompaniesDaoSupabase";
import { createClient } from "@/lib/supabase/server";

const associatesDao = new AssociatesDaoSupabase();
const companiesDao = new CompaniesDaoSupabase();

export async function GET() {
  try {
    // Get the current authenticated user for RLS context
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get the company for this manager
    const company = await companiesDao.getCompanyByManagerId(user.id);
    if (!company) {
      return NextResponse.json(
        { error: "No company found for manager" },
        { status: 404 }
      );
    }

    const associates = await associatesDao.getAssociates(company.id);
    return NextResponse.json(associates);
  } catch (error) {
    console.error("Failed to fetch associates:", error);
    return NextResponse.json(
      { error: "Failed to fetch associates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the current authenticated user for RLS context
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get the company for this manager
    const company = await companiesDao.getCompanyByManagerId(user.id);
    if (!company) {
      return NextResponse.json(
        { error: "No company found for manager" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Handle single associate or array of associates
    const associatesToInsert = Array.isArray(body) ? body : [body];

    // Validate required fields
    for (const associate of associatesToInsert) {
      if (!associate.first_name?.trim()) {
        return NextResponse.json(
          { error: "First name is required" },
          { status: 400 }
        );
      }
      if (!associate.last_name?.trim()) {
        return NextResponse.json(
          { error: "Last name is required" },
          { status: 400 }
        );
      }
      if (!associate.phone_number?.trim()) {
        return NextResponse.json(
          { error: "Phone number is required" },
          { status: 400 }
        );
      }
    }

    const insertedAssociates = await associatesDao.insertAssociates(
      associatesToInsert,
      company.id
    );
    return NextResponse.json(insertedAssociates, { status: 201 });
  } catch (error) {
    console.error("Failed to create associate:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create associate",
      },
      { status: 500 }
    );
  }
}
