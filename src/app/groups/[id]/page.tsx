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
import ComposeMessageModal from "@/components/messages/ComposeMessageModal";
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
  const [messageType, setMessageType] = useState<"sms" | "whatsapp">("sms");
  const [availableAssociates, setAvailableAssociates] = useState<
    AssociateGroup[]
  >([]);
  const [selectedAssociateIds, setSelectedAssociateIds] = useState<string[]>(
    []
  );
  const [loadingAssociates, setLoadingAssociates] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
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
    setMessageType("sms"); // Reset to SMS by default
    setShowMassMessageModal(true);
  };

  const handleSendMessage = async (templateData?: {
    contentSid: string;
    contentVariables?: Record<string, string>;
  }) => {
    console.log("🚀🚀🚀 GROUP PAGE handleSendMessage CALLED 🚀🚀🚀", {
      messageType,
      templateData,
      messageText,
      selectedAssociate: selectedAssociate?.id,
      groupId,
      templateDataKeys: templateData ? Object.keys(templateData) : null,
      functionName: "handleSendMessage (GROUP PAGE)",
    });

    // For WhatsApp with template, we don't need messageText
    // Only validate messageText if we're not using a WhatsApp template
    const isWhatsAppTemplate = messageType === "whatsapp" && templateData;
    if (!isWhatsAppTemplate && !messageText.trim()) {
      console.log("Early return: no message text and not WhatsApp template");
      return;
    }

    console.log("Setting loading state and sending message...");
    setSendLoading(true);
    setSendSuccess(false);
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
        // For WhatsApp templates, messageText may be empty, which is fine
        const result = await GroupsDataService.sendMassMessageToGroup(
          groupId,
          messageText || "", // Use empty string if messageText is empty (for templates)
          messageType,
          templateData
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
      }, 1000);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to send message. Please try again.";
      setToastMessage(errorMessage);
      setToastType("error");
      setShowToast(true);
    } finally {
      setSendLoading(false);
    }
  };

  const handleCancelMessage = () => {
    setMessageText("");
    setMessageType("sms");
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
      {/* Mass Message Modal - Replaced with ComposeMessageModal */}
      <ComposeMessageModal
        isOpen={showMassMessageModal}
        onSend={async (data) => {
          // Update message text and type state for consistency
          if (data.message) {
            setMessageText(data.message);
          }
          setMessageType(data.messageType);

          // For groups page, we want to send to all group members
          // So we'll send to the selected associates from the modal
          // If they selected all group members, it will work as expected
          // Otherwise, they can select specific ones

          // Send messages directly to selected associates
          try {
            const results = await Promise.allSettled(
              data.associateIds.map((associateId) =>
                fetch("/api/send-message", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    type: "associate",
                    id: associateId,
                    channel: data.messageType,
                    message: data.message || "",
                    contentSid: data.templateData?.contentSid,
                    contentVariables: data.templateData?.contentVariables,
                  }),
                }).then((res) => {
                  if (!res.ok) {
                    return res.json().then((err) => {
                      throw new Error(err.error || "Failed to send message");
                    });
                  }
                  return res.json();
                })
              )
            );

            // Check for unsubscribed members
            const unsubscribedAssociates: Array<{
              firstName: string;
              lastName: string;
            }> = [];

            results.forEach((result, index) => {
              if (result.status === "rejected") {
                const associate = associates.find(
                  (a) => a.id === data.associateIds[index]
                );
                if (associate) {
                  const errorMessage =
                    result.reason?.message || String(result.reason);
                  if (
                    errorMessage.toLowerCase().includes("unsubscribed") ||
                    errorMessage.toLowerCase().includes("opted out")
                  ) {
                    unsubscribedAssociates.push({
                      firstName: associate.firstName,
                      lastName: associate.lastName,
                    });
                  }
                }
              }
            });

            // Show toast if there are unsubscribed members
            if (unsubscribedAssociates.length > 0) {
              const names = unsubscribedAssociates.map(
                (a) => `${a.firstName} ${a.lastName}`
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

            // Call handleSendMessage to trigger success state and modal closing
            // This will also handle the state updates
            if (data.templateData) {
              await handleSendMessage(data.templateData);
            } else {
              await handleSendMessage();
            }
          } catch (error) {
            console.error("Error sending messages:", error);
            throw error;
          }
        }}
        sendLoading={sendLoading}
        sendSuccess={sendSuccess}
        onCancel={handleCancelMessage}
      />

      <ComposeMessageModal
        isOpen={showIndividualMessageModal}
        onSend={async (data) => {
          // Update message text and type state
          setMessageText(data.message || "");
          setMessageType(data.messageType);
          // Call handleSendMessage with template data if WhatsApp template
          await handleSendMessage(data.templateData);
        }}
        sendLoading={sendLoading}
        sendSuccess={sendSuccess}
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
