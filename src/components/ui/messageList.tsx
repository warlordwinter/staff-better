"use client";

import React from "react";
import { Message } from "@/lib/services/messagesDataService";

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  return (
    <div className="flex flex-col space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.sender === "outgoing" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`max-w-[70%] rounded-lg px-4 py-2 ${
              message.sender === "outgoing"
                ? "bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white"
                : "bg-gray-200 text-gray-900"
            }`}
          >
            <p className="text-sm break-words">{message.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
