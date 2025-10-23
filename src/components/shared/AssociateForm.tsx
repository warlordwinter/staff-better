"use client";

import React, { useState, useEffect } from "react";
import { formatPhoneToE164 } from "@/utils/phoneUtils";

export interface AssociateFormData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emailAddress: string;
  workDate?: string;
  startTime?: string;
}

interface AssociateFormProps {
  initialData?: Partial<AssociateFormData>;
  onSubmit: (data: AssociateFormData) => void;
  onCancel?: () => void;
  showWorkFields?: boolean;
  submitButtonText?: string;
  showCancelButton?: boolean;
  className?: string;
}

export default function AssociateForm({
  initialData = {},
  onSubmit,
  onCancel,
  showWorkFields = false,
  submitButtonText = "Save",
  showCancelButton = false,
  className = "",
}: AssociateFormProps) {
  const [formData, setFormData] = useState<AssociateFormData>({
    firstName: initialData.firstName || "",
    lastName: initialData.lastName || "",
    phoneNumber: initialData.phoneNumber || "",
    emailAddress: initialData.emailAddress || "",
    workDate: initialData.workDate || "",
    startTime: initialData.startTime || "",
  });

  const [phoneError, setPhoneError] = useState("");
  const [errors, setErrors] = useState<Partial<AssociateFormData>>({});

  // Update form data when initialData changes
  useEffect(() => {
    setFormData({
      firstName: initialData.firstName || "",
      lastName: initialData.lastName || "",
      phoneNumber: initialData.phoneNumber || "",
      emailAddress: initialData.emailAddress || "",
      workDate: initialData.workDate || "",
      startTime: initialData.startTime || "",
    });
  }, [initialData]);

  const handleInputChange = (field: keyof AssociateFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    // Validate phone number in real-time
    if (field === "phoneNumber") {
      if (value.trim() === "") {
        setPhoneError("");
      } else {
        try {
          formatPhoneToE164(value);
          setPhoneError("");
        } catch {
          setPhoneError("Invalid phone format");
        }
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<AssociateFormData> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (formData.phoneNumber.trim()) {
      try {
        formatPhoneToE164(formData.phoneNumber);
      } catch {
        setPhoneError("Please enter a valid phone number");
        return false;
      }
    }

    if (
      formData.emailAddress.trim() &&
      !/\S+@\S+\.\S+/.test(formData.emailAddress)
    ) {
      newErrors.emailAddress = "Please enter a valid email address";
    }

    if (showWorkFields) {
      if (!formData.workDate) {
        newErrors.workDate = "Work date is required";
      }
      if (!formData.startTime) {
        newErrors.startTime = "Start time is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <input
            type="text"
            placeholder="First Name *"
            value={formData.firstName}
            onChange={(e) => handleInputChange("firstName", e.target.value)}
            className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.firstName ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.firstName && (
            <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
          )}
        </div>

        <div>
          <input
            type="text"
            placeholder="Last Name *"
            value={formData.lastName}
            onChange={(e) => handleInputChange("lastName", e.target.value)}
            className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.lastName ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.lastName && (
            <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
          )}
        </div>

        <div>
          <input
            type="tel"
            placeholder="Phone Number"
            value={formData.phoneNumber}
            onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
            className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              phoneError ? "border-red-500" : "border-gray-300"
            }`}
          />
          {phoneError && (
            <p className="text-red-500 text-xs mt-1">{phoneError}</p>
          )}
        </div>

        <div>
          <input
            type="email"
            placeholder="Email"
            value={formData.emailAddress}
            onChange={(e) => handleInputChange("emailAddress", e.target.value)}
            className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.emailAddress ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.emailAddress && (
            <p className="text-red-500 text-xs mt-1">{errors.emailAddress}</p>
          )}
        </div>

        {showWorkFields && (
          <>
            <div>
              <input
                type="date"
                placeholder="Work Date *"
                value={formData.workDate}
                onChange={(e) => handleInputChange("workDate", e.target.value)}
                className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.workDate ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.workDate && (
                <p className="text-red-500 text-xs mt-1">{errors.workDate}</p>
              )}
            </div>

            <div>
              <input
                type="time"
                placeholder="Start Time *"
                value={formData.startTime}
                onChange={(e) => handleInputChange("startTime", e.target.value)}
                className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.startTime ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.startTime && (
                <p className="text-red-500 text-xs mt-1">{errors.startTime}</p>
              )}
            </div>
          </>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!!phoneError}
            className={`px-4 py-2 text-white rounded-md font-medium transition-colors ${
              phoneError
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {submitButtonText}
          </button>

          {showCancelButton && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
