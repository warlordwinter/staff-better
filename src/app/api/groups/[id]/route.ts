import { NextRequest, NextResponse } from "next/server";
import { GroupsDaoSupabase } from "@/lib/dao/implementations/supabase/GroupsDaoSupabase";
import { requireCompanyId } from "@/lib/auth/getCompanyId";

const groupsDao = new GroupsDaoSupabase();

/**
 * GET /api/groups/[id]
 * Fetch a specific group by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await requireCompanyId();
    const { id: groupId } = await params;

    const group = await groupsDao.getGroupById(groupId, companyId);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error: unknown) {
    console.error("Failed to fetch group:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch group";

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
 * PUT /api/groups/[id]
 * Update a specific group
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await requireCompanyId();
    const { id: groupId } = await params;
    const body = await request.json();

    // Validate that at least one field is being updated
    if (!body.group_name && body.description === undefined) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const updates: { group_name?: string; description?: string | null } = {};

    if (body.group_name) {
      if (typeof body.group_name !== "string" || !body.group_name.trim()) {
        return NextResponse.json(
          { error: "Group name must be a non-empty string" },
          { status: 400 }
        );
      }
      updates.group_name = body.group_name.trim();
    }

    if (body.description !== undefined) {
      updates.description = body.description || null;
    }

    const updatedGroup = await groupsDao.updateGroup(
      groupId,
      companyId,
      updates
    );

    if (!updatedGroup) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json(updatedGroup);
  } catch (error: unknown) {
    console.error("Failed to update group:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update group";

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
 * DELETE /api/groups/[id]
 * Delete a specific group
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await requireCompanyId();
    const { id: groupId } = await params;

    await groupsDao.deleteGroup(groupId, companyId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Failed to delete group:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete group";

    if (errorMessage.includes("Company not found")) {
      return NextResponse.json(
        { error: "Not authenticated or company not found" },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
