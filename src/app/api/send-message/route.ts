import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  requireCompanyId,
  requireCompanyPhoneNumber,
  requireCompanyWhatsAppNumber,
} from "@/lib/auth/getCompanyId";
import { sendTwoWaySMS, formatPhoneNumber } from "@/lib/twilio/sms";
import {
  sendWhatsAppBusiness,
  sendWhatsAppBusinessTemplate,
} from "@/lib/twilio/whatsapp";
import { GroupsDaoSupabase } from "@/lib/dao/implementations/supabase/GroupsDaoSupabase";
import { TwilioMessageService } from "@/lib/services/implementations/TwilioMessageService";

const groupsDao = new GroupsDaoSupabase();

/**
 * POST /api/send-message
 *
 * Unified endpoint for sending messages via SMS or WhatsApp.
 * Supports three message types:
 * 1. "associate" - Send to a single associate by ID
 * 2. "group" - Send to all members of a group by group ID
 * 3. "direct" - Send directly to a phone number (requires conversation_id)
 *
 * Request body:
 * - type: "associate" | "group" | "direct" (required)
 * - id: string (required for "associate" or "group" type)
 * - to: string (required for "direct" type - recipient phone number)
 * - conversation_id: string (required for "direct" type)
 * - message: string (required for regular messages)
 * - channel: "sms" | "whatsapp" (optional, defaults to "sms")
 * - contentSid: string (required for WhatsApp template messages)
 * - contentVariables: object (optional, for WhatsApp template variables)
 *
 * Response:
 * - 200: Success response with message details
 * - 400: Validation error
 * - 404: Resource not found
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const companyId = await requireCompanyId();
    const body = await request.json();

    // Validate type
    const type = body.type;
    if (!type || !["associate", "group", "direct"].includes(type)) {
      return NextResponse.json(
        {
          error:
            'type is required and must be one of: "associate", "group", "direct"',
        },
        { status: 400 }
      );
    }

    // Get channel (default to SMS for backwards compatibility)
    const channel = body.channel === "whatsapp" ? "whatsapp" : "sms";

    // Validate message or template
    const isWhatsAppTemplate = channel === "whatsapp" && body.contentSid;

    if (isWhatsAppTemplate) {
      // Template-based WhatsApp message - contentSid is required
      if (!body.contentSid || typeof body.contentSid !== "string") {
        return NextResponse.json(
          { error: "contentSid is required for WhatsApp template messages" },
          { status: 400 }
        );
      }
    } else {
      // Regular message - message body is required
      if (
        !body.message ||
        typeof body.message !== "string" ||
        !body.message.trim()
      ) {
        return NextResponse.json(
          { error: "message is required and must be a non-empty string" },
          { status: 400 }
        );
      }
    }

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

    // Handle different message types
    if (type === "direct") {
      return await handleDirectMessage(
        body,
        companyId,
        senderNumber,
        channel,
        isWhatsAppTemplate
      );
    } else if (type === "associate") {
      return await handleAssociateMessage(
        body,
        companyId,
        senderNumber,
        twoWayPhoneNumber,
        channel,
        isWhatsAppTemplate
      );
    } else if (type === "group") {
      return await handleGroupMessage(
        body,
        companyId,
        senderNumber,
        twoWayPhoneNumber,
        channel,
        isWhatsAppTemplate
      );
    }

    return NextResponse.json(
      { error: "Invalid message type" },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("Failed to send message:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send message";

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
 * Handle direct message (existing send-message functionality)
 */
