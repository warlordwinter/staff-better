"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/ui/navBar";
import Footer from "@/components/ui/footer";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import { useAuthCheck } from "@/hooks/useAuthCheck";
import { AssociateGroup } from "@/model/interfaces/AssociateGroup";
import { Group } from "@/model/interfaces/Group";
import { GroupsDataService } from "@/lib/services/groupsDataService";

interface GroupPageProps {
  params: {
    id: string;
  };
}

export default function GroupPage({ params }: GroupPageProps) {
  const { loading: authLoading, isAuthenticated } = useAuthCheck();
  const [associates, setAssociates] = useState<AssociateGroup[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMassMessageModal, setShowMassMessageModal] = useState(false);
  const [showIndividualMessageModal, setShowIndividualMessageModal] = useState(false);
  const [selectedAssociate, setSelectedAssociate] = useState<AssociateGroup | null>(null);
  const [messageText, setMessageText] = useState("");

  // Load group and associates data using the data service
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch group and associates data in parallel
        const [groupData, associatesData] = await Promise.all([
          GroupsDataService.fetchGroupById(params.id),
          GroupsDataService.fetchAssociatesByGroupId(params.id)
        ]);
        
        setGroup(groupData);
        setAssociates(associatesData);
      } catch (error) {
        console.error("Error loading group data:", error);
        // Handle error appropriately in your app
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && isAuthenticated) {
      loadData();
    }
  }, [params.id, authLoading, isAuthenticated]);

  // Handle associate actions using the data service
  const handleSaveAssociate = async (updatedAssociate: AssociateGroup) => {
    try {
      if (updatedAssociate.isNew) {
        // Create new associate
        const newAssociate = await GroupsDataService.createAssociate({
          firstName: updatedAssociate.firstName,
          lastName: updatedAssociate.lastName,
          phoneNumber: updatedAssociate.phoneNumber,
          emailAddress: updatedAssociate.emailAddress,
          groupId: updatedAssociate.groupId
        });
        
        setAssociates(prevAssociates => [newAssociate, ...prevAssociates]);
      } else {
        // Update existing associate
        const savedAssociate = await GroupsDataService.updateAssociate(updatedAssociate.id, updatedAssociate);
        if (savedAssociate) {
          setAssociates(prevAssociates =>
            prevAssociates.map(associate =>
              associate.id === updatedAssociate.id ? savedAssociate : associate
            )
          );
        }
      }
    } catch (error) {
      console.error("Error saving associate:", error);
      // Handle error appropriately in your app
    }
  };

  const handleDeleteAssociate = async (associateId: string) => {
    if (window.confirm("Are you sure you want to delete this associate?")) {
      try {
        const success = await GroupsDataService.deleteAssociate(associateId);
        if (success) {
          setAssociates(prevAssociates => 
            prevAssociates.filter(associate => associate.id !== associateId)
          );
        }
      } catch (error) {
        console.error("Error deleting associate:", error);
        // Handle error appropriately in your app
      }
    }
  };

  const handleAddNewAssociate = () => {
    const newAssociateData: AssociateGroup = {
      id: Date.now().toString(),
      firstName: "",
      lastName: "",
      phoneNumber: "",
      emailAddress: "",
      groupId: params.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      isNew: true
    };

    setAssociates(prevAssociates => [newAssociateData, ...prevAssociates]);
  };

  const handleMessageAssociate = (associate: AssociateGroup) => {
    setSelectedAssociate(associate);
    setMessageText("");
    setShowIndividualMessageModal(true);
  };

  const handleMassMessage = () => {
    setMessageText("");
    setShowMassMessageModal(true);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      if (selectedAssociate) {
        // Send individual message
        await GroupsDataService.sendMessageToAssociate(selectedAssociate.id, messageText);
      } else {
        // Send mass message
        await GroupsDataService.sendMassMessageToGroup(params.id, messageText);
      }

      // Reset state
      setMessageText("");
      setShowMassMessageModal(false);
      setShowIndividualMessageModal(false);
      setSelectedAssociate(null);
    } catch (error) {
      console.error("Error sending message:", error);
      // Handle error appropriately in your app
    }
  };

  const handleCancelMessage = () => {
    setMessageText("");
    setShowMassMessageModal(false);
    setShowIndividualMessageModal(false);
    setSelectedAssociate(null);
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

  // Show loading while fetching data
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

  // Show 404 if group not found
  if (!group) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Group Not Found</h1>
            <Link href="/groups" className="text-blue-600 hover:underline">
              Return to Groups
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 flex flex-col gap-6 w-full max-w-6xl mx-auto px-4 mt-24">
        {/* Header Section */}
        <div className="relative flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* Back Arrow */}
            <Link 
              href="/groups" 
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
              title="Back to Groups"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-black text-5xl font-semibold font-['Inter']">{group.name}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Add Person Button */}
            <button
              onClick={handleAddNewAssociate}
              className="px-3 py-2 bg-green-600 rounded-xl inline-flex justify-center items-center gap-1 text-white cursor-pointer hover:bg-green-700 transition-colors"
            >
              <span className="text-sm font-normal font-['Inter']">Add Associate</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            
            {/* Mass Message Button */}
            <button
              onClick={handleMassMessage}
              className="px-3 py-2 bg-blue-600 rounded-xl inline-flex justify-center items-center gap-1 text-white cursor-pointer hover:bg-blue-700 transition-colors"
            >
              <span className="text-sm font-normal font-['Inter']">Message All</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2M9 9h6M9 13h6M9 17h4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Associates Table */}
        <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  First Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {associates.map((associate) => (
                <AssociateTableRow
                  key={associate.id}
                  associate={associate}
                  onSave={handleSaveAssociate}
                  onDelete={() => handleDeleteAssociate(associate.id)}
                  onMessage={() => handleMessageAssociate(associate)}
                />
              ))}
            </tbody>
          </table>
          
          {/* Empty State */}
          {associates.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No associates found in this group.</p>
            </div>
          )}
        </div>
      </main>

      {/* Mass Message Modal */}
      {showMassMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h2 className="text-xl font-bold text-black mb-4">Message All Associates</h2>
            <p className="text-sm text-gray-600 mb-4">What do you want to say?</p>
            
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
              placeholder="Enter your message here..."
              autoFocus
            />
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCancelMessage}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Message Modal */}
      {showIndividualMessageModal && selectedAssociate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h2 className="text-xl font-bold text-black mb-4">
              Message {selectedAssociate.firstName} {selectedAssociate.lastName}
            </h2>
            <p className="text-sm text-gray-600 mb-4">What do you want to say?</p>
            
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
              placeholder="Enter your message here..."
              autoFocus
            />
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCancelMessage}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

