import { NextRequest, NextResponse } from "next/server";
import { AssociatesDaoSupabase } from "@/lib/dao/implementations/supabase/AssociatesDaoSupabase";

const associatesDao = new AssociatesDaoSupabase();

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const updates = await request.json();

    // Filter out work_date and start_date fields since they no longer exist in the database
    const { work_date, start_date, ...filteredUpdates } = updates;

    const updatedAssociate = await associatesDao.updateAssociate(
      id,
      filteredUpdates
    );
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
