import { NextRequest, NextResponse } from "next/server";
import { AssociatesDaoSupabase } from "@/lib/dao/implementations/supabase/AssociatesDaoSupabase";
import { CompaniesDaoSupabase } from "@/lib/dao/implementations/supabase/CompaniesDaoSupabase";
import { createClient } from "@/lib/supabase/server";

const associatesDao = new AssociatesDaoSupabase();
const companiesDao = new CompaniesDaoSupabase();

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const updates = await request.json();

    const updatedAssociate = await associatesDao.updateAssociate(
      id,
      updates,
      company.id
    );
    if (!updatedAssociate || updatedAssociate.length === 0) {
      return NextResponse.json(
        { error: "Associate not found or no changes applied" },
        { status: 404 }
      );
    }
    return NextResponse.json(updatedAssociate[0]);
  } catch (error) {
    console.error("Failed to update associate:", error);
    return NextResponse.json(
      { error: "Failed to update associate" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    await associatesDao.deleteAssociate(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete associate:", error);
    return NextResponse.json(
      { error: "Failed to delete associate" },
      { status: 500 }
    );
  }
}
