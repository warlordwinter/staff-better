import { NextRequest, NextResponse } from "next/server";
import { GroupsDaoSupabase } from "@/lib/dao/implementations/supabase/GroupsDaoSupabase";
import { requireCompanyId } from "@/lib/auth/getCompanyId";

const groupsDao = new GroupsDaoSupabase();

/**
 * GET /api/groups
 * Fetch all groups for the authenticated user's company
 */
export async function GET() {
  try {
    const companyId = await requireCompanyId();

    const groups = await groupsDao.getGroups(companyId);
    return NextResponse.json(groups);
  } catch (error: unknown) {
    console.error("Failed to fetch groups:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch groups";
    
    if (errorMessage.includes("Company not found")) {
      return NextResponse.json(
        { error: "Not authenticated or company not found" },
        { status: 401 }
      );
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * POST /api/groups
 * Create a new group for the authenticated user's company
 */
export async function POST(request: NextRequest) {
  try {
    const companyId = await requireCompanyId();
    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 }
      );
    }

    // Create the group
    const newGroup = await groupsDao.createGroup({
      company_id: companyId,
      name: body.name.trim(),
      description: body.description || null,
    });

    return NextResponse.json(newGroup, { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to create group:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create group";
    
    if (errorMessage.includes("Company not found")) {
      return NextResponse.json(
        { error: "Not authenticated or company not found" },
        { status: 401 }
      );
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


