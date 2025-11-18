import { NextRequest, NextResponse } from "next/server";
import { GroupsDaoSupabase } from "@/lib/dao/implementations/supabase/GroupsDaoSupabase";
import {
  requireCompanyId,
  requireCompanyPhoneNumber,
  requireCompanyWhatsAppNumber,
} from "@/lib/auth/getCompanyId";
import { sendTwoWaySMS, formatPhoneNumber } from "@/lib/twilio/sms";
import { sendWhatsAppBusiness } from "@/lib/twilio/whatsapp";
import { createAdminClient } from "@/lib/supabase/admin";

const groupsDao = new GroupsDaoSupabase();

/**
 * POST /api/groups/[id]/message
 * Send a mass message to all members of a group via SMS or WhatsApp
 * 
 * Request body:
 * - message: string (required) - The message text
 * - channel: "sms" | "whatsapp" (optional, defaults to "sms")
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await requireCompanyId();
    const { id: groupId } = await params;
    const body = await request.json();

    // Validate message
    if (
      !body.message ||
      typeof body.message !== "string" ||
      !body.message.trim()
    ) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Get channel (default to SMS for backwards compatibility)
    const channel = body.channel === "whatsapp" ? "whatsapp" : "sms";

    // Get appropriate phone number based on channel
    let senderNumber: string;
    let twoWayPhoneNumber: string | undefined;
    if (channel === "whatsapp") {
      try {
        senderNumber = await requireCompanyWhatsAppNumber(companyId);
      } catch (error) {
        return NextResponse.json(
          {
            error:
              "WhatsApp Business number is not configured. Please set TWILIO_WHATSAPP_NUMBER environment variable.",
          },
          { status: 400 }
        );
      }
    } else {
      senderNumber = await requireCompanyPhoneNumber(companyId);
      twoWayPhoneNumber = senderNumber; // For SMS opt-out messages
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

    // Track unsubscribed members (opted out or missing phone)
    const unsubscribedMembers = members.filter(
      (member) => member.sms_opt_out || !member.phone_number
    );

    if (eligibleMembers.length === 0) {
      return NextResponse.json(
        {
          error:
            "No eligible members to message (all opted out or missing phone numbers)",
          total_members: members.length,
          eligible_members: 0,
          unsubscribed_members: unsubscribedMembers.map((m) => ({
            id: m.id,
            first_name: m.first_name,
            last_name: m.last_name,
          })),
        },
        { status: 400 }
      );
    }

    // Send messages to each eligible member
    const results = [];
    const errors = [];
    const twilioUnsubscribedMembers: Array<{
      id: string;
      first_name: string;
      last_name: string;
    }> = [];

    for (const member of eligibleMembers) {
      try {
        const formattedPhone = formatPhoneNumber(member.phone_number);
        let result;

        if (channel === "whatsapp") {
          // Send WhatsApp message
          result = await sendWhatsAppBusiness(
            {
              to: formattedPhone,
              body: body.message.trim(),
            },
            senderNumber
          );
        } else {
          // Send SMS message
          result = await sendTwoWaySMS(
            {
              to: formattedPhone,
              body: body.message.trim(),
            },
            senderNumber
          );
        }

        results.push({
          member_id: member.id,
          phone: member.phone_number,
          success: result.success,
        });

        if (!result.success) {
          // Check if error is due to unsubscription (Twilio error code 21610)
          const errorCode = "code" in result ? result.code : null;
          if (errorCode === "21610") {
            twilioUnsubscribedMembers.push({
              id: member.id,
              first_name: member.first_name,
              last_name: member.last_name,
            });
          }

          errors.push({
            member_id: member.id,
            phone: member.phone_number,
            error: "error" in result ? result.error : "Unknown error",
          });
        } else {
          // Send opt-out message if this is the first group message for this member (only for SMS)
          if (channel === "sms" && twoWayPhoneNumber) {
            try {
              const { sendSMSOptOutIfNeeded } = await import(
                "@/lib/utils/optOutUtils"
              );
              await sendSMSOptOutIfNeeded(
                member.id,
                member.phone_number,
                companyId,
                twoWayPhoneNumber
              );
            } catch (optOutError) {
              // Log error but don't fail the message send
              console.error(
                `Failed to send opt-out message for group message to member ${member.id}:`,
                optOutError
              );
            }
          }

          // Save message to database if message was sent successfully
          try {
            const supabaseAdmin = createAdminClient();
            // Find or create conversation
            const { data: existingConversations } = await supabaseAdmin
              .from("conversations")
              .select("id")
              .eq("associate_id", member.id)
              .eq("company_id", companyId)
              .limit(1);

            let conversationId: string | undefined;
            if (existingConversations && existingConversations.length > 0) {
              conversationId = existingConversations[0].id;
            } else {
              // Create new conversation
              const { data: newConversation, error: createError } =
                await supabaseAdmin
                  .from("conversations")
                  .insert([
                    {
                      associate_id: member.id,
                      company_id: companyId,
                    },
                  ])
                  .select()
                  .single();

              if (createError || !newConversation) {
                console.error(
                  `Error creating conversation for associate ${member.id}:`,
                  createError
                );
                // Continue without saving message - SMS was sent successfully
              } else {
                conversationId = newConversation.id;
              }
            }

            // Save message to database if we have a conversation_id
            if (conversationId) {
              const { error: insertError } = await supabaseAdmin
                .from("messages")
                .insert([
                  {
                    conversation_id: conversationId,
                    sender_type: "company",
                    body: body.message.trim(),
                    direction: "outbound",
                    status:
                      result.success &&
                      "messageId" in result &&
                      result.messageId
                        ? "queued"
                        : null,
                    sent_at: new Date().toISOString(),
                  },
                ]);

              if (insertError) {
                console.error(
                  `Error saving message to database for associate ${member.id}:`,
                  insertError
                );
                // Continue - SMS was sent successfully
              }
            }
          } catch (dbError) {
            console.error(
              `Error saving message to database for associate ${member.id}:`,
              dbError
            );
            // Continue - SMS was sent successfully
          }
        }

        // Small delay between messages to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(
          `Error sending message to ${member.phone_number}:`,
          error
        );
        errors.push({
          member_id: member.id,
          phone: member.phone_number,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    // Combine database unsubscribed members with Twilio unsubscribed members
    // Use a Map to deduplicate by member ID
    const unsubscribedMap = new Map<
      string,
      { id: string; first_name: string; last_name: string }
    >();

    unsubscribedMembers.forEach((m) => {
      unsubscribedMap.set(m.id, {
        id: m.id,
        first_name: m.first_name,
        last_name: m.last_name,
      });
    });

    twilioUnsubscribedMembers.forEach((m) => {
      unsubscribedMap.set(m.id, {
        id: m.id,
        first_name: m.first_name,
        last_name: m.last_name,
      });
    });

    const allUnsubscribedMembers = Array.from(unsubscribedMap.values());

    return NextResponse.json({
      success: true,
      total_members: members.length,
      eligible_members: eligibleMembers.length,
      messages_sent: successCount,
      messages_failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      unsubscribed_members: allUnsubscribedMembers,
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
