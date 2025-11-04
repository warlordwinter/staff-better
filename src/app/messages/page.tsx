"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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

  // Create Supabase client for real-time subscriptions
  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch (error) {
      console.warn("Failed to create Supabase client:", error);
      return null;
    }
  }, []);

  // Use ref to track selected conversation ID without causing re-subscriptions
  const selectedConversationIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedConversationIdRef.current = selectedConversation?.id || null;
  }, [selectedConversation]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!supabase || !isAuthenticated || authLoading) return;

    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as {
            id: string;
            conversation_id: string;
            sender: string;
            recipient: string;
            body: string;
            direction: "inbound" | "outbound";
            sent_at?: string;
            created_at?: string;
          };

          console.log("New message received:", newMessage);

          // Map database message to UI message format
          const timestamp =
            newMessage.sent_at ||
            newMessage.created_at ||
            new Date().toISOString();
          const formattedTimestamp = new Date(timestamp).toLocaleTimeString(
            "en-US",
            {
              hour: "numeric",
              minute: "2-digit",
            }
          );

          const uiMessage: Message = {
            id: newMessage.id,
            text: newMessage.body,
            sender:
              newMessage.direction === "inbound" ? "incoming" : "outgoing",
            timestamp: formattedTimestamp,
          };

          // Find the conversation by matching phone number
          // For inbound messages: sender is the associate's phone
          // For outbound messages: recipient is the associate's phone
          const phoneToMatch =
            newMessage.direction === "inbound"
              ? newMessage.sender
              : newMessage.recipient;

          setConversations((prevConversations) => {
            return prevConversations.map((conv) => {
              // Check if this conversation matches the phone number
              // Phone numbers might be in different formats, so we'll do a simple match
              if (
                conv.phoneNumber &&
                (conv.phoneNumber.includes(phoneToMatch) ||
                  phoneToMatch.includes(conv.phoneNumber))
              ) {
                // Check if message already exists (prevent duplicates)
                const messageExists = conv.messages.some(
                  (msg) => msg.id === uiMessage.id
                );

                if (messageExists) {
                  return conv;
                }

                const isSelected =
                  selectedConversationIdRef.current === conv.id;

                const updatedConv = {
                  ...conv,
                  messages: [...conv.messages, uiMessage],
                  lastMessage: uiMessage.text,
                  timestamp: uiMessage.timestamp,
                  unread:
                    newMessage.direction === "inbound"
                      ? !isSelected
                      : conv.unread,
                };

                // Update selected conversation if it's the current one
                if (isSelected) {
                  setSelectedConversation(updatedConv);
                }

                return updatedConv;
              }
              return conv;
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, isAuthenticated, authLoading]);

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
  useEffect(() => {
    if (selectedConversation && conversations.length > 0) {
      const updated = conversations.find(
        (c) => c.id === selectedConversation.id
      );
      if (updated) {
        setSelectedConversation(updated);
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
