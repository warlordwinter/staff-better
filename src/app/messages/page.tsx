"use client";

import React, { useEffect } from "react";
import Navbar from "@/components/ui/navBar";
import Footer from "@/components/ui/footer";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import MessageList from "@/components/ui/messageList";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuthCheck } from "@/hooks/useAuthCheck";
import { useMessages } from "@/hooks/useMessages";

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

  const { showToast } = useToast();

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
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div className="p-6 border-b border-gray-200 flex-shrink-0">
                <h2 className="text-2xl font-bold text-black">
                  {selectedConversation?.name}
                </h2>
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