async function handleDirectMessage(
  body: any,
  companyId: string,
  senderNumber: string,
  channel: "sms" | "whatsapp",
  isWhatsAppTemplate: boolean
) {
  const { conversation_id, to } = body;

  // Validate required fields for direct messages
  if (!conversation_id || typeof conversation_id !== "string") {
    return NextResponse.json(
      { error: "conversation_id is required and must be a string" },
      { status: 400 }
    );
  }

  if (!to || typeof to !== "string") {
    return NextResponse.json(
      { error: "to (recipient phone number) is required and must be a string" },
      { status: 400 }
    );
  }

  // Send message
  let result;
  const formattedPhone = formatPhoneNumber(to);

  if (channel === "whatsapp") {
    if (isWhatsAppTemplate) {
      result = await sendWhatsAppBusinessTemplate(
        {
          to: formattedPhone,
          contentSid: body.contentSid,
          contentVariables: body.contentVariables,
        },
        senderNumber
      );
    } else {
      result = await sendWhatsAppBusiness(
        {
          to: formattedPhone,
          body: body.message.trim(),
        },
        senderNumber
      );
    }
  } else {
    const messageService = new TwilioMessageService();
    result = await messageService.sendSMS({
      to: formattedPhone,
      body: body.message.trim(),
      from: senderNumber,
    });
  }

  if (!result.success) {
    const errorCode = "code" in result ? result.code : null;
    const errorMessage = "error" in result ? result.error : "Unknown error";

    if (errorCode === "21610" || String(errorCode) === "21610") {
      return NextResponse.json(
        { error: "Recipient has opted out of SMS messages" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to send message",
        details: errorMessage,
        code: errorCode,
      },
      { status: 500 }
    );
  }

  // Save to database
  const supabaseAdmin = createAdminClient();
  const messageBody = isWhatsAppTemplate
    ? `[Template: ${body.contentSid}]`
    : body.message.trim();

  const { error: insertError } = await supabaseAdmin.from("messages").insert([
    {
      conversation_id,
      sender_type: "company",
      body: messageBody,
      direction: "outbound",
      status:
        result.success && "messageId" in result && result.messageId
          ? "queued"
          : null,
      sent_at: new Date().toISOString(),
      twilio_sid: "messageId" in result ? result.messageId : null,
    },
  ]);

  if (insertError) {
    console.error("Error saving message to database:", insertError);
    // Continue - message was sent successfully
  }

  return NextResponse.json({
    success: true,
    message_id: "messageId" in result ? result.messageId : null,
    to: to,
  });
}

/**
 * Handle associate message (single recipient)
 */
async function handleAssociateMessage(
  body: any,
  companyId: string,
  senderNumber: string,
  twoWayPhoneNumber: string | undefined,
  channel: "sms" | "whatsapp",
  isWhatsAppTemplate: boolean
) {
  const { id: associateId } = body;

  if (!associateId || typeof associateId !== "string") {
    return NextResponse.json(
      { error: "id is required and must be a string for associate type" },
      { status: 400 }
    );
  }

  // Get the associate details
  const supabase = await (await import("@/lib/supabase/server")).createClient();

  const { data: associate, error: associateError } = await supabase
    .from("associates")
    .select("id, first_name, last_name, phone_number, sms_opt_out")
    .eq("id", associateId)
    .single();

  if (associateError || !associate) {
    return NextResponse.json({ error: "Associate not found" }, { status: 404 });
  }

  // Check if associate has opted out
  if (associate.sms_opt_out) {
    return NextResponse.json(
      { error: "Associate has opted out of SMS messages" },
      { status: 400 }
    );
  }

  // Check if phone number exists
  if (!associate.phone_number) {
    return NextResponse.json(
      { error: "Associate does not have a phone number" },
      { status: 400 }
    );
  }

  // Send message
  const formattedPhone = formatPhoneNumber(associate.phone_number);
  let result;

  if (channel === "whatsapp") {
    if (isWhatsAppTemplate) {
      result = await sendWhatsAppBusinessTemplate(
        {
          to: formattedPhone,
          contentSid: body.contentSid,
          contentVariables: body.contentVariables,
        },
        senderNumber
      );
    } else {
      result = await sendWhatsAppBusiness(
        {
          to: formattedPhone,
          body: body.message.trim(),
        },
        senderNumber
      );
    }
  } else {
    const messageService = new TwilioMessageService();
    result = await messageService.sendSMS({
      to: formattedPhone,
      body: body.message.trim(),
      from: senderNumber,
    });
  }

  if (!result.success) {
    const errorCode = "code" in result ? result.code : null;
    const errorMessage = "error" in result ? result.error : "Unknown error";

    if (
      errorCode === "21610" ||
      String(errorCode) === "21610" ||
      (typeof errorMessage === "string" &&
        errorMessage.toLowerCase().includes("unsubscribed"))
    ) {
      return NextResponse.json(
        {
          error:
            "You cannot message this employee because they have unsubscribed from SMS notifications.",
          code: errorCode || "21610",
          userFriendly: true,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to send message",
        details: errorMessage,
        code: errorCode,
      },
      { status: 500 }
    );
  }

  // Send opt-out message if this is the first direct message (only for SMS)
  if (channel === "sms" && twoWayPhoneNumber) {
    try {
      const { sendSMSOptOutIfNeeded } = await import("@/lib/utils/optOutUtils");
      await sendSMSOptOutIfNeeded(
        associate.id,
        associate.phone_number,
        companyId,
        twoWayPhoneNumber
      );
    } catch (optOutError) {
      console.error(
        `Failed to send opt-out message for direct message to associate ${associate.id}:`,
        optOutError
      );
    }
  }

  // Find or create conversation and save message to database
  try {
    const supabaseAdmin = createAdminClient();

    // Find or create conversation
    const { data: existingConversations } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("associate_id", associateId)
      .eq("company_id", companyId)
      .limit(1);

    let conversationId: string | undefined;
    if (existingConversations && existingConversations.length > 0) {
      conversationId = existingConversations[0].id;
    } else {
      // Create new conversation
      const { data: newConversation, error: createError } = await supabaseAdmin
        .from("conversations")
        .insert([
          {
            associate_id: associateId,
            company_id: companyId,
          },
        ])
        .select()
        .single();

      if (createError || !newConversation) {
        console.error("Error creating conversation:", createError);
      } else {
        conversationId = newConversation.id;
      }
    }

    // Save message to database if we have a conversation_id
    if (conversationId) {
      const messageBody = isWhatsAppTemplate
        ? `[Template: ${body.contentSid}]`
        : body.message.trim();

      const { error: insertError } = await supabaseAdmin
        .from("messages")
        .insert([
          {
            conversation_id: conversationId,
            sender_type: "company",
            body: messageBody,
            direction: "outbound",
            status:
              result.success && "messageId" in result && result.messageId
                ? "queued"
                : null,
            sent_at: new Date().toISOString(),
            twilio_sid: "messageId" in result ? result.messageId : null,
          },
        ]);

      if (insertError) {
        console.error("Error saving message to database:", insertError);
      }
    }
  } catch (dbError) {
    console.error("Error saving message to database:", dbError);
  }

  return NextResponse.json({
    success: true,
    message_id: "messageId" in result ? result.messageId : null,
    to: associate.phone_number,
  });
}

/**
 * Handle group message (multiple recipients)
 */
async function handleGroupMessage(
  body: any,
  companyId: string,
  senderNumber: string,
  twoWayPhoneNumber: string | undefined,
  channel: "sms" | "whatsapp",
  isWhatsAppTemplate: boolean
) {
  const { id: groupId } = body;

  if (!groupId || typeof groupId !== "string") {
    return NextResponse.json(
      { error: "id is required and must be a string for group type" },
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
        if (isWhatsAppTemplate) {
          result = await sendWhatsAppBusinessTemplate(
            {
              to: formattedPhone,
              contentSid: body.contentSid,
              contentVariables: body.contentVariables,
            },
            senderNumber
          );
        } else {
          result = await sendWhatsAppBusiness(
            {
              to: formattedPhone,
              body: body.message.trim(),
            },
            senderNumber
          );
        }
      } else {
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
            } else {
              conversationId = newConversation.id;
            }
          }

          // Save message to database if we have a conversation_id
          if (conversationId) {
            const messageBody = isWhatsAppTemplate
              ? `[Template: ${body.contentSid}]`
              : body.message.trim();

            const { error: insertError } = await supabaseAdmin
              .from("messages")
              .insert([
                {
                  conversation_id: conversationId,
                  sender_type: "company",
                  body: messageBody,
                  direction: "outbound",
                  status:
                    result.success && "messageId" in result && result.messageId
                      ? "queued"
                      : null,
                  sent_at: new Date().toISOString(),
                  twilio_sid: "messageId" in result ? result.messageId : null,
                },
              ]);

            if (insertError) {
              console.error(
                `Error saving message to database for associate ${member.id}:`,
                insertError
              );
            }
          }
        } catch (dbError) {
          console.error(
            `Error saving message to database for associate ${member.id}:`,
            dbError
          );
        }
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

  // Combine database unsubscribed members with Twilio unsubscribed members
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
}
