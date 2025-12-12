import { NextRequest, NextResponse } from "next/server";
import {
  requireCompanyId,
  requireCompanyPhoneNumber,
  requireCompanyWhatsAppNumber,
} from "@/lib/auth/getCompanyId";
import { serviceContainer } from "@/lib/services/ServiceContainer";

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

    // Get MessageService from container
    const messageService = serviceContainer.getMessageService();

    // Handle different message types
    if (type === "direct") {
      return await handleDirectMessage(
        body,
        companyId,
        senderNumber,
        channel,
        isWhatsAppTemplate,
        messageService
      );
    } else if (type === "associate") {
      return await handleAssociateMessage(
        body,
        companyId,
        senderNumber,
        twoWayPhoneNumber,
        channel,
        isWhatsAppTemplate,
        messageService
      );
    } else if (type === "group") {
      return await handleGroupMessage(
        body,
        companyId,
        senderNumber,
        twoWayPhoneNumber,
        channel,
        isWhatsAppTemplate,
        messageService
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
  isWhatsAppTemplate: boolean,
  messageService: any
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

  // Send message via MessageService
  const result = await messageService.sendDirectMessage(
    to,
    body.message.trim(),
    conversation_id,
    channel,
    companyId,
    senderNumber,
    isWhatsAppTemplate,
    isWhatsAppTemplate
      ? {
          contentSid: body.contentSid,
          contentVariables: body.contentVariables,
        }
      : undefined
  );

  if (!result.success) {
    if (result.code === "21610" || String(result.code) === "21610") {
      return NextResponse.json(
        { error: "Recipient has opted out of SMS messages" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to send message",
        details: result.error,
        code: result.code,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message_id: result.messageId,
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
  isWhatsAppTemplate: boolean,
  messageService: any
) {
  const { id: associateId } = body;

  if (!associateId || typeof associateId !== "string") {
    return NextResponse.json(
      { error: "id is required and must be a string for associate type" },
      { status: 400 }
    );
  }

  // Send message via MessageService
  const result = await messageService.sendMessageToAssociate(
    associateId,
    body.message.trim(),
    channel,
    companyId,
    senderNumber,
    twoWayPhoneNumber,
    isWhatsAppTemplate,
    isWhatsAppTemplate
      ? {
          contentSid: body.contentSid,
          contentVariables: body.contentVariables,
        }
      : undefined
  );

  if (!result.success) {
    if (
      result.code === "21610" ||
      String(result.code) === "21610" ||
      (typeof result.error === "string" &&
        result.error.toLowerCase().includes("unsubscribed"))
    ) {
      return NextResponse.json(
        {
          error:
            "You cannot message this employee because they have unsubscribed from SMS notifications.",
          code: result.code || "21610",
          userFriendly: true,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to send message",
        details: result.error,
        code: result.code,
      },
      { status: result.error === "Associate not found" ? 404 : 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message_id: result.messageId,
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
  isWhatsAppTemplate: boolean,
  messageService: any
) {
  const { id: groupId } = body;

  if (!groupId || typeof groupId !== "string") {
    return NextResponse.json(
      { error: "id is required and must be a string for group type" },
      { status: 400 }
    );
  }

  // Send message via MessageService
  const result = await messageService.sendMessageToGroup(
    groupId,
    body.message.trim(),
    channel,
    companyId,
    senderNumber,
    twoWayPhoneNumber,
    isWhatsAppTemplate,
    isWhatsAppTemplate
      ? {
          contentSid: body.contentSid,
          contentVariables: body.contentVariables,
        }
      : undefined
  );

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Failed to send group message",
        total_members: result.total_members,
        eligible_members: result.eligible_members,
        unsubscribed_members: result.unsubscribed_members,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    total_members: result.total_members,
    eligible_members: result.eligible_members,
    messages_sent: result.messages_sent,
    messages_failed: result.messages_failed,
    errors: result.errors,
    unsubscribed_members: result.unsubscribed_members,
  });
}
