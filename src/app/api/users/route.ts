import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCompanyId } from "@/lib/auth/getCompanyId";

export async function GET() {
  try {
    const companyId = await requireCompanyId();
    const supabase = await createClient();

    // Get all users (associates) for this company
    const { data: users, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, phone_number, email, role, sms_opt_out")
      .eq("role", "ASSOCIATE"); // Only get associates, not managers

    if (error) {
      console.error("Failed to fetch users:", error);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const companyId = await requireCompanyId();
    const supabase = await createClient();
    const body = await request.json();

    const { error: insertError, data: newUser } = await supabase
      .from("users")
      .insert({
        first_name: body.first_name,
        last_name: body.last_name,
        phone_number: body.phone_number || "",
        email: body.email || null,
        role: "ASSOCIATE",
        sms_opt_out: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create user:", insertError);
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Also add to company_associates junction table
    const { error: companyAssociateError } = await supabase
      .from("company_associates")
      .insert({
        company_id: companyId,
        user_id: newUser.id,
      });

    if (companyAssociateError) {
      console.error("Failed to link user to company:", companyAssociateError);
      // Don't fail here, user is created but not linked
    }

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("Failed to create user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

