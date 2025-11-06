"use client";

import React, { useState, useEffect } from "react";
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

// Helper function to get initials from name
const getInitials = (firstName: string, lastName: string): string => {
  const first = firstName?.charAt(0)?.toUpperCase() || "";
  const last = lastName?.charAt(0)?.toUpperCase() || "";
  return `${first}${last}`;
};

export default function AssociatesPage() {
  const { loading: authLoading, isAuthenticated } = useAuthCheck();
  const [associates, setAssociates] = useState<AssociateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddNewModal, setShowAddNewModal] = useState(false);
  const [showAddExistingModal, setShowAddExistingModal] = useState(false);
  const [showMassMessageModal, setShowMassMessageModal] = useState(false);
  const [showIndividualMessageModal, setShowIndividualMessageModal] =
    useState(false);
  const [selectedAssociate, setSelectedAssociate] =
    useState<AssociateGroup | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    firstName: string;
    lastName: string;
    phoneNumber: string;
    emailAddress: string;
  } | null>(null);

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

  // Handle edit
  const handleEdit = (associate: AssociateGroup) => {
    setEditingId(associate.id);
    setEditData({
      firstName: associate.firstName,
      lastName: associate.lastName,
      phoneNumber: associate.phoneNumber,
      emailAddress: associate.emailAddress,
    });
  };

  // Handle save
  const handleSave = async (associateId: string) => {
    if (!editData || !editData.firstName.trim() || !editData.lastName.trim()) {
      return;
    }

    try {
      // Update associate via API
      const response = await fetch(`/api/associates/${associateId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: editData.firstName.trim(),
          last_name: editData.lastName.trim(),
          phone_number: editData.phoneNumber.trim(),
          email_address: editData.emailAddress.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update associate");
      }

      // Update local state
      setAssociates((prev) =>
        prev.map((a) =>
          a.id === associateId
            ? {
                ...a,
                firstName: editData.firstName.trim(),
                lastName: editData.lastName.trim(),
                phoneNumber: editData.phoneNumber.trim(),
                emailAddress: editData.emailAddress.trim(),
              }
            : a
        )
      );
      setEditingId(null);
      setEditData(null);
    } catch (error) {
      console.error("Error updating associate:", error);
      alert("Failed to update associate. Please try again.");
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  // Handle delete
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
        throw new Error("Failed to delete associate");
      }

      setAssociates((prev) => prev.filter((a) => a.id !== associateId));
    } catch (error) {
      console.error("Error deleting associate:", error);
      alert("Failed to delete associate. Please try again.");
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
      }, 1500);
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
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
  };

  // Handle add new associate
  const handleAddNew = () => {
    // TODO: Implement add new associate functionality
    alert("Add New Associate functionality coming soon!");
  };

  // Handle add existing associate
  const handleAddExisting = () => {
    // TODO: Implement add existing associate functionality
    alert("Add Existing Associate functionality coming soon!");
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
              onClick={handleAddExisting}
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
              Add Existing
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    First Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Last Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Email Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {associates.map((associate) => (
                  <tr
                    key={associate.id}
                    className="hover:bg-gray-50 border-b border-gray-100 transition-colors duration-150"
                  >
                    {/* Avatar */}
                    <td className="px-4 py-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] flex items-center justify-center text-white text-sm font-semibold">
                        {getInitials(associate.firstName, associate.lastName)}
                      </div>
                    </td>

                    {/* First Name */}
                    <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                      {editingId === associate.id ? (
                        <input
                          type="text"
                          value={editData?.firstName || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData!,
                              firstName: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="First name"
                          autoFocus
                        />
                      ) : (
                        associate.firstName
                      )}
                    </td>

                    {/* Last Name */}
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {editingId === associate.id ? (
                        <input
                          type="text"
                          value={editData?.lastName || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData!,
                              lastName: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Last name"
                        />
                      ) : (
                        associate.lastName
                      )}
                    </td>

                    {/* Phone Number */}
                    <td className="px-4 py-4 text-sm text-gray-700 font-mono">
                      {editingId === associate.id ? (
                        <input
                          type="tel"
                          value={editData?.phoneNumber || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData!,
                              phoneNumber: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Phone number"
                        />
                      ) : (
                        formatPhoneForDisplay(associate.phoneNumber)
                      )}
                    </td>

                    {/* Email Address */}
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {editingId === associate.id ? (
                        <input
                          type="email"
                          value={editData?.emailAddress || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData!,
                              emailAddress: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Email address"
                        />
                      ) : (
                        associate.emailAddress || "-"
                      )}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {/* Role field not yet implemented in database */}
                      <span className="text-gray-400">-</span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 text-center">
                      {editingId === associate.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleSave(associate.id)}
                            disabled={
                              !editData?.firstName.trim() ||
                              !editData?.lastName.trim()
                            }
                            className={`px-3 py-1 text-xs text-white rounded focus:outline-none ${
                              !editData?.firstName.trim() ||
                              !editData?.lastName.trim()
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-green-500 hover:bg-green-600"
                            }`}
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <AssociateActions
                            onEdit={() => handleEdit(associate)}
                            onDelete={() => handleDelete(associate.id)}
                            showMessageButton={false}
                            size="md"
                          />
                        </div>
                      )}
                    </td>
                  </tr>
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

      <Footer />
    </div>
  );
}

