"use client";

import React from "react";

interface MassMessageModalProps {
  isOpen: boolean;
  messageText: string;
  onMessageTextChange: (text: string) => void;
  onSend: () => void;
  onCancel: () => void;
  sendLoading?: boolean;
  sendSuccess?: boolean;
}

export default function MassMessageModal({
  isOpen,
  messageText,
  onMessageTextChange,
  onSend,
  onCancel,
  sendLoading = false,
  sendSuccess = false,
}: MassMessageModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
        <h2 className="text-xl font-bold text-black mb-4">
          Message All Associates
        </h2>
        <p className="text-sm text-gray-600 mb-4">What do you want to say?</p>

        <div className="relative">
          <textarea
            value={messageText}
            onChange={(e) => onMessageTextChange(e.target.value)}
            disabled={sendSuccess || sendLoading}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none h-24 resize-none ${
              sendSuccess
                ? "border-green-500 ring-2 ring-green-500"
                : sendLoading
                ? "border-blue-500 ring-2 ring-blue-500"
                : "border-gray-300 focus:ring-2 focus:ring-blue-500"
            }`}
            placeholder="Enter your message here..."
            autoFocus
          />
          {sendLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            </div>
          )}
          {sendSuccess && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-md shadow-sm">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-sm font-medium">Sent</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSend}
            disabled={sendLoading || sendSuccess || !messageText.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sendLoading ? "Sending..." : "Send Message"}
          </button>
        </div>
      </div>
    </div>
  );
}
