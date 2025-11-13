"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/ui/navBar";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import { useAuthCheck } from "@/hooks/useAuthCheck";
import { useAuth } from "@/hooks/useAuth";

export default function SettingsPage() {
  const { loading: authLoading, isAuthenticated } = useAuthCheck();
  const { user } = useAuth();
  const [name, setName] = useState("Manager");
  const [email, setEmail] = useState("manager@staffbetter.com");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Update form fields when user data loads
  useEffect(() => {
    if (user) {
      setName(user.user_metadata?.name || "Manager");
      setEmail(user.email || "manager@staffbetter.com");
    }
  }, [user]);

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Navbar />
        <LoadingSpinner />
      </div>
    );
  }

  // Don't render content if user is not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    // TODO: Implement API call to save account settings
    setTimeout(() => {
      setIsSaving(false);
      // Show success message
    }, 1000);
  };

  const handleConnectWhatsApp = async () => {
    // TODO: Implement WhatsApp connection logic
    console.log("Connecting WhatsApp with phone:", whatsappPhone);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 mt-24">
        {/* Back Link and Title */}
        <div className="mb-8">
          <Link
            href="/home"
            className="text-gray-600 hover:text-gray-900 transition-colors inline-flex items-center gap-2 mb-4"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>Back</span>
          </Link>
          <h1 className="text-5xl font-semibold text-black">Settings</h1>
        </div>

        <div className="space-y-6">
          {/* WhatsApp Integration Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              {/* WhatsApp Icon */}
              <svg
                className="w-6 h-6 text-green-600"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              <h2 className="text-2xl font-semibold text-black">
                WhatsApp Integration
              </h2>
            </div>
            <p className="text-gray-600 mb-4">
              Connect your WhatsApp Business account to send messages directly
              to your associates.
            </p>

            {/* Warning Box */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 flex items-start gap-3">
              <svg
                className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-orange-800 text-sm">
                WhatsApp Not Connected. Connect your WhatsApp Business account
                to enable messaging functionality.
              </p>
            </div>

            {/* Phone Number Input */}
            <div className="mb-4">
              <label
                htmlFor="whatsapp-phone"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                WhatsApp Business Phone Number
              </label>
              <input
                type="tel"
                id="whatsapp-phone"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter your WhatsApp Business phone number with country code.
              </p>
            </div>

            {/* Connect Button */}
            <button
              onClick={handleConnectWhatsApp}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              Connect WhatsApp
            </button>
          </div>

          {/* Account Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-black mb-6">Account</h2>
            <form onSubmit={handleSaveAccount}>
              <div className="space-y-4 mb-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>

          {/* Notification Preferences Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-black mb-4">
              Notification Preferences
            </h2>
            <p className="text-gray-500">Coming soon...</p>
          </div>
        </div>
      </main>
    </div>
  );
}
