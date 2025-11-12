import { useState } from "react";
import { AssociateGroup } from "@/model/interfaces/AssociateGroup";
import { GroupsDataService } from "@/lib/services/groupsDataService";

export interface UseAssociateMessagingReturn {
  messageText: string;
  selectedAssociate: AssociateGroup | null;
  showMassMessageModal: boolean;
  showIndividualMessageModal: boolean;
  sendLoading: boolean;
  sendSuccess: boolean;
  sendError: string | null;
  setMessageText: (text: string) => void;
  setShowMassMessageModal: (show: boolean) => void;
  setShowIndividualMessageModal: (show: boolean) => void;
  setSelectedAssociate: (associate: AssociateGroup | null) => void;
  sendMessage: (associates: AssociateGroup[], onUnsubscribed?: (names: string[]) => void) => Promise<void>;
  cancelMessage: () => void;
  messageAssociate: (associate: AssociateGroup) => void;
  messageAll: () => void;
}

export function useAssociateMessaging(
  onToast?: (message: string, type: "error" | "success" | "info") => void
): UseAssociateMessagingReturn {
  const [messageText, setMessageText] = useState("");
  const [selectedAssociate, setSelectedAssociate] =
    useState<AssociateGroup | null>(null);
  const [showMassMessageModal, setShowMassMessageModal] = useState(false);
  const [showIndividualMessageModal, setShowIndividualMessageModal] =
    useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Handle message individual associate
  const messageAssociate = (associate: AssociateGroup) => {
    setSelectedAssociate(associate);
    setMessageText("");
    setShowIndividualMessageModal(true);
  };

  // Handle message all associates
  const messageAll = () => {
    setMessageText("");
    setShowMassMessageModal(true);
  };

  // Handle send message
  const sendMessage = async (
    associates: AssociateGroup[],
    onUnsubscribed?: (names: string[]) => void
  ) => {
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
        const unsubscribedAssociates: Array<{
          firstName: string;
          lastName: string;
        }> = [];

        const promises = associates.map((associate) =>
          GroupsDataService.sendMessageToAssociate(
            associate.id,
            messageText.trim()
          ).catch((error) => {
            console.error(
              `Failed to send message to ${associate.firstName} ${associate.lastName}:`,
              error
            );

            // Check if error is due to unsubscription
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            const errorCode = (error as any)?.code;
            const isUnsubscribedFlag = (error as any)?.isUnsubscribed;

            // Check multiple ways the error might indicate unsubscription
            const isUnsubscribed =
              isUnsubscribedFlag === true ||
              errorCode === "21610" ||
              errorCode === 21610 ||
              errorMessage.toLowerCase().includes("unsubscribed") ||
              errorMessage.toLowerCase().includes("opted out") ||
              errorMessage
                .toLowerCase()
                .includes("cannot message this employee");

            console.log(
              `Checking unsubscription for ${associate.firstName} ${associate.lastName}:`,
              {
                isUnsubscribed,
                errorMessage,
                errorCode,
                isUnsubscribedFlag,
                errorObject: error,
              }
            );

            if (isUnsubscribed) {
              console.log(
                `Adding ${associate.firstName} ${associate.lastName} to unsubscribed list`
              );
              unsubscribedAssociates.push({
                firstName: associate.firstName,
                lastName: associate.lastName,
              });
            }

            return false;
          })
        );
        await Promise.all(promises);

        // Show toast if there are unsubscribed associates
        console.log("Unsubscribed associates:", unsubscribedAssociates);
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

          console.log("Setting toast message:", message);
          if (onUnsubscribed) {
            onUnsubscribed(names);
          }
          if (onToast) {
            onToast(message, "info");
          }
        }
      }

      setSendSuccess(true);
      setTimeout(() => {
        setShowIndividualMessageModal(false);
        setShowMassMessageModal(false);
        setSelectedAssociate(null);
        setMessageText("");
        setSendSuccess(false);
        setSendError(null);
        // Don't close toast here - let it auto-close after its duration
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
  const cancelMessage = () => {
    setShowIndividualMessageModal(false);
    setShowMassMessageModal(false);
    setSelectedAssociate(null);
    setMessageText("");
    setSendSuccess(false);
    setSendError(null);
  };

  return {
    messageText,
    selectedAssociate,
    showMassMessageModal,
    showIndividualMessageModal,
    sendLoading,
    sendSuccess,
    sendError,
    setMessageText,
    setShowMassMessageModal,
    setShowIndividualMessageModal,
    setSelectedAssociate,
    sendMessage,
    cancelMessage,
    messageAssociate,
    messageAll,
  };
}

