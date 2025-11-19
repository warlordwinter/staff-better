"use client";

import React, { useEffect, useState } from "react";

type MessageType = "sms" | "whatsapp";

interface TwilioTemplate {
  sid: string;
  friendlyName: string;
  status: "approved" | "pending" | "rejected" | "draft";
  contentType: string | null;
  variables: string[];
  content: string | null;
}

interface MassMessageModalProps {
  isOpen: boolean;
  groupName?: string;
  associateCount?: number;
  messageText: string;
  messageType: MessageType;
  onMessageTextChange: (text: string) => void;
  onMessageTypeChange: (type: MessageType) => void;
  onSend: (templateData?: { contentSid: string; contentVariables?: Record<string, string> }) => void;
  onCancel: () => void;
  sendLoading?: boolean;
  sendSuccess?: boolean;
}

export default function MassMessageModal({
  isOpen,
  groupName,
  associateCount,
  messageText,
  messageType,
  onMessageTextChange,
  onMessageTypeChange,
  onSend,
  onCancel,
  sendLoading = false,
  sendSuccess = false,
}: MassMessageModalProps) {
  const [templates, setTemplates] = useState<TwilioTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TwilioTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [useTemplate, setUseTemplate] = useState(false);

  // Fetch templates when WhatsApp is selected
  useEffect(() => {
    if (isOpen && messageType === "whatsapp" && templates.length === 0) {
      fetchTemplates();
    }
  }, [isOpen, messageType]);

  // Reset template selection when switching message types
  useEffect(() => {
    if (messageType === "sms") {
      setSelectedTemplate(null);
      setTemplateVariables({});
      setUseTemplate(false);
    }
  }, [messageType]);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      // First try to get approved templates
      let response = await fetch("/api/twilio/templates");
      if (response.ok) {
        const data = await response.json();
        console.log("📋 Template fetch response:", data);
        
        if (data.success && data.templates) {
          // Filter to only approved templates
          const approvedTemplates = data.templates.filter(
            (t: TwilioTemplate) => t.status === "approved"
          );
          
          console.log(`📋 Found ${approvedTemplates.length} approved templates out of ${data.templates.length} total`);
          
          // If no approved templates, try including pending ones to help debug
          if (approvedTemplates.length === 0 && data.templates.length > 0) {
            console.log("📋 No approved templates found. Including pending templates for debugging:", data.templates);
            // Show all templates for now so user can see what's available
            setTemplates(data.templates);
          } else {
            setTemplates(approvedTemplates);
          }
        } else if (data.errors) {
          console.error("📋 Template fetch errors:", data.errors);
        }
      } else {
        const errorData = await response.json();
        console.error("📋 Template fetch failed:", errorData);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleTemplateSelect = (template: TwilioTemplate) => {
    setSelectedTemplate(template);
    // Initialize template variables
    const vars: Record<string, string> = {};
    template.variables.forEach((varNum) => {
      vars[varNum] = "";
    });
    setTemplateVariables(vars);
    setUseTemplate(true);
    // Clear message text when using template
    onMessageTextChange("");
  };

  const handleTemplateVariableChange = (varNum: string, value: string) => {
    setTemplateVariables((prev) => ({
      ...prev,
      [varNum]: value,
    }));
  };

  const handleUseCustomMessage = () => {
    setSelectedTemplate(null);
    setTemplateVariables({});
    setUseTemplate(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div
        className="bg-white rounded-lg p-6 w-96 max-w-md mx-4 shadow-2xl border border-gray-200 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-black mb-2 pr-8">
          {groupName ? `Message ${groupName}` : "Message All Associates"}
        </h2>
        {associateCount !== undefined && (
          <p className="text-sm text-gray-600 mb-4">
            Send a message to all {associateCount} associates in this group.
          </p>
        )}

        {/* Message Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message Type
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onMessageTypeChange("sms")}
              disabled={sendLoading || sendSuccess}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                messageType === "sms"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              } ${
                sendLoading || sendSuccess
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
            >
              <svg
                className={`w-5 h-5 ${
                  messageType === "sms" ? "text-blue-600" : "text-gray-400"
                }`}
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
              <span
                className={`text-sm font-medium ${
                  messageType === "sms" ? "text-blue-600" : "text-gray-600"
                }`}
              >
                SMS
              </span>
            </button>
            <button
              type="button"
              onClick={() => onMessageTypeChange("whatsapp")}
              disabled={sendLoading || sendSuccess}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                messageType === "whatsapp"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              } ${
                sendLoading || sendSuccess
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
            >
              <svg
                className={`w-5 h-5 ${
                  messageType === "whatsapp"
                    ? "text-green-600"
                    : "text-gray-400"
                }`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              <span
                className={`text-sm font-medium ${
                  messageType === "whatsapp"
                    ? "text-green-600"
                    : "text-gray-600"
                }`}
              >
                WhatsApp
              </span>
            </button>
          </div>
        </div>

        {/* WhatsApp Template Selection */}
        {messageType === "whatsapp" && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WhatsApp Template
            </label>
            
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                <span className="ml-2 text-sm text-gray-600">Loading templates...</span>
              </div>
            ) : templates.length === 0 ? (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                No templates found. Please check:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>That templates are created in Twilio Console</li>
                  <li>That templates are approved for WhatsApp</li>
                  <li>Check browser console for detailed error messages</li>
                </ul>
                <p className="mt-2">You can use a custom message instead.</p>
              </div>
            ) : (
              <>
                {!useTemplate ? (
                  <div className="space-y-2">
                    <select
                      value={selectedTemplate?.sid || ""}
                      onChange={(e) => {
                        const template = templates.find((t) => t.sid === e.target.value);
                        if (template) {
                          handleTemplateSelect(template);
                        }
                      }}
                      disabled={sendSuccess || sendLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                    >
                      <option value="">Select a template (or use custom message below)...</option>
                      {templates.map((template) => (
                        <option key={template.sid} value={template.sid}>
                          {template.friendlyName} {template.status !== "approved" ? `(${template.status})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : selectedTemplate ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            {selectedTemplate.friendlyName}
                          </p>
                          {selectedTemplate.content && (
                            <p className="text-xs text-blue-700 mt-1 whitespace-pre-wrap">
                              {selectedTemplate.content}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleUseCustomMessage}
                          disabled={sendSuccess || sendLoading}
                          className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          Change
                        </button>
                      </div>
                    </div>

                    {/* Template Variables */}
                    {selectedTemplate.variables.length > 0 && (
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-600">
                          Template Variables
                        </label>
                        {selectedTemplate.variables.map((varNum) => (
                          <div key={varNum}>
                            <input
                              type="text"
                              value={templateVariables[varNum] || ""}
                              onChange={(e) =>
                                handleTemplateVariableChange(varNum, e.target.value)
                              }
                              disabled={sendSuccess || sendLoading}
                              placeholder={`Variable ${varNum}`}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}

        {/* Message Input - Show for SMS or when not using template for WhatsApp */}
        {(messageType === "sms" || (messageType === "whatsapp" && !useTemplate)) && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>

            <div className="relative">
              <textarea
                value={messageText}
                onChange={(e) => onMessageTextChange(e.target.value)}
                disabled={sendSuccess || sendLoading}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none h-24 resize-none ${
                  sendSuccess
                    ? "border-green-500 ring-2 ring-green-500"
                    : sendLoading
                    ? "border-blue-500 ring-2 ring-blue-500"
                    : "border-gray-300 focus:ring-2 focus:ring-orange-500"
                }`}
                placeholder="Type your message here..."
                autoFocus
              />
              {sendLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                  <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                </div>
              )}
              {sendSuccess && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-md shadow-sm">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-sm font-medium">Sent</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (messageType === "whatsapp" && useTemplate && selectedTemplate) {
                // Send with template data
                const vars: Record<string, string> = {};
                selectedTemplate.variables.forEach((varNum) => {
                  if (templateVariables[varNum]) {
                    vars[varNum] = templateVariables[varNum];
                  }
                });
                onSend({
                  contentSid: selectedTemplate.sid,
                  contentVariables: Object.keys(vars).length > 0 ? vars : undefined,
                });
              } else {
                // Send without template (regular message)
                onSend();
              }
            }}
            disabled={
              sendLoading ||
              sendSuccess ||
              (messageType === "whatsapp" && useTemplate
                ? !selectedTemplate ||
                  (selectedTemplate.variables.length > 0 &&
                    !selectedTemplate.variables.every(
                      (v) => templateVariables[v]?.trim()
                    ))
                : !messageText.trim())
            }
            className="px-6 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sendLoading ? "Sending..." : "Send Message"}
          </button>
        </div>
      </div>
    </div>
  );
}
