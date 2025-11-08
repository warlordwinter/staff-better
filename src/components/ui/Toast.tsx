"use client";

import React, { useEffect } from "react";

interface ToastProps {
  message: string;
  type?: "error" | "success" | "info";
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type = "error",
  isVisible,
  onClose,
  duration = 5000,
}: ToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const bgColor =
    type === "error"
      ? "bg-red-50 border-red-200 text-red-800"
      : type === "success"
      ? "bg-green-50 border-green-200 text-green-800"
      : "bg-blue-50 border-blue-200 text-blue-800";

  const iconColor =
    type === "error"
      ? "text-red-600"
      : type === "success"
      ? "text-green-600"
      : "text-blue-600";

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] animate-slide-down pointer-events-auto">
      <div
        className={`${bgColor} border-2 rounded-lg shadow-2xl px-5 py-4 min-w-96 max-w-lg flex items-start gap-3`}
      >
        <svg
          className={`w-5 h-5 ${iconColor} mt-0.5 flex-shrink-0`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          {type === "error" ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          ) : type === "success" ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          )}
        </svg>
        <p className="text-sm font-medium flex-1">{message}</p>
        <button
          onClick={onClose}
          className={`${iconColor} hover:opacity-70 transition-opacity flex-shrink-0`}
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
