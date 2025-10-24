"use client";

import React from "react";

interface AddAssociateButtonProps {
  onAdd: () => void;
  text?: string;
  className?: string;
  disabled?: boolean;
}

export default function AddAssociateButton({
  onAdd,
  text = "Add Associate",
  className = "",
  disabled = false,
}: AddAssociateButtonProps) {
  return (
    <button
      onClick={onAdd}
      disabled={disabled}
      className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {text}
    </button>
  );
}
