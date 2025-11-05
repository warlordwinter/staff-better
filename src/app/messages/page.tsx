"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import Navbar from "@/components/ui/navBar";
import Footer from "@/components/ui/footer";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import { useAuthCheck } from "@/hooks/useAuthCheck";
import {
  MessagesDataService,
  Conversation,
  Message,
} from "@/lib/services/messagesDataService";
import { createClient } from "@/lib/supabase/client";

export default function MessagesPage() {
  const { loading: authLoading, isAuthenticated } = useAuthCheck();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState("");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug: Log component mount and auth state
  useEffect(() => {
    console.log("🔵 MessagesPage mounted", {
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

  // Use ref to track selected conversation ID without causing re-subscriptions
  const selectedConversationIdRef = useRef<string | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversation?.id || null;
  }, [selectedConversation]);

  // Keep conversations ref in sync with state
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Polling function to check for new messages (fallback if real-time fails)
  const pollForNewMessages = useCallback(async () => {
    if (!isAuthenticated || authLoading) return;

    try {
      const conversations = await MessagesDataService.fetchConversations();

      // Check for new messages in all conversations
      conversations.forEach((conv) => {
        if (conv.messages.length > 0) {
          // Check if we have this conversation in state
          const existingConv = conversationsRef.current.find(
            (c) => c.id === conv.id
          );

          if (existingConv) {
            // Check if there are new messages
            const existingMessageIds = new Set(
              existingConv.messages.map((m) => m.id)
            );
            const newMessages = conv.messages.filter(
              (m) => !existingMessageIds.has(m.id)
            );

            if (newMessages.length > 0) {
              console.log(
                `📬 Found ${newMessages.length} new message(s) via polling for conversation ${conv.id}`
              );

              setConversations((prev) => {
                return prev.map((c) => {
                  if (c.id === conv.id) {
                    const updated = {
                      ...c,
                      messages: [...c.messages, ...newMessages],
                      lastMessage: newMessages[newMessages.length - 1].text,
                      timestamp: newMessages[newMessages.length - 1].timestamp,
                    };

                    // Update selected conversation if it's the current one
                    if (selectedConversationIdRef.current === conv.id) {
                      setSelectedConversation(updated);
                    }

                    return updated;
                  }
                  return c;
                });
              });
            }
          } else {
            // New conversation - add it
            setConversations((prev) => {
              if (prev.some((c) => c.id === conv.id)) {
                return prev;
              }
              return [...prev, conv];
            });
          }
        }
      });
    } catch (error) {
      console.error("Error polling for messages:", error);
    }
  }, [isAuthenticated, authLoading]);

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

          // Check current conversations from ref (synchronous check)
          const currentConversations = conversationsRef.current;
          const existingConversation = currentConversations.find(
            (conv) => conv.id === newMessage.conversation_id
          );

          // If conversation exists, update it with the new message
          if (existingConversation) {
            // Check if message already exists (prevent duplicates)
            const messageExists = existingConversation.messages.some(
              (msg) => msg.id === uiMessage.id
            );

            if (!messageExists) {
              console.log("Updating existing conversation with new message:", {
                conversationId: newMessage.conversation_id,
                messageId: uiMessage.id,
                direction: newMessage.direction,
              });

              const isSelected =
                selectedConversationIdRef.current === existingConversation.id;

              setConversations((prevConversations) => {
                const conv = prevConversations.find(
                  (c) => c.id === newMessage.conversation_id
                );
                if (!conv) {
                  console.warn("Conversation not found in state during update");
                  return prevConversations;
                }

                // Create new array reference to ensure React detects the change
                const updatedConv = {
                  ...conv,
                  messages: [...conv.messages, uiMessage], // New array reference
                  lastMessage: uiMessage.text,
                  timestamp: uiMessage.timestamp,
                  unread:
                    newMessage.direction === "inbound"
                      ? !isSelected
                      : conv.unread,
                };

                // Update selected conversation if it's the current one
                if (isSelected) {
                  console.log("Updating selected conversation");
                  setSelectedConversation(updatedConv);
                }

                // Return new array to ensure React detects the change
                const updatedConversations = prevConversations.map((c) =>
                  c.id === newMessage.conversation_id ? updatedConv : c
                );

                // Update ref immediately
                conversationsRef.current = updatedConversations;

                return updatedConversations;
              });
            } else {
              console.log("Message already exists, skipping");
            }
          } else {
            // Conversation doesn't exist in state - fetch it from API
            console.log(
              "Conversation not found in state, fetching from API:",
              newMessage.conversation_id
            );

            MessagesDataService.fetchConversations()
              .then((allConversations) => {
                const newConversation = allConversations.find(
                  (c) => c.id === newMessage.conversation_id
                );

                if (newConversation) {
                  // Add the new message to the conversation if it's not already there
                  const messageExists = newConversation.messages.some(
                    (msg) => msg.id === uiMessage.id
                  );

                  if (!messageExists) {
                    // Create new array reference
                    newConversation.messages = [
                      ...newConversation.messages,
                      uiMessage,
                    ];
                    newConversation.lastMessage = uiMessage.text;
                    newConversation.timestamp = uiMessage.timestamp;
                    if (newMessage.direction === "inbound") {
                      newConversation.unread = true;
                    }
                  }

                  setConversations((prev) => {
                    // Check if it's already been added (race condition)
                    const existing = prev.find(
                      (c) => c.id === newConversation.id
                    );
                    if (existing) {
                      // Update existing conversation with new message
                      const existingMessageIds = new Set(
                        existing.messages.map((m) => m.id)
                      );
                      const hasNewMessage = existingMessageIds.has(
                        uiMessage.id
                      );

                      if (hasNewMessage) {
                        console.log(
                          "Message already in conversation, skipping"
                        );
                        return prev; // Message already added
                      }

                      const updatedConversations = prev.map((conv) => {
                        if (conv.id === newConversation.id) {
                          return {
                            ...conv,
                            messages: [...conv.messages, uiMessage], // New array reference
                            lastMessage: uiMessage.text,
                            timestamp: uiMessage.timestamp,
                            unread:
                              newMessage.direction === "inbound"
                                ? !selectedConversationIdRef.current ||
                                  selectedConversationIdRef.current !== conv.id
                                : conv.unread,
                          };
                        }
                        return conv;
                      });

                      // Update ref
                      conversationsRef.current = updatedConversations;

                      return updatedConversations;
                    }

                    // Add new conversation - create new array reference
                    const updatedConversations = [...prev, newConversation];
                    conversationsRef.current = updatedConversations;
                    console.log("Added new conversation to state");

                    return updatedConversations;
                  });

                  // Update selected conversation if it's the current one
                  if (
                    selectedConversationIdRef.current === newConversation.id
                  ) {
                    console.log("Updating selected conversation (new)");
                    setSelectedConversation(newConversation);
                  }
                } else {
                  console.warn(
                    "Conversation not found in API:",
                    newMessage.conversation_id
                  );
                }
              })
              .catch((err) => {
                console.error("Error fetching new conversation:", err);
              });
          }
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
  }, [supabase, isAuthenticated, authLoading]);

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

  // Update selected conversation when conversations change
  // This ensures the selected conversation always has the latest messages
  useEffect(() => {
    if (selectedConversation && conversations.length > 0) {
      const updated = conversations.find(
        (c) => c.id === selectedConversation.id
      );
      if (updated) {
        // Only update if messages changed to avoid unnecessary re-renders
        if (
          updated.messages.length !== selectedConversation.messages.length ||
          updated.messages[updated.messages.length - 1]?.id !==
            selectedConversation.messages[
              selectedConversation.messages.length - 1
            ]?.id
        ) {
          console.log("Syncing selected conversation with updated messages");
          setSelectedConversation(updated);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations]);

  // Show loading spinner while checking authentication or loading data
  if (authLoading || !mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner />
      </div>
    );
  }

  // Don't render content if user is not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  const handleSendMessage = async () => {
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

      // Update the conversations state
      const updatedConversations = conversations.map((conv) => {
        if (conv.id === selectedConversation.id) {
          const updatedConv = {
            ...conv,
            messages: [...conv.messages, newMessage],
            lastMessage: messageToSend,
            timestamp: newMessage.timestamp,
          };
          setSelectedConversation(updatedConv);
          return updatedConv;
        }
        return conv;
      });

      setConversations(updatedConversations);
      setMessageText("");
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 flex h-[calc(100vh-64px)]">
        {/* Left Pane - Conversation List */}
        <div className="w-80 border-r border-gray-200 flex flex-col bg-white h-full">
          {/* Messages Header */}
          <div className="p-6 border-b border-gray-200 flex-shrink-0">
            <h1 className="text-3xl font-bold text-black">Messages</h1>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>No associates with phone numbers found.</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedConversation?.id === conversation.id
                      ? "bg-gray-100"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {conversation.initials}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-black truncate">
                          {conversation.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {conversation.unread && (
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          )}
                          <span className="text-xs text-gray-500">
                            {conversation.timestamp}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 truncate text-left">
                        {conversation.lastMessage}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Pane - Chat Window */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-black">
                  {selectedConversation?.name}
                </h2>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {selectedConversation?.messages?.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender === "outgoing"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        message.sender === "outgoing"
                          ? "bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white"
                          : "bg-gray-200 text-gray-900"
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                {error && (
                  <div className="mb-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                    {error}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      setError(null);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !sending) {
                        handleSendMessage();
                      }
                    }}
                    placeholder="Enter Message Here"
                    disabled={sending}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50 disabled:opacity-50"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sending}
                    className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-500 text-lg">
                Select a conversation to start messaging
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
