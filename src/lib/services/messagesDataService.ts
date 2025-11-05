/**
 * Messages Data Service
 *
 * Client-side service for managing messaging conversations.
 * Handles UI data transformations and API communication.
 */

export interface Conversation {
  id: string; // conversation_id from database
  associateId: string;
  name: string;
  initials: string;
  phoneNumber: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  messages: Message[];
}

export interface Message {
  id: string;
  text: string;
  sender: "incoming" | "outgoing";
  timestamp: string;
}

interface SendMessageResponse {
  success: boolean;
  message_id?: string;
  to?: string;
  error?: string;
  details?: string;
}

/**
 * Helper function to generate initials from name
 */
function getInitials(
  firstName: string | null,
  lastName: string | null
): string {
  const first = firstName?.charAt(0).toUpperCase() || "";
  const last = lastName?.charAt(0).toUpperCase() || "";
  return `${first}${last}` || "??";
}

/**
 * Messages API Service
 */
export class MessagesDataService {
  /**
   * Fetch all conversations with their messages from the database
   */
  static async fetchConversations(): Promise<Conversation[]> {
    const response = await fetch("/api/conversations");

    if (!response.ok) {
      throw new Error("Failed to fetch conversations");
    }

    const data = await response.json();

    // Transform API response to Conversation format
    return data.map((conv: any) => {
      const name = conv.associate_name || "Unknown";
      const nameParts = name.split(" ");
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(" ") || null;

      // Transform messages from database format to UI format
      const messages: Message[] = (conv.messages || []).map((msg: any) => {
        const timestamp = msg.sent_at
          ? new Date(msg.sent_at).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })
          : "";

        return {
          id: msg.id,
          text: msg.body || "",
          sender: msg.direction === "inbound" ? "incoming" : "outgoing",
          timestamp,
        };
      });

      // Get last message info
      const lastMessage =
        messages.length > 0 ? messages[messages.length - 1] : null;

      return {
        id: conv.conversation_id,
        associateId: conv.associate_id,
        name,
        initials: getInitials(firstName, lastName),
        phoneNumber: conv.phone_number,
        lastMessage: lastMessage?.text || "",
        timestamp: lastMessage?.timestamp || "",
        unread: false, // TODO: implement unread tracking
        messages,
      };
    });
  }

  /**
   * Send a message to an associate via SMS
   */
  static async sendMessage(
    associateId: string,
    message: string
  ): Promise<SendMessageResponse> {
    const response = await fetch(`/api/associates/${associateId}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: message.trim() }),
    });

    const data: SendMessageResponse = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || data.details || "Failed to send message");
    }

    return data;
  }

  /**
   * Create a new message object with timestamp
   */
  static createMessage(text: string, sender: "incoming" | "outgoing"): Message {
    const timestamp = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      sender,
      timestamp,
    };
  }
}
