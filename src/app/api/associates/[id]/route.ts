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

    // Check if updates object is empty
    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 }
      );
    }

    const updatedAssociate = await associatesDao.updateAssociate(id, updates);

    // Check if we got valid data back
    if (
      !updatedAssociate ||
      !Array.isArray(updatedAssociate) ||
      updatedAssociate.length === 0
    ) {
      console.error(
        "No associate data returned from updateAssociate:",
        updatedAssociate
      );
      return NextResponse.json(
        { error: "No associate data returned after update" },
        { status: 500 }
      );
    }

    // Ensure we only return the fields that are JSON serializable
    const safeAssociate = {
      id: updatedAssociate[0].id,
      first_name: updatedAssociate[0].first_name,
      last_name: updatedAssociate[0].last_name,
      phone_number: updatedAssociate[0].phone_number,
      email_address: updatedAssociate[0].email_address,
    };

    return NextResponse.json(safeAssociate);
  } catch (error) {
    console.error("Failed to update associate:", error);
    let errorMessage = "Failed to update associate";

    if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
    } else if (typeof error === "string") {
      errorMessage = error;
    } else {
      // Try to extract a meaningful message from any error object
      try {
        errorMessage = JSON.stringify(error);
      } catch {
        errorMessage = String(error);
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    await associatesDao.deleteAssociate(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete associate:", error);
    let errorMessage = "Failed to delete associate";

    if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
    } else if (typeof error === "string") {
      errorMessage = error;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
