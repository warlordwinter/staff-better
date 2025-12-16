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
import {
  computeAutoScrollKey,
  shouldSyncSelectedConversation,
} from "@/hooks/useMessages.logic";

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
  // Track when we last auto-scrolled so we don't scroll on status-only updates
  const lastAutoScrollKeyRef = useRef<string | null>(null);

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

      // Add message to conversation
      const updatedMessages = [...conversation.messages, message];

      // IMPORTANT: Preserve the conversation's channel from the database
      // Don't recalculate based on message counts - the channel is set when
      // the conversation is created and should remain consistent.
      // The channel represents which channel the conversation is on, not
      // which channel has more messages.
      const conversationChannel = conversation.channel || "sms";

      return {
        ...conversation,
        messages: updatedMessages,
        lastMessage: message.text,
        timestamp: message.timestamp,
        unread: direction === "inbound" ? !isSelected : conversation.unread,
        channel: conversationChannel, // Preserve existing channel, don't recalculate
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
            delivered_at: string | null;
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

          const body = newMessage.body || "";
          // Determine channel for individual message
          const messageChannel: "sms" | "whatsapp" =
            body.includes("[Template:") ||
            body.toLowerCase().includes("whatsapp") ||
            (newMessage.sender_type &&
              newMessage.sender_type.toLowerCase().includes("whatsapp"))
              ? "whatsapp"
              : "sms";

          // Extract template SID if this is a template message
          const templateSidMatch = body.match(/\[Template:\s*([^\]]+)\]/);
          const templateSid = templateSidMatch
            ? templateSidMatch[1].trim()
            : null;

          // Extract template variables if present
          const variablesMatch = body.match(/\[Variables:\s*({[^}]+})\]/);
          let templateVariables: Record<string, string> | null = null;
          if (variablesMatch) {
            try {
              templateVariables = JSON.parse(variablesMatch[1]);
            } catch (error) {
              console.error("Failed to parse template variables:", error);
            }
          }

          // Helper function to substitute variables in template content
          const substituteVariables = (
            content: string,
            vars: Record<string, string> | null
          ): string => {
            if (!vars || Object.keys(vars).length === 0) return content;
            let substituted = content;
            const sortedKeys = Object.keys(vars).sort(
              (a, b) => parseInt(a) - parseInt(b)
            );
            for (const key of sortedKeys) {
              const placeholder = `{{${key}}}`;
              const value = vars[key];
              substituted = substituted.replace(
                new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"),
                value
              );
            }
            return substituted;
          };

          // Handle template messages - fetch template details asynchronously
          let displayText: string =
            body
              .replace(/\[Template: [^\]]+\]\s*/g, "")
              .replace(/\[Variables: [^\]]+\]\s*/g, "")
              .trim() || body;
          let templateName: string | undefined;
          let templateContent: string | undefined;

          // If this is a template message, fetch template details
          if (templateSid) {
            // Fetch template details asynchronously
            fetch(`/api/templates/${templateSid}`)
              .then((res) => res.json())
              .then((templateData) => {
                if (templateData.friendlyName) {
                  // Substitute variables in template content if available
                  let finalContent = templateData.content || "";
                  if (finalContent && templateVariables) {
                    finalContent = substituteVariables(
                      finalContent,
                      templateVariables
                    );
                  }

                  // Update the message with template details
                  setConversations((prev) => {
                    return prev.map((conv) => {
                      if (conv.id === newMessage.conversation_id) {
                        return {
                          ...conv,
                          messages: conv.messages.map((msg) => {
                            if (msg.id === newMessage.id) {
                              // Show template content with substituted variables if available, otherwise show template name
                              // The template name will be shown separately in the UI header
                              const templateDisplayText =
                                finalContent || templateData.friendlyName;
                              return {
                                ...msg,
                                text: templateDisplayText,
                                templateName: templateData.friendlyName,
                                templateContent: finalContent,
                                templateSid: templateSid,
                              };
                            }
                            return msg;
                          }),
                        };
                      }
                      return conv;
                    });
                  });
                }
              })
              .catch((error) => {
                console.error("Failed to fetch template details:", error);
                // Keep the original display text if fetch fails
              });

            // Show placeholder while fetching
            displayText = `[Template: ${templateSid}]`;
          }

          const uiMessage: Message = {
            id: newMessage.id,
            text: displayText,
            sender:
              newMessage.direction === "inbound" ? "incoming" : "outgoing",
            timestamp: formattedTimestamp,
            channel: messageChannel,
            templateSid: templateSid || undefined,
            templateName,
            templateContent,
            status: newMessage.status || null,
            deliveredAt: newMessage.delivered_at || null,
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
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const updatedMessage = payload.new as {
            id: string;
            conversation_id: string;
            status: string | null;
            delivered_at: string | null;
          };

          console.log("📨 [REALTIME] Message UPDATE event received:", {
            messageId: updatedMessage.id,
            conversationId: updatedMessage.conversation_id,
            newStatus: updatedMessage.status,
            deliveredAt: updatedMessage.delivered_at,
          });

          // Update message status in the UI
          setConversations((prev) => {
            const updated = prev.map((conv) => {
              if (conv.id === updatedMessage.conversation_id) {
                const messageUpdated = conv.messages.some(
                  (msg) => msg.id === updatedMessage.id
                );
                if (messageUpdated) {
                  console.log(
                    `✅ [REALTIME] Updating message ${updatedMessage.id} status to ${updatedMessage.status}`
                  );
                }
                return {
                  ...conv,
                  messages: conv.messages.map((msg) => {
                    if (msg.id === updatedMessage.id) {
                      return {
                        ...msg,
                        status: updatedMessage.status || undefined,
                        deliveredAt: updatedMessage.delivered_at || undefined,
                      };
                    }
                    return msg;
                  }),
                };
              }
              return conv;
            });
            return updated;
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

  /**
   * Auto-scroll behavior:
   * - Scroll when a new message arrives (message count or last message id changes)
   * - Scroll when switching conversations
   * - Do NOT scroll for status-only updates (e.g., delivered -> read)
   */
  const selectedMessageCount = selectedConversation?.messages?.length ?? 0;
  const selectedLastMessageId =
    selectedConversation && selectedMessageCount > 0
      ? selectedConversation.messages[selectedMessageCount - 1]?.id ?? null
      : null;

  useEffect(() => {
    if (!selectedConversation) return;

    const key = computeAutoScrollKey(selectedConversation);
    if (!key) return;

    // If nothing that affects scroll position changed, skip auto-scroll.
    if (lastAutoScrollKeyRef.current === key) return;
    lastAutoScrollKeyRef.current = key;

    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(() => {
      scrollToBottom(true);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [
    selectedConversation?.id,
    selectedMessageCount,
    selectedLastMessageId,
    scrollToBottom,
  ]);

  /**
   * Keep `selectedConversation` in sync with the canonical `conversations` array.
   *
   * Important: message status updates (delivered/read) do NOT change message count
   * or last message id. If we only sync on those fields, the UI can lag behind.
   *
   * We sync whenever the conversation object reference changes in `conversations`.
   */
  useEffect(() => {
    if (!selectedConversation || conversations.length === 0) return;

    const nextSelected = shouldSyncSelectedConversation(
      selectedConversation,
      conversations
    );
    if (nextSelected) setSelectedConversation(nextSelected);
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

    // Clear input immediately for better UX
    setMessageText("");

    try {
      // Determine channel: if conversation is WhatsApp, use WhatsApp
      // Otherwise default to SMS (the API will auto-switch if needed based on 24h rule)
      const channel =
        selectedConversation.channel === "whatsapp" ? "whatsapp" : "sms";

      // Send message via API
      // The message will be added to the UI via real-time subscription
      // when it's saved to the database, preventing duplicates
      await MessagesDataService.sendMessage(
        selectedConversation.associateId,
        messageToSend,
        channel
      );

      // Scroll to bottom after sending message
      // The real-time subscription will add the message shortly
      setTimeout(() => {
        scrollToBottom(true);
      }, 100);
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err instanceof Error ? err.message : "Failed to send message");
      // Restore message text on error so user can retry
      setMessageText(messageToSend);
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
