import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();

    // Delete the new orphaned record
    const { error } = await supabase
      .from("company_associates")
      .delete()
      .eq("user_id", "ff7a6dea-3d52-4519-b6cf-c370b1ee648f");

    if (error) {
      throw new Error(`Failed to delete orphaned record: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: "New orphaned record cleaned up successfully",
      deletedUserId: "ff7a6dea-3d52-4519-b6cf-c370b1ee648f",
    });
  } catch (error: unknown) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      {
        error: "Cleanup failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
