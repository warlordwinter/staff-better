/**
 * Messages Data Service
 *
 * Client-side service for managing messaging conversations.
 * Handles UI data transformations and API communication.
 */

export interface Conversation {
  id: string;
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

interface Associate {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string;
  email_address: string | null;
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
 * Helper function to get full name
 */
function getName(firstName: string | null, lastName: string | null): string {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Unknown";
}

/**
 * Transform associate to conversation
 */
function associateToConversation(associate: Associate): Conversation {
  const name = getName(associate.first_name, associate.last_name);
  return {
    id: associate.id,
    associateId: associate.id,
    name,
    initials: getInitials(associate.first_name, associate.last_name),
    phoneNumber: associate.phone_number,
    lastMessage: "",
    timestamp: "",
    unread: false,
    messages: [],
  };
}

/**
 * Messages API Service
 */
export class MessagesDataService {
  /**
   * Fetch all conversations (associates with phone numbers)
   */
  static async fetchConversations(): Promise<Conversation[]> {
    const response = await fetch("/api/associates");

    if (!response.ok) {
      throw new Error("Failed to fetch associates");
    }

    const associates: Associate[] = await response.json();

    // Filter associates with phone numbers and convert to conversations
    return associates
      .filter((associate) => associate.phone_number)
      .map(associateToConversation);
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
