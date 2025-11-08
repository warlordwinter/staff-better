"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/ui/navBar";
import Footer from "@/components/ui/footer";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import { useAuthCheck } from "@/hooks/useAuthCheck";
import { GroupsDataService } from "@/lib/services/groupsDataService";
import { AssociateGroup } from "@/model/interfaces/AssociateGroup";
import { formatPhoneForDisplay } from "@/utils/phoneUtils";
import AssociateActions from "@/components/shared/AssociateActions";
import IndividualMessageModal from "@/components/groups/IndividualMessageModal";
import MassMessageModal from "@/components/groups/MassMessageModal";
import { AssociateFormData } from "@/components/shared/AssociateForm";
import { isValidPhoneNumber } from "@/utils/phoneUtils";
import {
  associateGroupToFormData,
  formDataToAssociateGroup,
} from "@/utils/associateUtils";

// Helper function to get initials from name
const getInitials = (firstName: string, lastName: string): string => {
  const first = firstName?.charAt(0)?.toUpperCase() || "";
  const last = lastName?.charAt(0)?.toUpperCase() || "";
  return `${first}${last}`;
};

// Custom table row component with avatar
function AssociateTableRow({
  associate,
  onSave,
  onDelete,
  onMessage,
}: {
  associate: AssociateGroup;
  onSave: (updatedAssociate: AssociateGroup) => void;
  onDelete: () => void;
  onMessage: () => void;
}) {
  const [isEditing, setIsEditing] = useState(associate.isNew || false);

  // Memoize the form data to prevent infinite re-renders
  const initialFormData = useMemo(
    () => associateGroupToFormData(associate),
    [associate]
  );

  const [formData, setFormData] = useState(initialFormData);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    const updatedAssociate = formDataToAssociateGroup(
      formData,
      associate.groupId,
      associate.id
    );
    // Preserve the isNew flag from the original associate
    updatedAssociate.isNew = associate.isNew;
    onSave(updatedAssociate);
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (associate.isNew) {
      onDelete();
    } else {
      setIsEditing(false);
    }
  };

  return (
    <tr className="hover:bg-gray-50 border-b border-gray-100 transition-colors duration-150">
      {/* Avatar */}
      <td className="px-4 py-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] flex items-center justify-center text-white text-sm font-semibold">
          {getInitials(associate.firstName, associate.lastName)}
        </div>
      </td>

      {/* First Name */}
      <td className="px-4 py-4 text-sm text-gray-900 font-medium truncate">
        {isEditing ? (
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => {
              const updatedData = { ...formData, firstName: e.target.value };
              setFormData(updatedData);
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="First name"
            autoFocus
          />
        ) : (
          <span className="font-medium text-gray-900">
            {associate.firstName}
          </span>
        )}
      </td>

      {/* Last Name */}
      <td className="px-4 py-4 text-sm text-gray-700 truncate">
        {isEditing ? (
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => {
              const updatedData = { ...formData, lastName: e.target.value };
              setFormData(updatedData);
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Last name"
          />
        ) : (
          associate.lastName
        )}
      </td>

      {/* Phone Number */}
      <td className="px-4 py-4 text-sm text-gray-700 font-mono truncate">
        {isEditing ? (
          <input
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) => {
              const updatedData = { ...formData, phoneNumber: e.target.value };
              setFormData(updatedData);
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Phone number"
          />
        ) : (
          formatPhoneForDisplay(associate.phoneNumber)
        )}
      </td>

      {/* Email Address */}
      <td className="px-4 py-4 text-sm text-gray-700 truncate">
        {isEditing ? (
          <input
            type="email"
            value={formData.emailAddress}
            onChange={(e) => {
              const updatedData = { ...formData, emailAddress: e.target.value };
              setFormData(updatedData);
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Email address"
          />
        ) : (
          associate.emailAddress || "-"
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-4 text-center">
        {isEditing ? (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handleSave}
              disabled={!formData.firstName.trim() || !formData.lastName.trim()}
              className={`px-3 py-1 text-xs text-white rounded focus:outline-none ${
                !formData.firstName.trim() || !formData.lastName.trim()
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600"
              }`}
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <AssociateActions
              onEdit={handleEdit}
              onDelete={onDelete}
              onMessage={onMessage}
              showMessageButton={false}
              size="md"
            />
          </div>
        )}
      </td>
    </tr>
  );
}

export default function AssociatesPage() {
  const { loading: authLoading, isAuthenticated } = useAuthCheck();
  const [associates, setAssociates] = useState<AssociateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMassMessageModal, setShowMassMessageModal] = useState(false);
  const [showIndividualMessageModal, setShowIndividualMessageModal] =
    useState(false);
  const [selectedAssociate, setSelectedAssociate] =
    useState<AssociateGroup | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showAddNewModal, setShowAddNewModal] = useState(false);
  const [newAssociateForm, setNewAssociateForm] = useState<AssociateFormData>({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    emailAddress: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<AssociateFormData>>({});
  const [phoneError, setPhoneError] = useState("");

  // Load all associates
  useEffect(() => {
    const loadAssociates = async () => {
      try {
        const associatesData = await GroupsDataService.fetchAllAssociates();
        setAssociates(associatesData);
      } catch (error) {
        console.error("Error loading associates:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && isAuthenticated) {
      loadAssociates();
    }
  }, [authLoading, isAuthenticated]);

  // Handle save associate
  const handleSave = async (updatedAssociate: AssociateGroup) => {
    try {
      const response = await fetch(`/api/associates/${updatedAssociate.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: updatedAssociate.firstName.trim(),
          last_name: updatedAssociate.lastName.trim(),
          phone_number: updatedAssociate.phoneNumber.trim(),
          email_address: updatedAssociate.emailAddress.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update associate");
      }

      // Update local state
      setAssociates((prev) =>
        prev.map((a) => (a.id === updatedAssociate.id ? updatedAssociate : a))
      );
    } catch (error) {
      console.error("Error updating associate:", error);
      alert("Failed to update associate. Please try again.");
    }
  };

  // Handle delete associate
  const handleDelete = async (associateId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this associate? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/associates/${associateId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to delete associate";
        throw new Error(errorMessage);
      }

      setAssociates((prev) => prev.filter((a) => a.id !== associateId));
    } catch (error) {
      console.error("Error deleting associate:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to delete associate. Please try again.";
      alert(errorMessage);
    }
  };

  // Handle message individual associate
  const handleMessageAssociate = (associate: AssociateGroup) => {
    setSelectedAssociate(associate);
    setMessageText("");
    setShowIndividualMessageModal(true);
  };

  // Handle message all associates
  const handleMessageAll = () => {
    setMessageText("");
    setShowMassMessageModal(true);
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      return;
    }

    setSendLoading(true);
    setSendSuccess(false);
    setSendError(null);

    try {
      if (selectedAssociate) {
        // Send to individual associate
        await GroupsDataService.sendMessageToAssociate(
          selectedAssociate.id,
          messageText.trim()
        );
      } else {
        // Send to all associates
        const promises = associates.map((associate) =>
          GroupsDataService.sendMessageToAssociate(
            associate.id,
            messageText.trim()
          ).catch((error) => {
            console.error(
              `Failed to send message to ${associate.firstName} ${associate.lastName}:`,
              error
            );
            return false;
          })
        );
        await Promise.all(promises);
      }

      setSendSuccess(true);
      setTimeout(() => {
        setShowIndividualMessageModal(false);
        setShowMassMessageModal(false);
        setSelectedAssociate(null);
        setMessageText("");
        setSendSuccess(false);
        setSendError(null);
      }, 1500);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to send message. Please try again.";
      setSendError(errorMessage);
    } finally {
      setSendLoading(false);
    }
  };

  // Handle cancel message
  const handleCancelMessage = () => {
    setShowIndividualMessageModal(false);
    setShowMassMessageModal(false);
    setSelectedAssociate(null);
    setMessageText("");
    setSendSuccess(false);
    setSendError(null);
  };

  // Handle add new associate
  const handleAddNew = () => {
    setNewAssociateForm({
      firstName: "",
      lastName: "",
      phoneNumber: "",
      emailAddress: "",
    });
    setFormErrors({});
    setPhoneError("");
    setShowAddNewModal(true);
  };

  // Handle form input change
  const handleFormInputChange = (
    field: keyof AssociateFormData,
    value: string
  ) => {
    setNewAssociateForm((prev) => ({ ...prev, [field]: value }));

    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }

    // Validate phone number in real-time
    if (field === "phoneNumber") {
      if (value.trim() === "") {
        setPhoneError("");
      } else {
        try {
          if (isValidPhoneNumber(value)) {
            setPhoneError("");
          } else {
            setPhoneError("Invalid phone format");
          }
        } catch {
          setPhoneError("Invalid phone format");
        }
      }
    }
  };

  // Validate form
  const validateNewAssociateForm = (): boolean => {
    const newErrors: Partial<AssociateFormData> = {};

    if (!newAssociateForm.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!newAssociateForm.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (newAssociateForm.phoneNumber.trim()) {
      if (!isValidPhoneNumber(newAssociateForm.phoneNumber)) {
        setPhoneError("Please enter a valid phone number");
        return false;
      }
    }

    if (
      newAssociateForm.emailAddress.trim() &&
      !/\S+@\S+\.\S+/.test(newAssociateForm.emailAddress)
    ) {
      newErrors.emailAddress = "Please enter a valid email address";
    }

    setFormErrors(newErrors);
    setPhoneError("");
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit new associate form
  const handleSubmitNewAssociate = async () => {
    if (!validateNewAssociateForm()) {
      return;
    }

    const formData = newAssociateForm;
    try {
      const response = await fetch("/api/associates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          phone_number: formData.phoneNumber.trim() || null,
          email_address: formData.emailAddress.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create associate");
      }

      const createdAssociates = await response.json();
      const newAssociate = createdAssociates[0];

      // Convert to AssociateGroup format and add to list
      const associateGroup: AssociateGroup = {
        id: newAssociate.id,
        firstName: newAssociate.first_name || "",
        lastName: newAssociate.last_name || "",
        phoneNumber: newAssociate.phone_number || "",
        emailAddress: newAssociate.email_address || "",
        groupId: "",
        createdAt: new Date(newAssociate.created_at || Date.now()),
        updatedAt: new Date(newAssociate.updated_at || Date.now()),
      };

      setAssociates((prev) => [associateGroup, ...prev]);
      setShowAddNewModal(false);
    } catch (error) {
      console.error("Error creating associate:", error);
      alert("Failed to create associate. Please try again.");
    }
  };

  // Handle cancel add new associate
  const handleCancelAddNew = () => {
    setShowAddNewModal(false);
  };

  // Show loading spinner while checking authentication
  if (authLoading) {
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

  // Show loading spinner while fetching associates data
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 mt-24">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/home"
              className="text-gray-600 hover:text-gray-900 transition-colors"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-4xl font-bold text-black">All Associates</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddNew}
              className="px-4 py-2 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white rounded-lg font-medium inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add New
            </button>
            <button
              onClick={handleMessageAll}
              className="px-4 py-2 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white rounded-lg font-medium inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
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
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              Message All
            </button>
          </div>
        </div>

        {/* Associates Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-20">
                    {/* Avatar column */}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                    First Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                    Last Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-40">
                    Phone Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-48">
                    Email Address
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {associates.map((associate) => (
                  <AssociateTableRow
                    key={associate.id}
                    associate={associate}
                    onSave={handleSave}
                    onDelete={() => handleDelete(associate.id)}
                    onMessage={() => handleMessageAssociate(associate)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {associates.length === 0 && (
            <div className="text-center py-12 bg-gray-50">
              <p className="text-gray-500 text-sm">
                No associates found. Use the buttons above to add some!
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <IndividualMessageModal
        isOpen={showIndividualMessageModal}
        associate={selectedAssociate}
        messageText={messageText}
        onMessageTextChange={setMessageText}
        onSend={handleSendMessage}
        sendLoading={sendLoading}
        sendSuccess={sendSuccess}
        error={sendError}
        onCancel={handleCancelMessage}
      />

      <MassMessageModal
        isOpen={showMassMessageModal}
        messageText={messageText}
        onMessageTextChange={setMessageText}
        onSend={handleSendMessage}
        sendLoading={sendLoading}
        sendSuccess={sendSuccess}
        onCancel={handleCancelMessage}
      />

      {/* Add New Associate Modal */}
      {showAddNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 relative">
            {/* Close Icon */}
            <button
              onClick={handleCancelAddNew}
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition-colors"
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

            {/* Title */}
            <h2 className="text-xl font-bold text-black mb-2 pr-8">
              Add New Associate to All Associates
            </h2>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-6">
              Create a new associate and add them to this group.
            </p>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmitNewAssociate();
              }}
              className="mb-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <input
                    type="text"
                    placeholder="First Name *"
                    value={newAssociateForm.firstName}
                    onChange={(e) =>
                      handleFormInputChange("firstName", e.target.value)
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      formErrors.firstName
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />
                  {formErrors.firstName && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.firstName}
                    </p>
                  )}
                </div>

                <div className="flex flex-col">
                  <input
                    type="text"
                    placeholder="Last Name *"
                    value={newAssociateForm.lastName}
                    onChange={(e) =>
                      handleFormInputChange("lastName", e.target.value)
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      formErrors.lastName ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {formErrors.lastName && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.lastName}
                    </p>
                  )}
                </div>

                <div className="flex flex-col">
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={newAssociateForm.phoneNumber}
                    onChange={(e) =>
                      handleFormInputChange("phoneNumber", e.target.value)
                    }
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
                    value={newAssociateForm.emailAddress}
                    onChange={(e) =>
                      handleFormInputChange("emailAddress", e.target.value)
                    }
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      formErrors.emailAddress
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />
                  {formErrors.emailAddress && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.emailAddress}
                    </p>
                  )}
                </div>
              </div>
            </form>

            {/* Custom Button Layout to Match Design */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancelAddNew}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitNewAssociate}
                disabled={!!phoneError}
                className={`px-4 py-2 rounded-lg font-medium transition-opacity ${
                  phoneError
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white hover:opacity-90"
                }`}
              >
                Add Associate
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
