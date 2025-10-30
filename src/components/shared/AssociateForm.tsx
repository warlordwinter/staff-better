"use client";

import React, { useState, useEffect, useMemo } from "react";

export interface AssociateFormData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emailAddress: string;
  workDate?: string;
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
  });

  const [phoneError, setPhoneError] = useState("");
  const [errors, setErrors] = useState<Partial<AssociateFormData>>({});

  // Create a stable reference for initialData to prevent infinite loops
  const stableInitialData = useMemo(
    () => ({
      firstName: initialData.firstName || "",
      lastName: initialData.lastName || "",
      phoneNumber: initialData.phoneNumber || "",
      emailAddress: initialData.emailAddress || "",
      workDate: initialData.workDate || "",
    }),
    [
      initialData.firstName,
      initialData.lastName,
      initialData.phoneNumber,
      initialData.emailAddress,
      initialData.workDate,
    ]
  );

  // Update form data when initialData changes
  useEffect(() => {
    setFormData(stableInitialData);
  }, [stableInitialData]);

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
        import("@/utils/phoneUtils").then(({ isValidPhoneNumber }) => {
          if (!isValidPhoneNumber(formData.phoneNumber)) {
            setPhoneError("Please enter a valid phone number");
            return false;
          }
        });
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <input
            type="text"
            placeholder="First Name *"
            value={formData.firstName}
            onChange={(e) => handleInputChange("firstName", e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              errors.firstName ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.firstName && (
            <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
          )}
        </div>

        <div className="flex flex-col">
          <input
            type="text"
            placeholder="Last Name *"
            value={formData.lastName}
            onChange={(e) => handleInputChange("lastName", e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              errors.lastName ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.lastName && (
            <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
          )}
        </div>

        <div className="flex flex-col">
          <input
            type="tel"
            placeholder="Phone Number"
            value={formData.phoneNumber}
            onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              phoneError ? "border-red-500" : "border-gray-300"
            }`}
          />
          {phoneError && (
            <p className="text-red-500 text-xs mt-1">{phoneError}</p>
          )}
        </div>

        <div className="flex flex-col">
          <input
            type="email"
            placeholder="Email Address"
            value={formData.emailAddress}
            onChange={(e) => handleInputChange("emailAddress", e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
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
                value={new Date().toISOString().split("T")[1].substring(0, 5)}
                min="08:00"
                max="23:00"
                className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300`}
              />
            </div>
          </>
        )}

        <div className="flex gap-3 md:col-span-2">
          <button
            type="submit"
            disabled={!!phoneError}
            className={`flex-1 px-6 py-3 text-white rounded-lg font-medium transition-colors ${
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
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
