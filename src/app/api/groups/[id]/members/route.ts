import { NextRequest, NextResponse } from "next/server";
import { GroupsDaoSupabase } from "@/lib/dao/implementations/supabase/GroupsDaoSupabase";
import { requireCompanyId } from "@/lib/auth/getCompanyId";

const groupsDao = new GroupsDaoSupabase();

/**
 * GET /api/groups/[id]/members
 * Fetch all members of a specific group
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await requireCompanyId();
    const { id: groupId } = await params;

    const members = await groupsDao.getGroupMembers(groupId, companyId);
    return NextResponse.json(members);
  } catch (error: unknown) {
    console.error("Failed to fetch group members:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch group members";

    if (errorMessage.includes("Company not found")) {
      return NextResponse.json(
        { error: "Not authenticated or company not found" },
        { status: 401 }
      );
    }

    if (errorMessage.includes("not found") || errorMessage.includes("access denied")) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * POST /api/groups/[id]/members
 * Add member(s) to a group
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await requireCompanyId();
    const { id: groupId } = await params;
    const body = await request.json();

    // Verify the group belongs to the company
    const group = await groupsDao.getGroupById(groupId, companyId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Handle both single user_id and array of user_ids (also support legacy associate_id names)
    const userIds = Array.isArray(body.user_ids)
      ? body.user_ids
      : Array.isArray(body.associate_ids)
      ? body.associate_ids
      : body.user_id
      ? [body.user_id]
      : body.associate_id
      ? [body.associate_id]
      : [];

    if (userIds.length === 0) {
      return NextResponse.json(
        { error: "No user IDs provided" },
        { status: 400 }
      );
    }

    // Validate all IDs are strings
    if (!userIds.every((id: any) => typeof id === "string")) {
      return NextResponse.json(
        { error: "All user IDs must be strings" },
        { status: 400 }
      );
    }

    // Add members to the group
    await groupsDao.addMembers(groupId, userIds);

    return NextResponse.json({ success: true, added: userIds.length });
  } catch (error: unknown) {
    console.error("Failed to add members to group:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to add members to group";

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
 * DELETE /api/groups/[id]/members
 * Remove a member from a group
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await requireCompanyId();
    const { id: groupId } = await params;
    
    // Get user_id from query parameter (also support legacy associate_id)
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id") || searchParams.get("associate_id");

    if (!userId) {
      return NextResponse.json(
        { error: "user_id query parameter is required" },
        { status: 400 }
      );
    }

    // Verify the group belongs to the company; treat lookup errors as not found
    try {
      const group = await groupsDao.getGroupById(groupId, companyId);
      if (!group) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 });
      }
    } catch {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Remove the member
    await groupsDao.removeMember(groupId, userId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Failed to remove member from group:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to remove member from group";

    if (errorMessage.includes("Company not found")) {
      return NextResponse.json(
        { error: "Not authenticated or company not found" },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


