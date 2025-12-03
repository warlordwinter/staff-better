"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import Navbar from "@/components/ui/navBar";
import Footer from "@/components/ui/footer";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import { useAuthCheck } from "@/hooks/useAuthCheck";
import { AssociateGroup } from "@/model/interfaces/AssociateGroup";
import { Group } from "@/model/interfaces/Group";
import { GroupsDataService } from "@/lib/services/groupsDataService";

// Import new components
import GroupHeader from "@/components/groups/GroupHeader";
import GroupAssociateTable from "@/components/groups/GroupAssociateTable";
import MassMessageModal from "@/components/groups/MassMessageModal";
import IndividualMessageModal from "@/components/groups/IndividualMessageModal";
import AddExistingModal from "@/components/groups/AddExistingModal";
import Toast from "@/components/ui/Toast";

interface GroupPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function GroupPage({ params }: GroupPageProps) {
  const { id: groupId } = use(params);
  const { loading: authLoading, isAuthenticated } = useAuthCheck();
  const [associates, setAssociates] = useState<AssociateGroup[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMassMessageModal, setShowMassMessageModal] = useState(false);
  const [showIndividualMessageModal, setShowIndividualMessageModal] =
    useState(false);
  const [showAddExistingModal, setShowAddExistingModal] = useState(false);
  const [selectedAssociate, setSelectedAssociate] =
    useState<AssociateGroup | null>(null);
  const [messageText, setMessageText] = useState("");
  const [availableAssociates, setAvailableAssociates] = useState<
    AssociateGroup[]
  >([]);
  const [selectedAssociateIds, setSelectedAssociateIds] = useState<string[]>(
    []
  );
  const [loadingAssociates, setLoadingAssociates] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"error" | "success" | "info">(
    "info"
  );
  const [showToast, setShowToast] = useState(false);

  // Load group and associates data using the data service
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch group data first
        const groupData = await GroupsDataService.fetchGroupById(groupId);
        setGroup(groupData);

