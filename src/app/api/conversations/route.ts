import { NextResponse } from "next/server";
import { requireCompanyId } from "@/lib/auth/getCompanyId";
import { createClient } from "@/lib/supabase/server";
import { time } from "console";

/**
 * GET /api/conversations
 * Fetch all conversations for the authenticated company with their messages
 */
export async function GET() {
  console.log("📞 GET /api/conversations called");
  try {
    const companyId = await requireCompanyId();
    console.log("✅ Company ID:", companyId);
    const supabase = await createClient();

    // Fetch conversations for this company
    const { data: conversations, error: conversationsError } = await supabase
      .from("conversations")
      .select("id, associate_id, created_at, updated_at")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false, nullsFirst: false });

    if (conversationsError) {
      console.error("Error fetching conversations:", conversationsError);
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500 }
      );
    }

    if (!conversations || conversations.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch associate details for all conversations
    const associateIds = conversations.map((conv) => conv.associate_id);
    const { data: associates, error: associatesError } = await supabase
      .from("associates")
      .select("id, first_name, last_name, phone_number")
      .in("id", associateIds);

    if (associatesError) {
      console.error("Error fetching associates:", associatesError);
      return NextResponse.json(
        { error: "Failed to fetch associates" },
        { status: 500 }
      );
    }

    // Create a map of associate_id to associate data
    const associateMap = new Map(
      (associates || []).map((assoc) => [assoc.id, assoc])
    );

    // Fetch messages for all conversations
    const conversationIds = conversations.map((conv) => conv.id);
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .in("conversation_id", conversationIds)
      .order("sent_at", { ascending: true, nullsFirst: false });

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      // Continue without messages rather than failing
    }

    // Group messages by conversation_id
    const messagesByConversation = new Map<string, typeof messages>();
    if (messages) {
      for (const message of messages) {
        const conversationId = message.conversation_id;
        if (!messagesByConversation.has(conversationId)) {
          messagesByConversation.set(conversationId, []);
        }
        messagesByConversation.get(conversationId)!.push(message);
      }
    }

    // Combine conversations with their messages and associate info
    const conversationsWithMessages = conversations
      .map((conv) => {
        const associate = associateMap.get(conv.associate_id);

        if (!associate) {
          return null;
        }

        const conversationMessages = messagesByConversation.get(conv.id) || [];
        const lastMessage =
          conversationMessages[conversationMessages.length - 1];

        return {
          conversation_id: conv.id,
          associate_id: associate.id,
          associate_name:
            `${associate.first_name || ""} ${
              associate.last_name || ""
            }`.trim() || "Unknown",
          phone_number: associate.phone_number,
          messages: conversationMessages.map((msg) => ({
            id: msg.id,
            body: msg.body,
            direction: msg.direction,
            sender_type: msg.sender_type,
            sent_at: msg.sent_at,
            status: msg.status,
          })),
          last_message: lastMessage?.body || "",
          last_message_time:
            lastMessage?.sent_at || conv.updated_at || conv.created_at,
        };
      })
      .filter(Boolean);

    return NextResponse.json(conversationsWithMessages);
  } catch (error) {
    console.error("Error in conversations endpoint:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch conversations";

    if (errorMessage.includes("Company not found")) {
      return NextResponse.json(
        { error: "Not authenticated or company not found" },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
