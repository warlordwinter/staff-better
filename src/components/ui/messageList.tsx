"use client";

import React from "react";
import { Message } from "@/lib/services/messagesDataService";

interface MessageListProps {
  messages: Message[];
}

/**
 * Get status icon and text for message delivery status
 * Only shows status for outgoing messages
 */
function getStatusDisplay(status: string | null | undefined) {
  if (!status) return null;

  const statusLower = status.toLowerCase();

  // Map Twilio status values to display
  if (statusLower === "delivered" || statusLower === "read") {
    return {
      icon: (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      ),
      text: statusLower === "read" ? "Read" : "Delivered",
      color: "text-green-400",
    };
  }

  if (statusLower === "sent" || statusLower === "queued") {
    return {
      icon: (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ),
      text: "Sent",
      color: "text-blue-300",
    };
  }

  if (statusLower === "failed" || statusLower === "undelivered") {
    return {
      icon: (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      ),
      text: "Failed",
      color: "text-red-300",
    };
  }

  return null;
}

export default function MessageList({ messages }: MessageListProps) {
  return (
    <div className="flex flex-col space-y-4">
      {messages.map((message) => {
        const isTemplate = !!message.templateName || !!message.templateSid;
        const isOutgoing = message.sender === "outgoing";
        const statusDisplay = isOutgoing
          ? getStatusDisplay(message.status)
          : null;

        return (
          <div
            key={message.id}
            className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}
          >
            <div className="flex flex-col items-end max-w-[70%]">
              <div
                className={`rounded-lg px-4 py-2 ${
                  isOutgoing
                    ? "bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white"
                    : "bg-gray-200 text-gray-900"
                }`}
              >
                {isTemplate && message.templateName && (
                  <div className="mb-1">
                    <span
                      className={`text-xs font-semibold ${
                        isOutgoing ? "text-white/90" : "text-gray-600"
                      }`}
                    >
                      📋 {message.templateName}
                    </span>
                  </div>
                )}
                <p className="text-sm break-words whitespace-pre-wrap">
                  {message.text}
                </p>
              </div>
              {/* Status indicator for outgoing messages */}
              {isOutgoing && statusDisplay && (
                <div
                  className={`flex items-center gap-1 mt-1 ${statusDisplay.color}`}
                >
                  {statusDisplay.icon}
                  <span className="text-xs font-medium">
                    {statusDisplay.text}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
