"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Navbar from "@/components/ui/navBar";
import Footer from "@/components/ui/footer";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import { useAuthCheck } from "@/hooks/useAuthCheck";

// Dummy data for conversations
interface Conversation {
  id: string;
  name: string;
  initials: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  messages: Message[];
}

interface Message {
  id: string;
  text: string;
  sender: "incoming" | "outgoing";
  timestamp: string;
}

const dummyConversations: Conversation[] = [
  {
    id: "1",
    name: "John Gilbert",
    initials: "JO",
    lastMessage: "Some Random Reply this is what is doing the words that are going on this.",
    timestamp: "2:30 PM",
    unread: false,
    messages: [
      {
        id: "1",
        text: "Some Random Reply this is what is doing the words that are going on this.",
        sender: "incoming",
        timestamp: "2:30 PM",
      },
      {
        id: "2",
        text: "This is another reply that doesn't mean anything I am trying to multitask right now. Don't worry though I am listening to what tyler is saying.",
        sender: "outgoing",
        timestamp: "2:32 PM",
      },
      {
        id: "3",
        text: "This is another reply that doesn't mean anything I am trying to multitask right now. Don't worry though I am listening to what tyler is saying.",
        sender: "outgoing",
        timestamp: "2:33 PM",
      },
    ],
  },
  {
    id: "2",
    name: "Sarah Mitchell",
    initials: "SA",
    lastMessage: "Thanks for the reminder!",
    timestamp: "1:15 PM",
    unread: true,
    messages: [
      {
        id: "1",
        text: "Thanks for the reminder!",
        sender: "incoming",
        timestamp: "1:15 PM",
      },
    ],
  },
  {
    id: "3",
    name: "Mike Johnson",
    initials: "MI",
    lastMessage: "See you tomorrow",
    timestamp: "Yesterday",
    unread: false,
    messages: [
      {
        id: "1",
        text: "See you tomorrow",
        sender: "incoming",
        timestamp: "Yesterday",
      },
    ],
  },
  {
    id: "4",
    name: "Emily Davis",
    initials: "EM",
    lastMessage: "Got it, thanks!",
    timestamp: "Tuesday",
    unread: true,
    messages: [
      {
        id: "1",
        text: "Got it, thanks!",
        sender: "incoming",
        timestamp: "Tuesday",
      },
    ],
  },
  {
    id: "5",
    name: "Tyler Anderson",
    initials: "TY",
    lastMessage: "Will do!",
    timestamp: "Monday",
    unread: false,
    messages: [
      {
        id: "1",
        text: "Will do!",
        sender: "incoming",
        timestamp: "Monday",
      },
    ],
  },
  {
    id: "6",
    name: "Rachel Thompson",
    initials: "RA",
    lastMessage: "Perfect timing",
    timestamp: "Last week",
    unread: false,
    messages: [
      {
        id: "1",
        text: "Perfect timing",
        sender: "incoming",
        timestamp: "Last week",
      },
    ],
  },
  {
    id: "7",
    name: "David Chen",
    initials: "DA",
    lastMessage: "Understood",
    timestamp: "Last week",
    unread: false,
    messages: [
      {
        id: "1",
        text: "Understood",
        sender: "incoming",
        timestamp: "Last week",
      },
    ],
  },
];

export default function MessagesPage() {
  const { loading: authLoading, isAuthenticated } = useAuthCheck();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<
    Conversation | null
  >(null);
  const [messageText, setMessageText] = useState("");
  const [mounted, setMounted] = useState(false);

  // Initialize conversations on client side only
  useEffect(() => {
    setMounted(true);
    setConversations(dummyConversations);
    setSelectedConversation(dummyConversations[0]);
  }, []);

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

  // Show loading spinner while checking authentication
  if (authLoading || !mounted) {
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

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConversation) return;

    // Add new message to conversation
    const timestamp = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    
    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: messageText,
      sender: "outgoing",
      timestamp,
    };

    // Update the conversations state
    const updatedConversations = conversations.map((conv) => {
      if (conv.id === selectedConversation.id) {
        const updatedConv = {
          ...conv,
          messages: [...conv.messages, newMessage],
          lastMessage: messageText,
          timestamp: newMessage.timestamp,
        };
        setSelectedConversation(updatedConv);
        return updatedConv;
      }
      return conv;
    });

    setConversations(updatedConversations);
    setMessageText("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 flex h-[calc(100vh-64px)] mt-16">
        {/* Left Pane - Conversation List */}
        <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
          {/* Messages Header */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-black">Messages</h1>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conversation) => (
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
                  <div className="flex-1 min-w-0">
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
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.lastMessage}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Pane - Chat Window */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-black">
                  {selectedConversation.name}
                </h2>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {selectedConversation.messages.map((message) => (
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
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleSendMessage();
                      }
                    }}
                    placeholder="Enter Message Here"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim()}
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
                  <button
                    className="w-12 h-12 rounded-full bg-gray-300 text-white flex items-center justify-center hover:bg-gray-400 transition-colors"
                    title="Help"
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
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
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

