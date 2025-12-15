"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/navBar";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import { useAuthCheck } from "@/hooks/useAuthCheck";
import { CustomerOnboardingData } from "@/lib/isv/types";

export default function ISVOnboardingPage() {
  const { loading: authLoading, isAuthenticated } = useAuthCheck();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CustomerOnboardingData>({
    name: "",
    legal_name: "",
    tax_id: "",
    business_type: "",
    website: "",
    address: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    meta_business_manager_id: "",
    meta_admin_email: "",
    phone_number_preference: "",
    estimated_monthly_volume: undefined,
    use_case_descriptions: "",
    opt_in_description: "",
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Navbar />
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === "" ? undefined : value,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === "" ? undefined : parseInt(value, 10),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/isv/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create customer");
      }

      await response.json();
      router.push(`/settings`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8 mt-24">
        <div className="mb-8">
          <h1 className="text-5xl font-semibold text-black mb-2">
            Customer Onboarding
          </h1>
          <p className="text-gray-600 text-lg">
            Register a new customer for Twilio and WhatsApp Business integration
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Information */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-black mb-6">
              Business Information
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="legal_name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Legal Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="legal_name"
                  name="legal_name"
                  required
                  value={formData.legal_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="tax_id"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Tax ID / EIN
                  </label>
                  <input
                    type="text"
                    id="tax_id"
                    name="tax_id"
                    value={formData.tax_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label
                    htmlFor="business_type"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Business Type
                  </label>
                  <select
                    id="business_type"
                    name="business_type"
                    value={formData.business_type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select type</option>
                    <option value="LLC">LLC</option>
                    <option value="Corporation">Corporation</option>
                    <option value="Sole Proprietor">Sole Proprietor</option>
                    <option value="Nonprofit">Nonprofit</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="website"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Website
                </label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="address"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Business Address
                </label>
                <textarea
                  id="address"
                  name="address"
                  rows={3}
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-black mb-6">
              Contact Information
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="contact_name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Contact Name
                </label>
                <input
                  type="text"
                  id="contact_name"
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="contact_email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Contact Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="contact_email"
                  name="contact_email"
                  required
                  value={formData.contact_email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="contact_phone"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Contact Phone
                </label>
                <input
                  type="tel"
                  id="contact_phone"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* WhatsApp Integration (Optional) */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-black mb-6">
              WhatsApp Business (Optional)
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="meta_business_manager_id"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Meta Business Manager ID
                </label>
                <input
                  type="text"
                  id="meta_business_manager_id"
                  name="meta_business_manager_id"
                  value={formData.meta_business_manager_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Required if using WhatsApp Business
                </p>
              </div>

              <div>
                <label
                  htmlFor="meta_admin_email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Meta Admin Email
                </label>
                <input
                  type="email"
                  id="meta_admin_email"
                  name="meta_admin_email"
                  value={formData.meta_admin_email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Messaging Configuration */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-black mb-6">
              Messaging Configuration
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="phone_number_preference"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Phone Number Preference
                </label>
                <input
                  type="text"
                  id="phone_number_preference"
                  name="phone_number_preference"
                  placeholder="e.g., US, +1"
                  value={formData.phone_number_preference}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="estimated_monthly_volume"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Estimated Monthly Message Volume
                </label>
                <input
                  type="number"
                  id="estimated_monthly_volume"
                  name="estimated_monthly_volume"
                  min="0"
                  value={formData.estimated_monthly_volume || ""}
                  onChange={handleNumberChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="use_case_descriptions"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Use Case Descriptions
                </label>
                <textarea
                  id="use_case_descriptions"
                  name="use_case_descriptions"
                  rows={4}
                  placeholder="Describe how you plan to use messaging (e.g., shift reminders, notifications)"
                  value={formData.use_case_descriptions}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="opt_in_description"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Opt-in Description
                </label>
                <textarea
                  id="opt_in_description"
                  name="opt_in_description"
                  rows={3}
                  placeholder="Describe how you collect consent from recipients"
                  value={formData.opt_in_description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {isSubmitting ? "Creating..." : "Create Customer"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
