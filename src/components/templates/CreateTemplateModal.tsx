"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface CreateTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ContentType =
  | "twilio/text"
  | "twilio/quick-reply"
  | "twilio/media"
  | "twilio/location"
  | "twilio/list-picker"
  | "twilio/call-to-action"
  | "twilio/card"
  | "twilio/carousel"
  | "twilio/catalog"
  | "twilio/pay"
  | "twilio/flows"
  | "whatsapp/card"
  | "whatsapp/authentication"
  | "whatsapp/flows";

type Category = "MARKETING" | "UTILITY" | "AUTHENTICATION";

interface QuickReplyAction {
  title: string;
  id: string;
}

interface MediaItem {
  url: string;
  type?: string;
}

interface ListPickerItem {
  id: string;
  title: string;
  description?: string;
}

interface CallToActionAction {
  title: string;
  type: string;
  url?: string;
  phone?: string;
}

interface CardAction {
  title: string;
  id: string;
}

export default function CreateTemplateModal({
  open,
  onClose,
  onSuccess,
}: CreateTemplateModalProps) {
  const [friendlyName, setFriendlyName] = useState("");
  const [language, setLanguage] = useState("en");
  const [category, setCategory] = useState<Category>("UTILITY");
  const [contentType, setContentType] = useState<ContentType>("twilio/text");
  const [body, setBody] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [submitForApproval, setSubmitForApproval] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick reply specific fields
  const [quickReplyActions, setQuickReplyActions] = useState<QuickReplyAction[]>(
    [{ title: "", id: "" }]
  );

  // Media specific fields
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([
    { url: "", type: "" },
  ]);

  // Location specific fields
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationLabel, setLocationLabel] = useState("");

  // List picker specific fields
  const [listPickerButton, setListPickerButton] = useState("");
  const [listPickerItems, setListPickerItems] = useState<ListPickerItem[]>([
    { id: "", title: "", description: "" },
  ]);

  // Call to action specific fields
  const [ctaActions, setCtaActions] = useState<CallToActionAction[]>([
    { title: "", type: "url", url: "" },
  ]);

  // Card specific fields
  const [cardTitle, setCardTitle] = useState("");
  const [cardMedia, setCardMedia] = useState<MediaItem[]>([]);
  const [cardActions, setCardActions] = useState<CardAction[]>([]);

  // Catalog specific fields
  const [catalogId, setCatalogId] = useState("");
  const [productId, setProductId] = useState("");
  const [catalogFooter, setCatalogFooter] = useState("");

  // Pay specific fields
  const [payAmount, setPayAmount] = useState("");
  const [payCurrency, setPayCurrency] = useState("USD");

  // Flows specific fields
  const [flowsData, setFlowsData] = useState("");

  // Detect variables in body text
  useEffect(() => {
    if (!body) {
      setVariables({});
      return;
    }
    const variableRegex = /\{\{(\d+)\}\}/g;
    const matches = Array.from(body.matchAll(variableRegex));
    const detectedVars: Record<string, string> = {};
    matches.forEach((match) => {
      const varNum = match[1];
      // Preserve existing value if it exists
      detectedVars[varNum] = variables[varNum] || "";
    });
    // Only update if the set of variable numbers changed
    const currentVarKeys = Object.keys(variables).sort().join(",");
    const newVarKeys = Object.keys(detectedVars).sort().join(",");
    if (currentVarKeys !== newVarKeys) {
      setVariables(detectedVars);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body]);

  const resetForm = () => {
    setFriendlyName("");
    setLanguage("en");
    setCategory("UTILITY");
    setContentType("twilio/text");
    setBody("");
    setVariables({});
    setSubmitForApproval(false);
    setQuickReplyActions([{ title: "", id: "" }]);
    setMediaItems([{ url: "", type: "" }]);
    setLatitude("");
    setLongitude("");
    setLocationLabel("");
    setListPickerButton("");
    setListPickerItems([{ id: "", title: "", description: "" }]);
    setCtaActions([{ title: "", type: "url", url: "" }]);
    setCardTitle("");
    setCardMedia([]);
    setCardActions([]);
    setCatalogId("");
    setProductId("");
    setCatalogFooter("");
    setPayAmount("");
    setPayCurrency("USD");
    setFlowsData("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const buildTypesObject = (): Record<string, any> => {
    const types: Record<string, any> = {};

    switch (contentType) {
      case "twilio/text":
        types["twilio/text"] = { body };
        break;

      case "twilio/quick-reply":
        types["twilio/quick-reply"] = {
          body,
          actions: quickReplyActions.filter((a) => a.title && a.id),
        };
        // Also include text fallback
        types["twilio/text"] = { body };
        break;

      case "twilio/media":
        types["twilio/media"] = {
          body,
          media: mediaItems.filter((m) => m.url),
        };
        break;

      case "twilio/location":
        types["twilio/location"] = {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          ...(locationLabel && { label: locationLabel }),
        };
        break;

      case "twilio/list-picker":
        types["twilio/list-picker"] = {
          body,
          button: listPickerButton,
          items: listPickerItems.filter((i) => i.id && i.title),
        };
        break;

      case "twilio/call-to-action":
        types["twilio/call-to-action"] = {
          body,
          actions: ctaActions.filter((a) => a.title && a.type),
        };
        break;

      case "twilio/card":
        types["twilio/card"] = {
          title: cardTitle,
          body,
          ...(cardMedia.length > 0 && { media: cardMedia.filter((m) => m.url) }),
          ...(cardActions.length > 0 && {
            actions: cardActions.filter((a) => a.title && a.id),
          }),
        };
        break;

      case "twilio/carousel":
        // Carousel is complex - for now, create a simple card-based carousel
        types["twilio/carousel"] = {
          cards: [
            {
              title: cardTitle,
              body,
              ...(cardMedia.length > 0 && {
                media: cardMedia.filter((m) => m.url),
              }),
              ...(cardActions.length > 0 && {
                actions: cardActions.filter((a) => a.title && a.id),
              }),
            },
          ],
        };
        break;

      case "twilio/catalog":
        types["twilio/catalog"] = {
          body,
          catalogId,
          productId,
          ...(catalogFooter && { footer: catalogFooter }),
        };
        break;

      case "twilio/pay":
        types["twilio/pay"] = {
          body,
          amount: payAmount,
          currency: payCurrency,
        };
        break;

      case "twilio/flows":
        try {
          const flows = JSON.parse(flowsData || "[]");
          types["twilio/flows"] = {
            body,
            flows,
          };
        } catch {
          throw new Error("Invalid flows JSON");
        }
        break;

      case "whatsapp/card":
        types["whatsapp/card"] = {
          title: cardTitle,
          body,
          ...(cardMedia.length > 0 && { media: cardMedia.filter((m) => m.url) }),
        };
        break;

      case "whatsapp/authentication":
        types["whatsapp/authentication"] = {
          body,
        };
        break;

      case "whatsapp/flows":
        try {
          const flows = JSON.parse(flowsData || "[]");
          types["whatsapp/flows"] = {
            body,
            flows,
          };
        } catch {
          throw new Error("Invalid flows JSON");
        }
        break;
    }

    return types;
  };

  const validateForm = (): boolean => {
    if (!friendlyName.trim()) {
      setError("Friendly name is required");
      return false;
    }

    if (!body.trim() && contentType !== "twilio/location") {
      setError("Body text is required");
      return false;
    }

    switch (contentType) {
      case "twilio/quick-reply":
        if (quickReplyActions.length === 0 || !quickReplyActions.some((a) => a.title && a.id)) {
          setError("At least one quick reply action is required");
          return false;
        }
        break;

      case "twilio/location":
        if (!latitude || !longitude) {
          setError("Latitude and longitude are required");
          return false;
        }
        if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
          setError("Latitude and longitude must be valid numbers");
          return false;
        }
        break;

      case "twilio/list-picker":
        if (!listPickerButton) {
          setError("List picker button text is required");
          return false;
        }
        if (listPickerItems.length === 0 || !listPickerItems.some((i) => i.id && i.title)) {
          setError("At least one list item is required");
          return false;
        }
        break;

      case "twilio/card":
      case "whatsapp/card":
        if (!cardTitle) {
          setError("Card title is required");
          return false;
        }
        break;

      case "twilio/catalog":
        if (!catalogId || !productId) {
          setError("Catalog ID and Product ID are required");
          return false;
        }
        break;

      case "twilio/pay":
        if (!payAmount) {
          setError("Payment amount is required");
          return false;
        }
        break;

      case "twilio/flows":
      case "whatsapp/flows":
        if (!flowsData) {
          setError("Flows JSON is required");
          return false;
        }
        try {
          JSON.parse(flowsData);
        } catch {
          setError("Invalid flows JSON");
          return false;
        }
        break;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const types = buildTypesObject();

      const response = await fetch("/api/twilio/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          friendlyName,
          language,
          category,
          contentType,
          types,
          variables: Object.keys(variables).length > 0 ? variables : undefined,
          submitForApproval,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create template");
      }

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create template");
    } finally {
      setLoading(false);
    }
  };

  const renderContentTypeFields = () => {
    switch (contentType) {
      case "twilio/text":
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Body *
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter your message. Use {{1}}, {{2}}, etc. for variables."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={6}
              required
            />
          </div>
        );

      case "twilio/quick-reply":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Body *
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter your message. Use {{1}}, {{2}}, etc. for variables."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Reply Actions *
              </label>
              {quickReplyActions.map((action, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Action Title"
                    value={action.title}
                    onChange={(e) => {
                      const updated = [...quickReplyActions];
                      updated[index].title = e.target.value;
                      setQuickReplyActions(updated);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Action ID"
                    value={action.id}
                    onChange={(e) => {
                      const updated = [...quickReplyActions];
                      updated[index].id = e.target.value;
                      setQuickReplyActions(updated);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {quickReplyActions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickReplyActions(quickReplyActions.filter((_, i) => i !== index));
                      }}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setQuickReplyActions([...quickReplyActions, { title: "", id: "" }])}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Action
              </button>
            </div>
          </div>
        );

      case "twilio/media":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Body *
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter your message"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Media Items
              </label>
              {mediaItems.map((item, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="url"
                    placeholder="Media URL"
                    value={item.url}
                    onChange={(e) => {
                      const updated = [...mediaItems];
                      updated[index].url = e.target.value;
                      setMediaItems(updated);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Type (optional)"
                    value={item.type || ""}
                    onChange={(e) => {
                      const updated = [...mediaItems];
                      updated[index].type = e.target.value;
                      setMediaItems(updated);
                    }}
                    className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {mediaItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setMediaItems(mediaItems.filter((_, i) => i !== index));
                      }}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setMediaItems([...mediaItems, { url: "", type: "" }])}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Media
              </button>
            </div>
          </div>
        );

      case "twilio/location":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Latitude *
              </label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="39.7392"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Longitude *
              </label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="104.9903"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Label (optional)
              </label>
              <input
                type="text"
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                placeholder="Location name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      case "twilio/list-picker":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Body *
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter your message"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Button Text *
              </label>
              <input
                type="text"
                value={listPickerButton}
                onChange={(e) => setListPickerButton(e.target.value)}
                placeholder="Select an option"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                List Items *
              </label>
              {listPickerItems.map((item, index) => (
                <div key={index} className="space-y-2 mb-3 p-3 border border-gray-200 rounded-lg">
                  <input
                    type="text"
                    placeholder="Item ID"
                    value={item.id}
                    onChange={(e) => {
                      const updated = [...listPickerItems];
                      updated[index].id = e.target.value;
                      setListPickerItems(updated);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Item Title"
                    value={item.title}
                    onChange={(e) => {
                      const updated = [...listPickerItems];
                      updated[index].title = e.target.value;
                      setListPickerItems(updated);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={item.description || ""}
                    onChange={(e) => {
                      const updated = [...listPickerItems];
                      updated[index].description = e.target.value;
                      setListPickerItems(updated);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {listPickerItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setListPickerItems(listPickerItems.filter((_, i) => i !== index));
                      }}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Remove Item
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setListPickerItems([
                    ...listPickerItems,
                    { id: "", title: "", description: "" },
                  ])
                }
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Item
              </button>
            </div>
          </div>
        );

      case "twilio/call-to-action":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Body *
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter your message"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Actions *
              </label>
              {ctaActions.map((action, index) => (
                <div key={index} className="space-y-2 mb-3 p-3 border border-gray-200 rounded-lg">
                  <input
                    type="text"
                    placeholder="Action Title"
                    value={action.title}
                    onChange={(e) => {
                      const updated = [...ctaActions];
                      updated[index].title = e.target.value;
                      setCtaActions(updated);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={action.type}
                    onChange={(e) => {
                      const updated = [...ctaActions];
                      updated[index].type = e.target.value;
                      setCtaActions(updated);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="url">URL</option>
                    <option value="phone">Phone</option>
                  </select>
                  {action.type === "url" ? (
                    <input
                      type="url"
                      placeholder="URL"
                      value={action.url || ""}
                      onChange={(e) => {
                        const updated = [...ctaActions];
                        updated[index].url = e.target.value;
                        setCtaActions(updated);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={action.phone || ""}
                      onChange={(e) => {
                        const updated = [...ctaActions];
                        updated[index].phone = e.target.value;
                        setCtaActions(updated);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  {ctaActions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setCtaActions(ctaActions.filter((_, i) => i !== index));
                      }}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Remove Action
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setCtaActions([...ctaActions, { title: "", type: "url", url: "" }])
                }
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Action
              </button>
            </div>
          </div>
        );

      case "twilio/card":
      case "whatsapp/card":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Title *
              </label>
              <input
                type="text"
                value={cardTitle}
                onChange={(e) => setCardTitle(e.target.value)}
                placeholder="Card title"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Body *
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Card body text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Media (optional)
              </label>
              {cardMedia.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setCardMedia([{ url: "", type: "" }])}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add Media
                </button>
              ) : (
                cardMedia.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="url"
                      placeholder="Media URL"
                      value={item.url}
                      onChange={(e) => {
                        const updated = [...cardMedia];
                        updated[index].url = e.target.value;
                        setCardMedia(updated);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCardMedia(cardMedia.filter((_, i) => i !== index));
                      }}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
            {contentType === "twilio/card" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Actions (optional)
                </label>
                {cardActions.map((action, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Action Title"
                      value={action.title}
                      onChange={(e) => {
                        const updated = [...cardActions];
                        updated[index].title = e.target.value;
                        setCardActions(updated);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Action ID"
                      value={action.id}
                      onChange={(e) => {
                        const updated = [...cardActions];
                        updated[index].id = e.target.value;
                        setCardActions(updated);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {cardActions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCardActions(cardActions.filter((_, i) => i !== index));
                        }}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setCardActions([...cardActions, { title: "", id: "" }])}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add Action
                </button>
              </div>
            )}
          </div>
        );

      case "twilio/catalog":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Body *
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter your message"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catalog ID *
              </label>
              <input
                type="text"
                value={catalogId}
                onChange={(e) => setCatalogId(e.target.value)}
                placeholder="Catalog ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product ID *
              </label>
              <input
                type="text"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                placeholder="Product ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Footer (optional)
              </label>
              <input
                type="text"
                value={catalogFooter}
                onChange={(e) => setCatalogFooter(e.target.value)}
                placeholder="Footer text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      case "twilio/pay":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Body *
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter your message"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount *
                </label>
                <input
                  type="text"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="10.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency *
                </label>
                <select
                  value={payCurrency}
                  onChange={(e) => setPayCurrency(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                </select>
              </div>
            </div>
          </div>
        );

      case "twilio/flows":
      case "whatsapp/flows":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Body *
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter your message"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Flows JSON *
              </label>
              <textarea
                value={flowsData}
                onChange={(e) => setFlowsData(e.target.value)}
                placeholder='[{"id":"flow-id","data":{}}]'
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={6}
                required
              />
            </div>
          </div>
        );

      case "whatsapp/authentication":
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Body *
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter your message"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={6}
              required
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Template</DialogTitle>
          <DialogDescription>
            Create a new WhatsApp template in Twilio. Templates are stored directly in Twilio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Friendly Name *
              </label>
              <input
                type="text"
                value={friendlyName}
                onChange={(e) => setFriendlyName(e.target.value)}
                placeholder="my_template_name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language *
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="en">English (en)</option>
                <option value="es">Spanish (es)</option>
                <option value="fr">French (fr)</option>
                <option value="de">German (de)</option>
                <option value="pt">Portuguese (pt)</option>
                <option value="it">Italian (it)</option>
                <option value="zh">Chinese (zh)</option>
                <option value="ja">Japanese (ja)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="UTILITY">UTILITY</option>
                <option value="MARKETING">MARKETING</option>
                <option value="AUTHENTICATION">AUTHENTICATION</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Type *
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ContentType)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="twilio/text">Text</option>
                <option value="twilio/quick-reply">Quick Reply</option>
                <option value="twilio/media">Media</option>
                <option value="twilio/location">Location</option>
                <option value="twilio/list-picker">List Picker</option>
                <option value="twilio/call-to-action">Call to Action</option>
                <option value="twilio/card">Card</option>
                <option value="twilio/carousel">Carousel</option>
                <option value="twilio/catalog">Catalog</option>
                <option value="twilio/pay">Pay</option>
                <option value="twilio/flows">Flows</option>
                <option value="whatsapp/card">WhatsApp Card</option>
                <option value="whatsapp/authentication">WhatsApp Authentication</option>
                <option value="whatsapp/flows">WhatsApp Flows</option>
              </select>
            </div>
          </div>

          {renderContentTypeFields()}

          {Object.keys(variables).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Variable Default Values
              </label>
              <div className="space-y-2">
                {Object.keys(variables)
                  .sort((a, b) => parseInt(a) - parseInt(b))
                  .map((varNum) => (
                    <div key={varNum} className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 w-12">{"{{" + varNum + "}}"}</span>
                      <input
                        type="text"
                        value={variables[varNum]}
                        onChange={(e) => {
                          setVariables({ ...variables, [varNum]: e.target.value });
                        }}
                        placeholder={`Default value for variable ${varNum}`}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="submitForApproval"
              checked={submitForApproval}
              onChange={(e) => setSubmitForApproval(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="submitForApproval" className="ml-2 text-sm text-gray-700">
              Submit for WhatsApp approval immediately after creation
            </label>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Template"
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