// Inline editing table row component
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
  const [editData, setEditData] = useState({
    firstName: associate.firstName || "",
    lastName: associate.lastName || "",
    phoneNumber: associate.phoneNumber || "",
    emailAddress: associate.emailAddress || "",
  });

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editData.firstName.trim() || !editData.lastName.trim()) return;

    const updatedAssociate: AssociateGroup = {
      ...associate,
      firstName: editData.firstName.trim(),
      lastName: editData.lastName.trim(),
      phoneNumber: editData.phoneNumber.trim(),
      emailAddress: editData.emailAddress.trim(),
      isNew: false,
    };

    onSave(updatedAssociate);
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (associate.isNew) {
      onDelete();
      return;
    }

    setEditData({
      firstName: associate.firstName || "",
      lastName: associate.lastName || "",
      phoneNumber: associate.phoneNumber || "",
      emailAddress: associate.emailAddress || "",
    });
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {isEditing ? (
          <input
            type="text"
            value={editData.firstName}
            onChange={(e) => handleInputChange("firstName", e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            placeholder="First name"
            autoFocus
          />
        ) : (
          <span className="font-medium">{associate.firstName}</span>
        )}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {isEditing ? (
          <input
            type="text"
            value={editData.lastName}
            onChange={(e) => handleInputChange("lastName", e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            placeholder="Last name"
          />
        ) : (
          associate.lastName
        )}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {isEditing ? (
          <input
            type="tel"
            value={editData.phoneNumber}
            onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            placeholder="Phone number"
          />
        ) : (
          associate.phoneNumber
        )}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {isEditing ? (
          <input
            type="email"
            value={editData.emailAddress}
            onChange={(e) => handleInputChange("emailAddress", e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            placeholder="Email address"
          />
        ) : (
          associate.emailAddress
        )}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              disabled={!editData.firstName.trim() || !editData.lastName.trim()}
              className={`px-2 py-1 text-xs text-white rounded focus:outline-none ${
                !editData.firstName.trim() || !editData.lastName.trim()
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600"
              }`}
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {/* Edit Button */}
            <button
              onClick={handleEdit}
              className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
              title="Edit associate"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            
            {/* Message Button */}
            <button
              onClick={onMessage}
              className="p-1 text-gray-400 hover:text-green-500 transition-colors"
              title="Message associate"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            
            {/* Delete Button */}
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              title="Delete associate"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
