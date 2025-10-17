"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markSetupComplete } from "@/lib/auth/actions";
import { upsertProfile } from "@/lib/supabase/profile";

interface CompanyFormData {
  companyName: string;
  nonTempEmployees: string;
  email: string;
  phoneNumber: string;
  zipCode: string;
  systemReadiness: string;
  referralSource: string;
  firstName: string;
  lastName: string;
}

interface CompanySetupFormProps {
  userEmail: string;
}

export default function CompanySetupForm({ userEmail }: CompanySetupFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<CompanyFormData>({
    companyName: "",
    nonTempEmployees: "",
    email: userEmail,
    phoneNumber: "",
    zipCode: "",
    systemReadiness: "",
    referralSource: "",
    firstName: "",
    lastName: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleInputChange = (field: keyof CompanyFormData, value: string) => {
    if (field === "nonTempEmployees") {
      // Prevent negative numbers
      if (Number(value) < 0) {
        setFormError("Number of employees cannot be negative.");
        value = "";
      } else {
        setFormError(null);
      }
    }
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate nonTempEmployees is not negative
    if (Number(formData.nonTempEmployees) < 0) {
      setFormError("Number of employees cannot be negative.");
      return;
    }
    setIsSubmitting(true);

    try {
      // Convert nonTempEmployees to a number
      const nonTempEmployeesNumber = Number(formData.nonTempEmployees);

      await upsertProfile({
        companyName: formData.companyName,
        nonTempEmployees: nonTempEmployeesNumber,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        zipCode: formData.zipCode,
        systemReadiness: formData.systemReadiness,
        referralSource: formData.referralSource,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });

      // Mark user as having completed company setup (existing action)
      await markSetupComplete();
      router.push("/jobs");
    } catch (error) {
      console.error(error);
      setFormError("Failed to complete setup. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-4">
        {/* Personal Information */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-gray-700"
            >
              First Name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              placeholder="John"
            />
          </div>
          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-gray-700"
            >
              Last Name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              placeholder="Doe"
            />
          </div>
        </div>

        {/* Company Name */}
        <div>
          <label
            htmlFor="companyName"
            className="block text-sm font-medium text-gray-700"
          >
            Company Name
          </label>
          <input
            id="companyName"
            name="companyName"
            type="text"
            required
            value={formData.companyName}
            onChange={(e) => handleInputChange("companyName", e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            placeholder="Staff Better LLC"
          />
        </div>

        {/* Non-Temp Employees */}
        <div>
          <label
            htmlFor="nonTempEmployees"
            className="block text-sm font-medium text-gray-700"
          >
            Number of Non-Temporary Employees
          </label>
          <input
            id="nonTempEmployees"
            name="nonTempEmployees"
            type="number"
            min="0"
            required
            value={formData.nonTempEmployees}
            onChange={(e) =>
              handleInputChange("nonTempEmployees", e.target.value)
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            placeholder="50"
          />
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            placeholder="contact@company.com"
          />
        </div>

        {/* Phone Number */}
        <div>
          <label
            htmlFor="phoneNumber"
            className="block text-sm font-medium text-gray-700"
          >
            Phone Number
          </label>
          <input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            required
            value={formData.phoneNumber}
            onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            placeholder="(555) 123-4567"
          />
        </div>

        {/* Zip Code */}
        <div>
          <label
            htmlFor="zipCode"
            className="block text-sm font-medium text-gray-700"
          >
            Zip Code
          </label>
          <input
            id="zipCode"
            name="zipCode"
            type="text"
            required
            value={formData.zipCode}
            onChange={(e) => handleInputChange("zipCode", e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            placeholder="12345"
          />
        </div>

        {/* System Readiness */}
        <div>
          <label
            htmlFor="systemReadiness"
            className="block text-sm font-medium text-gray-700"
          >
            How ready is your system for this change?
          </label>
          <select
            id="systemReadiness"
            name="systemReadiness"
            required
            value={formData.systemReadiness}
            onChange={(e) =>
              handleInputChange("systemReadiness", e.target.value)
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">Select an option</option>
            <option value="yes">Very Ready</option>
            <option value="maybe">Somewhat Ready</option>
            <option value="no">Not Ready</option>
          </select>
        </div>

        {/* Referral Source */}
        <div>
          <label
            htmlFor="referralSource"
            className="block text-sm font-medium text-gray-700"
          >
            How did you hear about us?
          </label>
          <select
            id="referralSource"
            name="referralSource"
            required
            value={formData.referralSource}
            onChange={(e) =>
              handleInputChange("referralSource", e.target.value)
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">Select an option</option>
            <option value="google">Google Search</option>
            <option value="social_media">Social Media</option>
            <option value="referral">Referral</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {formError && (
        <div className="text-red-600 text-sm text-center">{formError}</div>
      )}

      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Setting up..." : "Complete Setup"}
        </button>
      </div>
    </form>
  );
}
