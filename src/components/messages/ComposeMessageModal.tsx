"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { AssociateGroup } from "@/model/interfaces/AssociateGroup";

type MessageType = "sms" | "whatsapp";

interface TwilioTemplate {
  sid: string;
  friendlyName: string;
  status: "approved" | "pending" | "rejected" | "draft";
  contentType: string | null;
  variables: string[];
  content: string | null;
}

interface ComposeMessageModalProps {
  isOpen: boolean;
  onSend: (data: {
    associateIds: string[];
    messageType: MessageType;
    message?: string;
    templateData?: {
      contentSid: string;
      contentVariables?: Record<string, string>;
    };
  }) => void;
  onCancel: () => void;
  sendLoading?: boolean;
  sendSuccess?: boolean;
}

export default function ComposeMessageModal({
  isOpen,
  onSend,
  onCancel,
  sendLoading = false,
  sendSuccess = false,
}: ComposeMessageModalProps) {
  const [messageType, setMessageType] = useState<MessageType>("sms");
  const [messageText, setMessageText] = useState("");
  const [associates, setAssociates] = useState<AssociateGroup[]>([]);
  const [loadingAssociates, setLoadingAssociates] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssociateIds, setSelectedAssociateIds] = useState<Set<string>>(
    new Set()
  );

  // Template state for WhatsApp
  const [templates, setTemplates] = useState<TwilioTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<TwilioTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = useState<
    Record<string, string>
  >({});
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const fetchAssociates = useCallback(async () => {
    setLoadingAssociates(true);
    try {
      const response = await fetch("/api/associates");
      if (!response.ok) {
        throw new Error("Failed to fetch associates");
      }
      const data = await response.json();
      // Transform to AssociateGroup format
      const transformed: AssociateGroup[] = data.map((a: any) => ({
        id: a.id,
        firstName: a.first_name || "",
        lastName: a.last_name || "",
        phoneNumber: a.phone_number || "",
        emailAddress: a.email_address || "",
        groupId: "",
        createdAt: new Date(a.created_at || Date.now()),
        updatedAt: new Date(a.updated_at || Date.now()),
      }));
      setAssociates(transformed);
    } catch (error) {
      console.error("Error fetching associates:", error);
    } finally {
      setLoadingAssociates(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const response = await fetch("/api/twilio/templates");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.templates) {
          const approvedTemplates = data.templates.filter(
            (t: TwilioTemplate) => t.status === "approved"
          );
          if (approvedTemplates.length === 0 && data.templates.length > 0) {
            setTemplates(data.templates);
          } else {
            setTemplates(approvedTemplates);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  // Fetch associates when modal opens
  useEffect(() => {
    if (isOpen && associates.length === 0 && !loadingAssociates) {
      fetchAssociates();
    }
  }, [isOpen, associates.length, loadingAssociates, fetchAssociates]);

  // Fetch templates when WhatsApp is selected
  useEffect(() => {
    if (
      isOpen &&
      messageType === "whatsapp" &&
      templates.length === 0 &&
      !loadingTemplates
    ) {
      fetchTemplates();
    }
  }, [isOpen, messageType, templates.length, loadingTemplates, fetchTemplates]);

  // Reset template selection when switching message types
  useEffect(() => {
    if (messageType === "sms") {
      setSelectedTemplate(null);
      setTemplateVariables({});
    }
  }, [messageType]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMessageType("sms");
      setMessageText("");
      setSearchQuery("");
      setSelectedAssociateIds(new Set());
      setSelectedTemplate(null);
      setTemplateVariables({});
      setTemplates([]);
    }
  }, [isOpen]);

  const handleTemplateSelect = (template: TwilioTemplate) => {
    setSelectedTemplate(template);
    const vars: Record<string, string> = {};
    template.variables.forEach((varNum) => {
      vars[varNum] = "";
    });
    setTemplateVariables(vars);
  };

  const handleTemplateVariableChange = (varNum: string, value: string) => {
    setTemplateVariables((prev) => ({
      ...prev,
      [varNum]: value,
    }));
  };

  // Filter associates based on search query
  const filteredAssociates = useMemo(() => {
    if (!searchQuery.trim()) {
      return associates;
    }
    const query = searchQuery.toLowerCase();
    return associates.filter(
      (a) =>
        a.firstName.toLowerCase().includes(query) ||
        a.lastName.toLowerCase().includes(query) ||
        a.phoneNumber.includes(query) ||
        a.emailAddress.toLowerCase().includes(query)
    );
  }, [associates, searchQuery]);

  // Only show associates with phone numbers
  const associatesWithPhones = useMemo(() => {
    return filteredAssociates.filter(
      (a) => a.phoneNumber && a.phoneNumber.trim() !== ""
    );
  }, [filteredAssociates]);

  const toggleAssociateSelection = (associateId: string) => {
    setSelectedAssociateIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(associateId)) {
        newSet.delete(associateId);
      } else {
        newSet.add(associateId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = useCallback(() => {
    setSelectedAssociateIds((prev) => {
      if (prev.size === associatesWithPhones.length) {
        return new Set();
      } else {
        return new Set(associatesWithPhones.map((a) => a.id));
      }
    });
  }, [associatesWithPhones]);

  if (!isOpen) return null;

  // Calculate disabled state
  const isDisabled =
    sendLoading ||
    sendSuccess ||
    selectedAssociateIds.size === 0 ||
    (messageType === "whatsapp"
      ? !selectedTemplate ||
        (selectedTemplate.variables.length > 0 &&
          !selectedTemplate.variables.every((v) =>
            templateVariables[v]?.trim()
          ))
      : !messageText.trim());

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div
        className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] shadow-2xl border border-gray-200 pointer-events-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-black">Compose Message</h2>
            <p className="text-sm text-gray-600 mt-1">
              Select recipients and compose your message
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
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

        {/* Message Type Selection */}
        <div className="mb-4 flex-shrink-0">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message Type
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMessageType("sms")}
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
              onClick={() => setMessageType("whatsapp")}
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

        {/* Recipients Selection */}
        <div className="mb-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Recipients ({selectedAssociateIds.size} selected)
            </label>
            {associatesWithPhones.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {selectedAssociateIds.size === associatesWithPhones.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            )}
          </div>
          <div className="relative mb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search associates by name, phone, or email..."
              className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <svg
              className="w-5 h-5 text-gray-400 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
            {loadingAssociates ? (
              <div className="p-4 text-center text-gray-500">
                Loading associates...
              </div>
            ) : associatesWithPhones.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchQuery
                  ? "No associates found matching your search."
                  : "No associates with phone numbers found."}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {associatesWithPhones.map((associate) => (
                  <label
                    key={associate.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAssociateIds.has(associate.id)}
                      onChange={() => toggleAssociateSelection(associate.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {associate.firstName} {associate.lastName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {associate.phoneNumber}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* WhatsApp Template Selection */}
        {messageType === "whatsapp" && (
          <div className="mb-4 flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WhatsApp Template
            </label>

            {loadingTemplates ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                <span className="ml-2 text-sm text-gray-600">
                  Loading templates...
                </span>
              </div>
            ) : templates.length === 0 ? (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                No templates found. Please create templates in Twilio Console.
              </div>
            ) : (
              <>
                {!selectedTemplate ? (
                  <div className="space-y-2">
                    <select
                      value=""
                      onChange={(e) => {
                        const selectedSid = e.target.value;
                        if (!selectedSid) return;

                        const template = templates.find(
                          (t) => t.sid === selectedSid
                        );
                        if (template) {
                          handleTemplateSelect(template);
                        }
                      }}
                      disabled={sendSuccess || sendLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                    >
                      <option value="">Select a template...</option>
                      {templates.map((template) => (
                        <option key={template.sid} value={template.sid}>
                          {template.friendlyName}{" "}
                          {template.status !== "approved"
                            ? `(${template.status})`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
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
                          onClick={() => {
                            setSelectedTemplate(null);
                            setTemplateVariables({});
                          }}
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
                                handleTemplateVariableChange(
                                  varNum,
                                  e.target.value
                                )
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
                )}
              </>
            )}
          </div>
        )}

        {/* Message Input - Show only for SMS */}
        {messageType === "sms" && (
          <div className="mb-4 flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              disabled={sendSuccess || sendLoading}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none h-24 resize-none ${
                sendSuccess
                  ? "border-green-500 ring-2 ring-green-500"
                  : sendLoading
                  ? "border-blue-500 ring-2 ring-blue-500"
                  : "border-gray-300 focus:ring-2 focus:ring-orange-500"
              } disabled:opacity-50`}
              placeholder="Type your message here..."
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-auto pt-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onCancel}
            disabled={sendLoading}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (messageType === "whatsapp" && selectedTemplate) {
                const contentVariablesObject: Record<string, string> = {};
                selectedTemplate.variables.forEach((varNum) => {
                  const value = templateVariables[varNum];
                  if (!value || typeof value !== "string" || !value.trim()) {
                    throw new Error(
                      `Template variable ${varNum} is required but is empty`
                    );
                  }
                  contentVariablesObject[varNum] = value.trim();
                });

                onSend({
                  associateIds: Array.from(selectedAssociateIds),
                  messageType,
                  templateData: {
                    contentSid: selectedTemplate.sid,
                    contentVariables: contentVariablesObject,
                  },
                });
              } else {
                onSend({
                  associateIds: Array.from(selectedAssociateIds),
                  messageType,
                  message: messageText.trim(),
                });
              }
            }}
            type="button"
            disabled={isDisabled}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sendLoading
              ? `Sending to ${selectedAssociateIds.size} recipient${
                  selectedAssociateIds.size !== 1 ? "s" : ""
                }...`
              : `Send to ${selectedAssociateIds.size} recipient${
                  selectedAssociateIds.size !== 1 ? "s" : ""
                }`}
          </button>
        </div>
      </div>
    </div>
  );
}
