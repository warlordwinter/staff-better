"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  RefObject,
} from "react";
import {
  MessagesDataService,
  Conversation,
  Message,
} from "@/lib/services/messagesDataService";
import { createClient } from "@/lib/supabase/client";

export interface UseMessagesReturn {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  messageText: string;
  loading: boolean;
  sending: boolean;
  error: string | null;
  mounted: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  setSelectedConversation: (conv: Conversation | null) => void;
  setMessageText: (text: string) => void;
  handleSendMessage: () => Promise<void>;
  scrollToBottom: (smooth?: boolean) => void;
}

export function useMessages(
  isAuthenticated: boolean,
  authLoading: boolean
): UseMessagesReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState("");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Debug: Log component mount and auth state
  useEffect(() => {
    console.log("🔵 useMessages hook active", {
      isAuthenticated,
      authLoading,
      mounted,
    });
  }, [isAuthenticated, authLoading, mounted]);

  // Create Supabase client for real-time subscriptions
  const supabase = useMemo(() => {
    try {
      const client = createClient();
      console.log("✅ Supabase client created successfully");
      return client;
    } catch (error) {
      console.warn("Failed to create Supabase client:", error);
      return null;
    }
  }, []);

  // Helper function to add a message to a conversation
  const addMessageToConversation = useCallback(
    (
      conversation: Conversation,
      message: Message,
      direction: "inbound" | "outbound" | null
    ): Conversation => {
      // Check if message already exists
      if (conversation.messages.some((m) => m.id === message.id)) {
        return conversation;
      }

      const isSelected = selectedConversation?.id === conversation.id;
      return {
        ...conversation,
        messages: [...conversation.messages, message],
        lastMessage: message.text,
        timestamp: message.timestamp,
        unread: direction === "inbound" ? !isSelected : conversation.unread,
      };
    },
    [selectedConversation]
  );

  // Polling function to check for new messages (fallback if real-time fails)
  const pollForNewMessages = useCallback(async () => {
    if (!isAuthenticated || authLoading) return;

    try {
      const fetchedConversations =
        await MessagesDataService.fetchConversations();

      setConversations((prev) => {
        const updated = prev.map((existingConv) => {
          const fetchedConv = fetchedConversations.find(
            (c) => c.id === existingConv.id
          );
          if (!fetchedConv) return existingConv;

          // Find new messages
          const existingIds = new Set(existingConv.messages.map((m) => m.id));
          const newMessages = fetchedConv.messages.filter(
            (m) => !existingIds.has(m.id)
          );

          if (newMessages.length === 0) return existingConv;

          // Add all new messages
          let updatedConv = existingConv;
          newMessages.forEach((msg) => {
            const direction =
              msg.sender === "incoming" ? "inbound" : "outbound";
            updatedConv = addMessageToConversation(updatedConv, msg, direction);
          });

          return updatedConv;
        });

        // Add any new conversations
        const existingIds = new Set(prev.map((c) => c.id));
        const newConversations = fetchedConversations.filter(
          (c) => !existingIds.has(c.id)
        );

        return [...updated, ...newConversations];
      });
    } catch (error) {
      console.error("Error polling for messages:", error);
    }
  }, [isAuthenticated, authLoading, addMessageToConversation]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!supabase || !isAuthenticated || authLoading) {
      console.log("Skipping subscription setup:", {
        supabase: !!supabase,
        isAuthenticated,
        authLoading,
      });
      return;
    }

    console.log("Setting up real-time subscription for messages...");

    const channel = supabase
      .channel("messages-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          console.log("📨 Real-time event received:", payload);

          const newMessage = payload.new as {
            id: string;
            conversation_id: string;
            body: string | null;
            direction: "inbound" | "outbound" | null;
            sender_type: string;
            sent_at: string | null;
            status: string | null;
          };

          console.log("New message received:", newMessage);

          // Map database message to UI message format
          const timestamp = newMessage.sent_at || new Date().toISOString();
          const formattedTimestamp = new Date(timestamp).toLocaleTimeString(
            "en-US",
            {
              hour: "numeric",
              minute: "2-digit",
            }
          );

          const uiMessage: Message = {
            id: newMessage.id,
            text: newMessage.body || "",
            sender:
              newMessage.direction === "inbound" ? "incoming" : "outgoing",
            timestamp: formattedTimestamp,
          };

          // Add message to conversation
          setConversations((prev) => {
            const existingConv = prev.find(
              (c) => c.id === newMessage.conversation_id
            );

            if (existingConv) {
              // Conversation exists - add message
              const updated = addMessageToConversation(
                existingConv,
                uiMessage,
                newMessage.direction
              );
              return prev.map((c) =>
                c.id === newMessage.conversation_id ? updated : c
              );
            }

            // Conversation doesn't exist - fetch it
            MessagesDataService.fetchConversations()
              .then((allConversations) => {
                const fetchedConv = allConversations.find(
                  (c) => c.id === newMessage.conversation_id
                );
                if (fetchedConv) {
                  const updated = addMessageToConversation(
                    fetchedConv,
                    uiMessage,
                    newMessage.direction
                  );
                  setConversations((current) => {
                    // Check if it was already added
                    if (current.some((c) => c.id === updated.id)) {
                      return current.map((c) =>
                        c.id === updated.id ? updated : c
                      );
                    }
                    return [...current, updated];
                  });
                }
              })
              .catch((err) => {
                console.error("Error fetching new conversation:", err);
              });

            return prev;
          });
        }
      )
      .subscribe((status) => {
        console.log("📡 Subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log("✅ Successfully subscribed to messages table");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Channel subscription error");
          console.warn(
            "⚠️ Real-time subscription failed, falling back to polling"
          );
        } else if (status === "TIMED_OUT") {
          console.error("⏱️ Subscription timed out");
          console.warn(
            "⚠️ Real-time subscription timed out, falling back to polling"
          );
        } else if (status === "CLOSED") {
          console.warn("⚠️ Channel closed");
        }
      });

    return () => {
      console.log("Cleaning up subscription...");
      supabase.removeChannel(channel);
    };
  }, [supabase, isAuthenticated, authLoading, addMessageToConversation]);

  // Set up polling fallback (runs every 10 seconds, only when page is visible)
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    let pollInterval: NodeJS.Timeout | null = null;

    // Function to start/stop polling based on page visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden - stop polling
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
          console.log("⏸️ Page hidden, stopped polling");
        }
      } else {
        // Page is visible - start polling
        if (!pollInterval) {
          // Poll immediately when page becomes visible
          pollForNewMessages();
          // Then poll every 10 seconds (less frequent to reduce load)
          pollInterval = setInterval(() => {
            pollForNewMessages();
          }, 10000); // 10 seconds instead of 3
          console.log("▶️ Page visible, started polling every 10 seconds");
        }
      }
    };

    // Initial poll after a short delay
    const initialTimeout = setTimeout(() => {
      pollForNewMessages();
      // Start polling every 10 seconds
      pollInterval = setInterval(() => {
        pollForNewMessages();
      }, 10000);
    }, 2000);

    // Listen for page visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(initialTimeout);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated, authLoading, pollForNewMessages]);

  // Fetch conversations on mount
  useEffect(() => {
    const fetchConversations = async () => {
      if (!isAuthenticated || authLoading) return;

      try {
        setLoading(true);
        const conversations = await MessagesDataService.fetchConversations();

        setConversations(conversations);

        // Select first conversation if available
        if (conversations.length > 0) {
          setSelectedConversation(conversations[0]);
        }
      } catch (err) {
        console.error("Error fetching conversations:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load conversations"
        );
      } finally {
        setLoading(false);
        setMounted(true);
      }
    };

    fetchConversations();
  }, [isAuthenticated, authLoading]);

  // Scroll to bottom function
  const scrollToBottom = useCallback((smooth: boolean = true) => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      // Use scrollTop for more reliable scrolling
      if (smooth) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    } else if (messagesEndRef.current) {
      // Fallback to scrollIntoView
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }
  }, []);

  // Auto-scroll to bottom when messages change or conversation changes
  useEffect(() => {
    if (selectedConversation?.messages) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        scrollToBottom(true);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [
    selectedConversation?.messages,
    selectedConversation?.id,
    scrollToBottom,
  ]);

  // Sync selected conversation when conversations change
  useEffect(() => {
    if (!selectedConversation || conversations.length === 0) return;

    const updated = conversations.find((c) => c.id === selectedConversation.id);
    if (updated) {
      // Only update if messages changed
      const lastMessageId = updated.messages[updated.messages.length - 1]?.id;
      const prevLastMessageId =
        selectedConversation.messages[selectedConversation.messages.length - 1]
          ?.id;

      if (
        updated.messages.length !== selectedConversation.messages.length ||
        lastMessageId !== prevLastMessageId
      ) {
        setSelectedConversation(updated);
      }
    }
  }, [conversations, selectedConversation]);

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || !selectedConversation || sending) return;

    // Check if conversation has a phone number
    if (!selectedConversation.phoneNumber) {
      setError("This associate does not have a phone number");
      return;
    }

    const messageToSend = messageText.trim();
    setSending(true);
    setError(null);

    try {
      // Send message via API
      await MessagesDataService.sendMessage(
        selectedConversation.associateId,
        messageToSend
      );

      // Create message object
      const newMessage = MessagesDataService.createMessage(
        messageToSend,
        "outgoing"
      );

      // Update conversations
      setConversations((prev) => {
        const conv = prev.find((c) => c.id === selectedConversation.id);
        if (!conv) return prev;

        const updated = {
          ...conv,
          messages: [...conv.messages, newMessage],
          lastMessage: messageToSend,
          timestamp: newMessage.timestamp,
        };

        // Update selected conversation immediately
        setSelectedConversation(updated);

        return prev.map((c) =>
          c.id === selectedConversation.id ? updated : c
        );
      });

      setMessageText("");

      // Scroll to bottom after sending message
      setTimeout(() => {
        scrollToBottom(true);
      }, 50);
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }, [messageText, selectedConversation, sending, scrollToBottom]);

  const handleMessageTextChange = useCallback((text: string) => {
    setMessageText(text);
    setError(null);
  }, []);

  return {
    conversations,
    selectedConversation,
    messageText,
    loading,
    sending,
    error,
    mounted,
    messagesEndRef,
    messagesContainerRef,
    setSelectedConversation,
    setMessageText: handleMessageTextChange,
    handleSendMessage,
    scrollToBottom,
  };
}
