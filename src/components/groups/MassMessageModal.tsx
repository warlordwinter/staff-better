"use client";

import React from "react";

interface MassMessageModalProps {
  isOpen: boolean;
  messageText: string;
  onMessageTextChange: (text: string) => void;
  onSend: () => void;
  onCancel: () => void;
}

export default function MassMessageModal({
  isOpen,
  messageText,
  onMessageTextChange,
  onSend,
  onCancel,
}: MassMessageModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
        <h2 className="text-xl font-bold text-black mb-4">
          Message All Associates
        </h2>
        <p className="text-sm text-gray-600 mb-4">What do you want to say?</p>

        <textarea
          value={messageText}
          onChange={(e) => onMessageTextChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
          placeholder="Enter your message here..."
          autoFocus
        />

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSend}
            disabled={!messageText.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send Message
          </button>
        </div>
      </div>
    </div>
  );
}
