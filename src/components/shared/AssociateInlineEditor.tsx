"use client";

import React, { useState } from "react";
import { AssociateFormData } from "./AssociateForm";

interface AssociateInlineEditorProps {
  initialData: AssociateFormData;
  onSave: (data: AssociateFormData) => void;
  onCancel: () => void;
  onDelete?: () => void;
  showWorkFields?: boolean;
  isNew?: boolean;
}

export default function AssociateInlineEditor({
  initialData,
  onSave,
  onCancel,
  onDelete,
  showWorkFields = false,
  isNew = false,
}: AssociateInlineEditorProps) {
  const [editData, setEditData] = useState<AssociateFormData>(initialData);
  const [phoneError, setPhoneError] = useState("");

  const handleInputChange = (field: keyof AssociateFormData, value: string) => {
    setEditData((prev) => ({ ...prev, [field]: value }));

    // Validate phone number in real-time
    if (field === "phoneNumber") {
      if (value.trim() === "") {
        setPhoneError("");
      } else {
        try {
          // Import isValidPhoneNumber dynamically to avoid circular imports
          import("@/utils/phoneUtils").then(({ isValidPhoneNumber }) => {
            if (isValidPhoneNumber(value)) {
              setPhoneError("");
            } else {
              setPhoneError("Invalid phone format");
            }
          });
        } catch {
          setPhoneError("Invalid phone format");
        }
      }
    }
  };

  const handleSave = () => {
    if (!editData.firstName.trim() || !editData.lastName.trim()) {
      return;
    }

    if (editData.phoneNumber.trim()) {
      try {
        import("@/utils/phoneUtils").then(({ isValidPhoneNumber }) => {
          if (isValidPhoneNumber(editData.phoneNumber)) {
            onSave(editData);
          } else {
            setPhoneError("Please enter a valid phone number");
          }
        });
      } catch {
        setPhoneError("Please enter a valid phone number");
        return;
      }
    } else {
      onSave(editData);
    }
  };

  const handleCancel = () => {
    if (isNew && onDelete) {
      onDelete();
    } else {
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        value={editData.firstName}
        onChange={(e) => handleInputChange("firstName", e.target.value)}
        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        placeholder="First name"
        autoFocus
      />
      <input
        type="text"
        value={editData.lastName}
        onChange={(e) => handleInputChange("lastName", e.target.value)}
        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        placeholder="Last name"
      />
      <input
        type="tel"
        value={editData.phoneNumber}
        onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
        className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:border-blue-500 ${
          phoneError ? "border-red-500" : "border-gray-300"
        }`}
        placeholder="Phone number"
      />
      <input
        type="email"
        value={editData.emailAddress}
        onChange={(e) => handleInputChange("emailAddress", e.target.value)}
        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        placeholder="Email address"
      />

      {showWorkFields && (
        <>
          <input
            type="date"
            value={new Date().toISOString().split("T")[0]}
            onChange={(e) => handleInputChange("workDate", e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
          <input
            type="time"
            value={new Date().toISOString().split("T")[1].substring(0, 5)}
            min="08:00"
            max="23:00"
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        </>
      )}

      <div className="flex items-center gap-1">
        <button
          onClick={handleSave}
          disabled={
            !editData.firstName.trim() ||
            !editData.lastName.trim() ||
            !!phoneError
          }
          className={`px-2 py-1 text-xs text-white rounded focus:outline-none ${
            !editData.firstName.trim() ||
            !editData.lastName.trim() ||
            phoneError
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600"
          }`}
        >
          Save
        </button>
        <button
          onClick={handleCancel}
          className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
