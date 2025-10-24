import { NextRequest, NextResponse } from "next/server";
import { AssociatesDaoSupabase } from "@/lib/dao/implementations/supabase/AssociatesDaoSupabase";

const associatesDao = new AssociatesDaoSupabase();

export async function GET() {
  try {
    const associates = await associatesDao.getAssociates();
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
    const body = await request.json();

    // Handle single associate or array of associates
    const associatesToInsert = Array.isArray(body) ? body : [body];

    // Filter out work_date and start_date fields since they no longer exist in the database
    const filteredAssociates = associatesToInsert.map(
      ({ work_date, start_date, ...associate }) => associate
    );

    const insertedAssociates = await associatesDao.insertAssociates(
      filteredAssociates
    );
    return NextResponse.json(insertedAssociates, { status: 201 });
  } catch (error) {
    console.error("Failed to create associate:", error);
    return NextResponse.json(
      { error: "Failed to create associate" },
      { status: 500 }
    );
  }
}
