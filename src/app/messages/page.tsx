"use client";

import React, { useEffect, useState, useMemo } from "react";
import Navbar from "@/components/ui/navBar";
import Footer from "@/components/ui/footer";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import MessageList from "@/components/ui/messageList";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuthCheck } from "@/hooks/useAuthCheck";
import { useMessages } from "@/hooks/useMessages";

type ChannelFilter = "all" | "sms" | "whatsapp";

export default function MessagesPage() {
  const { loading: authLoading, isAuthenticated } = useAuthCheck();
  const {
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
    setMessageText,
    handleSendMessage,
  } = useMessages(isAuthenticated, authLoading);

  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const { showToast } = useToast();

  // Filter conversations based on selected channel
  const filteredConversations = useMemo(() => {
    if (channelFilter === "all") {
      return conversations;
    }
    return conversations.filter((conv) => conv.channel === channelFilter);
  }, [conversations, channelFilter]);

  // Show toast when error occurs
  useEffect(() => {
    if (error) {
      // Use the specific error message or default message
      const message = error.includes("unsubscribed")
        ? error
        : "You cannot message this user because they have unsubscribed from SMS notifications.";
      showToast(message, "error");
    }
  }, [error, showToast]);

  // Clear selected conversation if it's filtered out
  useEffect(() => {
    if (
      selectedConversation &&
      !filteredConversations.find((c) => c.id === selectedConversation.id)
    ) {
      setSelectedConversation(
        filteredConversations.length > 0 ? filteredConversations[0] : null
      );
    }
  }, [
    channelFilter,
    filteredConversations,
    selectedConversation,
    setSelectedConversation,
  ]);

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

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <Navbar />
      <main className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Pane - Conversation List */}
        <div className="w-80 border-r border-gray-200 flex flex-col bg-white overflow-hidden">
          {/* Messages Header */}
          <div className="p-6 border-b border-gray-200 flex-shrink-0">
            <h1 className="text-3xl font-bold text-black">Messages</h1>
          </div>

          {/* Channel Toggle Bar */}
          <div className="px-6 py-3 border-b border-gray-200 flex-shrink-0 bg-gray-50">
            <div className="flex gap-2">
              <button
                onClick={() => setChannelFilter("all")}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  channelFilter === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setChannelFilter("sms")}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  channelFilter === "sms"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                SMS
              </button>
              <button
                onClick={() => setChannelFilter("whatsapp")}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  channelFilter === "whatsapp"
                    ? "bg-green-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                WhatsApp
              </button>
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>
                  {conversations.length === 0
                    ? "No associates with phone numbers found."
                    : channelFilter === "all"
                    ? "No conversations found."
                    : `No ${
                        channelFilter === "whatsapp" ? "WhatsApp" : "SMS"
                      } conversations found.`}
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
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
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div className="p-6 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-2xl font-bold text-black">
                  {selectedConversation?.name}
                </h2>
                {/* Channel Indicator */}
                {selectedConversation?.channel && (
                  <div className="mt-2">
                    {selectedConversation.channel === "whatsapp" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                        This conversation is on WhatsApp
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                        This conversation is on SMS
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Messages - Scrollable Container */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-6 min-h-0"
                style={{
                  scrollBehavior: "smooth",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {selectedConversation?.messages && (
                  <MessageList messages={selectedConversation.messages} />
                )}
                {/* Scroll anchor - invisible element at the bottom */}
                <div ref={messagesEndRef} className="h-0" />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
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
