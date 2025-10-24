"use client";

import React from "react";

interface AssociateActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  onMessage?: () => void;
  showMessageButton?: boolean;
  size?: "sm" | "md";
}

export default function AssociateActions({
  onEdit,
  onDelete,
  onMessage,
  showMessageButton = false,
  size = "md",
}: AssociateActionsProps) {
  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const buttonSize = size === "sm" ? "p-2" : "p-3";

  return (
    <div className="flex items-center gap-1">
      {/* Edit Button */}
      <button
        onClick={onEdit}
        className={`${buttonSize} text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-200`}
        title="Edit associate"
      >
        <svg
          className={iconSize}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </button>

      {/* Message Button */}
      {showMessageButton && onMessage && (
        <button
          onClick={onMessage}
          className={`${buttonSize} text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-all duration-200`}
          title="Message associate"
        >
          <svg
            className={iconSize}
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
        </button>
      )}

      {/* Delete Button */}
      <button
        onClick={onDelete}
        className={`${buttonSize} text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-200`}
        title="Delete associate"
      >
        <svg
          className={iconSize}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  );
}
