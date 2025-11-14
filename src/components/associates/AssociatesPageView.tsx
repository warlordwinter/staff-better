"use client";

import React, { useState, useMemo, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/ui/navBar";
import Footer from "@/components/ui/footer";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import { AssociateGroup } from "@/model/interfaces/AssociateGroup";
import { AssociateFormData } from "@/components/shared/AssociateForm";
import { formatPhoneForDisplay } from "@/utils/phoneUtils";
import AssociateActions from "@/components/shared/AssociateActions";
import IndividualMessageModal from "@/components/groups/IndividualMessageModal";
import MassMessageModal from "@/components/groups/MassMessageModal";
import Toast from "@/components/ui/Toast";
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
      <td className="px-4 py-4 text-sm text-gray-700 font-mono whitespace-nowrap">
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

interface AssociatesPageViewProps {
  // Auth state
  authLoading: boolean;
  isAuthenticated: boolean;
  // Model state
  associates: AssociateGroup[];
  loading: boolean;
  messageText: string;
  selectedAssociate: AssociateGroup | null;
  showMassMessageModal: boolean;
  showIndividualMessageModal: boolean;
  showAddNewModal: boolean;
  newAssociateForm: AssociateFormData;
  formErrors: Partial<AssociateFormData>;
  phoneError: string;
  toastMessage: string;
  toastType: "error" | "success" | "info";
  showToast: boolean;
  sendLoading: boolean;
  sendSuccess: boolean;
  sendError: string | null;
  isSubmitting: boolean;
  // Actions
  onMessageTextChange: (text: string) => void;
  onSendMessage: () => void;
  onCancelMessage: () => void;
  onAddNew: () => void;
  onCancelAddNew: () => void;
  onFormInputChange: (field: keyof AssociateFormData, value: string) => void;
  onSubmitNewAssociate: () => void;
  onSaveAssociate: (associate: AssociateGroup) => void;
  onDeleteAssociate: (associateId: string) => void;
  onMessageAssociate: (associate: AssociateGroup) => void;
  onMessageAll: () => void;
  onCloseToast: () => void;
  onUploadCSV: (file: File) => void;
  isUploading?: boolean;
}

export default function AssociatesPageView({
  authLoading,
  isAuthenticated,
  associates,
  loading,
  messageText,
  selectedAssociate,
  showMassMessageModal,
  showIndividualMessageModal,
  showAddNewModal,
  newAssociateForm,
  formErrors,
  phoneError,
  toastMessage,
  toastType,
  showToast,
  sendLoading,
  sendSuccess,
  sendError,
  isSubmitting,
  onMessageTextChange,
  onSendMessage,
  onCancelMessage,
  onAddNew,
  onCancelAddNew,
  onFormInputChange,
  onSubmitNewAssociate,
  onSaveAssociate,
  onDeleteAssociate,
  onMessageAssociate,
  onMessageAll,
  onCloseToast,
  onUploadCSV,
  isUploading = false,
}: AssociatesPageViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    console.log("🖱️ Upload button clicked!");
    console.log("📎 File input ref:", fileInputRef.current);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log("⚠️ No file selected");
      return;
    }

    console.log("📁 File selected:", file.name, file.type);

    // Accept CSV and Excel files
    const fileName = file.name.toLowerCase();
    const isValidFile =
      fileName.endsWith(".csv") ||
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".xls");

    if (!isValidFile) {
      console.error("Invalid file type. Expected .csv, .xlsx, or .xls");
      e.target.value = "";
      return;
    }

    console.log("✅ File is valid, calling onUploadCSV...");
    // Call the upload handler with the file
    try {
      await onUploadCSV(file);
      console.log("✅ onUploadCSV completed");
    } catch (error) {
      console.error("❌ Error in onUploadCSV:", error);
    }

    // Clear the input
    e.target.value = "";
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner />
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
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleUploadClick();
              }}
              disabled={isUploading}
              className="px-4 py-2 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white rounded-lg font-medium inline-flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              {isUploading ? "Uploading..." : "Upload CSV/Excel"}
            </button>
            <button
              onClick={onAddNew}
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
              onClick={onMessageAll}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-48">
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
                    onSave={onSaveAssociate}
                    onDelete={() => onDeleteAssociate(associate.id)}
                    onMessage={() => onMessageAssociate(associate)}
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
        onMessageTextChange={onMessageTextChange}
        onSend={onSendMessage}
        sendLoading={sendLoading}
        sendSuccess={sendSuccess}
        error={sendError}
        onCancel={onCancelMessage}
      />

      <MassMessageModal
        isOpen={showMassMessageModal}
        messageText={messageText}
        onMessageTextChange={onMessageTextChange}
        onSend={onSendMessage}
        sendLoading={sendLoading}
        sendSuccess={sendSuccess}
        onCancel={onCancelMessage}
      />

      {/* Add New Associate Modal */}
      {showAddNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 relative">
            {/* Close Icon */}
            <button
              onClick={onCancelAddNew}
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
                onSubmitNewAssociate();
              }}
              className="mb-4"
              id="add-associate-form"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <input
                    type="text"
                    placeholder="First Name *"
                    value={newAssociateForm.firstName}
                    onChange={(e) =>
                      onFormInputChange("firstName", e.target.value)
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
                      onFormInputChange("lastName", e.target.value)
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
                      onFormInputChange("phoneNumber", e.target.value)
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
                      onFormInputChange("emailAddress", e.target.value)
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
                onClick={onCancelAddNew}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-associate-form"
                disabled={!!phoneError || isSubmitting}
                className={`px-4 py-2 rounded-lg font-medium transition-opacity ${
                  phoneError || isSubmitting
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white hover:opacity-90"
                }`}
              >
                {isSubmitting ? "Adding..." : "Add Associate"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />

      {/* Toast Notification */}
      <Toast
        message={toastMessage || ""}
        type={toastType}
        isVisible={showToast}
        onClose={onCloseToast}
        duration={7000}
      />
    </div>
  );
}