        // Try to fetch associates, but don't fail if it errors
        try {
          const associatesData =
            await GroupsDataService.fetchAssociatesByGroupId(groupId);
          setAssociates(associatesData);
        } catch (membersError) {
          console.error(
            "Error loading group members (table may not exist yet):",
            membersError
          );
          // Set empty array so the page still renders with the Quick Add form
          setAssociates([]);
        }
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
  }, [groupId, authLoading, isAuthenticated]);

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
          groupId: updatedAssociate.groupId,
        });

        // Replace the temporary draft row with the saved associate
        setAssociates((prevAssociates) =>
          prevAssociates.map((a) =>
            a.id === updatedAssociate.id ? newAssociate : a
          )
        );
      } else {
        // Update existing associate
        const savedAssociate = await GroupsDataService.updateAssociate(
          updatedAssociate.id,
          updatedAssociate
        );
        if (savedAssociate) {
          setAssociates((prevAssociates) =>
            prevAssociates.map((associate) =>
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
    if (
      window.confirm(
        "Are you sure you want to remove this associate from the group?"
      )
    ) {
      try {
        const success = await GroupsDataService.removeAssociateFromGroup(
          groupId,
          associateId
        );
        if (success) {
          setAssociates((prevAssociates) =>
            prevAssociates.filter((associate) => associate.id !== associateId)
          );
        }
      } catch (error) {
        console.error("Error removing associate from group:", error);
        // Handle error appropriately in your app
      }
    }
  };

  const handleAddNewAssociate = () => {
    const newAssociateData: AssociateGroup = {
      id: crypto.randomUUID(),
      firstName: "",
      lastName: "",
      phoneNumber: "",
      emailAddress: "",
      groupId: groupId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isNew: true,
    };

    setAssociates((prevAssociates) => [newAssociateData, ...prevAssociates]);
  };

  const handleAddExistingAssociates = async () => {
    setLoadingAssociates(true);
    setSelectedAssociateIds([]);

    try {
      // Fetch all available associates
      const allAssociates = await GroupsDataService.fetchAllAssociates();

      // Filter out associates that are already in this group
      const currentGroupAssociateIds = associates.map((a) => a.id);
      const availableAssociates = allAssociates.filter(
        (associate) => !currentGroupAssociateIds.includes(associate.id)
      );

      setAvailableAssociates(availableAssociates);
      setShowAddExistingModal(true);
    } catch (error) {
      console.error("Error loading available associates:", error);
    } finally {
      setLoadingAssociates(false);
    }
  };

  const handleSelectAssociate = (associateId: string, selected: boolean) => {
    if (selected) {
      setSelectedAssociateIds((prev) => [...prev, associateId]);
    } else {
      setSelectedAssociateIds((prev) =>
        prev.filter((id) => id !== associateId)
      );
    }
  };

  const handleAddSelectedAssociates = async () => {
    if (selectedAssociateIds.length === 0) return;

    try {
      await GroupsDataService.addExistingAssociatesToGroup(
        groupId,
        selectedAssociateIds
      );

      // Refresh the group members
      const updatedAssociates =
        await GroupsDataService.fetchAssociatesByGroupId(groupId);
      setAssociates(updatedAssociates);

      // Close modal and reset state
      setShowAddExistingModal(false);
      setSelectedAssociateIds([]);
      setAvailableAssociates([]);
    } catch (error) {
      console.error("Error adding associates to group:", error);
    }
  };

  const handleCancelAddExisting = () => {
    setShowAddExistingModal(false);
    setSelectedAssociateIds([]);
    setAvailableAssociates([]);
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

    setSendLoading(true);
    setSendSuccess(false);
    setSendError(null);
    setShowToast(false);

    try {
      if (selectedAssociate) {
        // Send individual message
        await GroupsDataService.sendMessageToAssociate(
          selectedAssociate.id,
          messageText
        );
      } else {
        // Send mass message
        const result = await GroupsDataService.sendMassMessageToGroup(
          groupId,
          messageText
        );

        // Show toast if there are unsubscribed members
        if (
          result.unsubscribed_members &&
          result.unsubscribed_members.length > 0
        ) {
          const names = result.unsubscribed_members.map(
            (m) => `${m.first_name} ${m.last_name}`
          );
          let message = "The message was sent to everyone except ";

          if (names.length === 1) {
            message += `${names[0]}`;
          } else if (names.length === 2) {
            message += `${names[0]} and ${names[1]}`;
          } else {
            const namesCopy = [...names];
            const last = namesCopy.pop();
            message += `${namesCopy.join(", ")}, and ${last}`;
          }

          message += " all of which have unsubscribed";

          setToastMessage(message);
          setToastType("info");
          setShowToast(true);
        }
      }

      // Show success check briefly, then close/reset
      setSendSuccess(true);
      setTimeout(() => {
        setSendSuccess(false);
        setMessageText("");
        setShowMassMessageModal(false);
        setShowIndividualMessageModal(false);
        setSelectedAssociate(null);
        setSendError(null);
      }, 1000);
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

  const handleCancelMessage = () => {
    setMessageText("");
    setShowMassMessageModal(false);
    setShowIndividualMessageModal(false);
    setSelectedAssociate(null);
    setSendError(null);
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner />
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
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Group Not Found
            </h1>
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
      <main className="flex-1 flex flex-col gap-6 w-full max-w-6xl mx-auto px-4">
        {/* Header Section */}
        <GroupHeader
          group={group}
          onAddNew={handleAddNewAssociate}
          onAddExisting={handleAddExistingAssociates}
          onMassMessage={handleMassMessage}
          loadingAssociates={loadingAssociates}
        />

        {/* Associates Table */}
        <GroupAssociateTable
          associates={associates}
          onSave={handleSaveAssociate}
          onDelete={handleDeleteAssociate}
          onMessage={handleMessageAssociate}
        />
      </main>

      {/* Modals */}
      <MassMessageModal
        isOpen={showMassMessageModal}
        messageText={messageText}
        onMessageTextChange={setMessageText}
        onSend={handleSendMessage}
        sendLoading={sendLoading}
        sendSuccess={sendSuccess}
        onCancel={handleCancelMessage}
      />

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

      <AddExistingModal
        isOpen={showAddExistingModal}
        availableAssociates={availableAssociates}
        selectedAssociateIds={selectedAssociateIds}
        onSelectAssociate={handleSelectAssociate}
        onAddSelected={handleAddSelectedAssociates}
        onCancel={handleCancelAddExisting}
      />

      <Footer />

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        duration={7000}
      />
    </div>
  );
}
