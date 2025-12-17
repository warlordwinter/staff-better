"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/ui/navBar";
import Footer from "@/components/ui/footer";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import { useAuthCheck } from "@/hooks/useAuthCheck";
import { useToast } from "@/components/ui/ToastProvider";
import CreateTemplateModal from "@/components/templates/CreateTemplateModal";

interface Template {
  id: string;
  name: string;
  body: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language: string;
  status: "draft" | "pending" | "approved" | "rejected";
  twilioTemplateId?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  source?: "local" | "twilio"; // Track where template came from
  sid?: string; // Twilio SID for Twilio templates
  variables?: string[]; // Template variables
}

export default function TemplatesPage() {
  const { loading: authLoading, isAuthenticated } = useAuthCheck();
  const { showToast } = useToast();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/twilio/templates?includePending=true");
      if (!response.ok) {
        throw new Error("Failed to load templates from Twilio");
      }
      const data = await response.json();

      if (data.success && data.templates) {
        // Transform Twilio templates to match our Template interface
        const transformed = data.templates.map((t: any) => ({
          id: t.sid,
          name: t.friendlyName,
          body: t.content || "",
          category: "UTILITY" as const, // Twilio doesn't always provide category
          language: "en", // Default, Twilio templates have language info
          status:
            t.status === "approved"
              ? "approved"
              : t.status === "pending"
              ? "pending"
              : "draft",
          twilioTemplateId: t.sid,
          sid: t.sid,
          variables: t.variables || [],
          source: "twilio" as const,
          createdAt: t.dateCreated
            ? new Date(t.dateCreated).toISOString()
            : new Date().toISOString(),
          updatedAt: t.dateUpdated
            ? new Date(t.dateUpdated).toISOString()
            : new Date().toISOString(),
        }));
        setTemplates(transformed);
      } else {
        setTemplates([]);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
      showToast("Failed to load templates from Twilio", "error");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Load templates on mount
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadTemplates();
    }
  }, [isAuthenticated, authLoading, loadTemplates]);

  const getStatusColor = (status: Template["status"]) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryColor = (category: Template["category"]) => {
    switch (category) {
      case "MARKETING":
        return "bg-purple-100 text-purple-800";
      case "UTILITY":
        return "bg-blue-100 text-blue-800";
      case "AUTHENTICATION":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Show loading spinner while checking authentication
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner />
      </div>
    );
  }

  // Don't render content if user is not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 overflow-auto bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black mb-2">
                WhatsApp Templates
              </h1>
              <p className="text-gray-600">
                View all your approved WhatsApp message templates from Twilio
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Template
              </button>
              <button
                onClick={loadTemplates}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
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
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Refresh
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Templates List */}
          <div className="space-y-4">
            {templates.length === 0 ? (
              <div className="p-12 text-center bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500 text-lg mb-2">
                  No templates found in Twilio
                </p>
                <p className="text-gray-400 text-sm">
                  Templates will appear here once they are created and approved
                  in your Twilio account
                </p>
              </div>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {template.name}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            template.status
                          )}`}
                        >
                          {template.status.toUpperCase()}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(
                            template.category
                          )}`}
                        >
                          {template.category}
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap mb-2">
                        {template.body}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {template.variables &&
                          template.variables.length > 0 && (
                            <span>
                              Variables: {template.variables.join(", ")}
                            </span>
                          )}
                        <span>
                          Twilio SID:{" "}
                          <code className="bg-gray-100 px-1 rounded text-xs">
                            {template.sid?.substring(0, 20)}...
                          </code>
                        </span>
                        {template.createdAt && (
                          <span>
                            Created:{" "}
                            {new Date(template.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {template.status === "approved" && (
                    <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
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
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Ready to use in mass messages
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
      <CreateTemplateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          loadTemplates();
          showToast("Template created successfully", "success");
        }}
      />
    </div>
  );
}
