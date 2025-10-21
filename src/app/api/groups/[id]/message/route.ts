import { NextRequest, NextResponse } from "next/server";
import { GroupsDaoSupabase } from "@/lib/dao/implementations/supabase/GroupsDaoSupabase";
import { requireCompanyId } from "@/lib/auth/getCompanyId";
import { sendSMS, formatPhoneNumber } from "@/lib/twilio/sms";

const groupsDao = new GroupsDaoSupabase();

/**
 * POST /api/groups/[id]/message
 * Send a mass message to all members of a group
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const companyId = await requireCompanyId();
    const groupId = params.id;
    const body = await request.json();

    // Validate message
    if (!body.message || typeof body.message !== "string" || !body.message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Verify the group belongs to the company
    const group = await groupsDao.getGroupById(groupId, companyId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Get all group members
    const members = await groupsDao.getGroupMembers(groupId, companyId);

    if (members.length === 0) {
      return NextResponse.json(
        { error: "No members in this group" },
        { status: 400 }
      );
    }

    // Filter out members who have opted out of SMS
    const eligibleMembers = members.filter(
      (member) => !member.sms_opt_out && member.phone_number
    );

    if (eligibleMembers.length === 0) {
      return NextResponse.json(
        { 
          error: "No eligible members to message (all opted out or missing phone numbers)",
          total_members: members.length,
          eligible_members: 0
        },
        { status: 400 }
      );
    }

    // Send SMS to each eligible member
    const results = [];
    const errors = [];

    for (const member of eligibleMembers) {
      try {
        const formattedPhone = formatPhoneNumber(member.phone_number);
        const result = await sendSMS({
          to: formattedPhone,
          body: body.message.trim(),
        });

        results.push({
          member_id: member.id,
          phone: member.phone_number,
          success: result.success,
        });

        if (!result.success) {
          errors.push({
            member_id: member.id,
            phone: member.phone_number,
            error: 'error' in result ? result.error : 'Unknown error',
          });
        }

        // Small delay between messages to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error sending message to ${member.phone_number}:`, error);
        errors.push({
          member_id: member.id,
          phone: member.phone_number,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      total_members: members.length,
      eligible_members: eligibleMembers.length,
      messages_sent: successCount,
      messages_failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    console.error("Failed to send mass message:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send mass message";

    if (errorMessage.includes("Company not found")) {
      return NextResponse.json(
        { error: "Not authenticated or company not found" },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


