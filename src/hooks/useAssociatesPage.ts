import { useState, useEffect } from "react";
import { AssociateGroup } from "@/model/interfaces/AssociateGroup";
import { AssociateFormData } from "@/components/shared/AssociateForm";
import { GroupsDataService } from "@/lib/services/groupsDataService";
import { isValidPhoneNumber } from "@/utils/phoneUtils";

export interface UseAssociatesPageReturn {
  // State
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
  setMessageText: (text: string) => void;
  setShowMassMessageModal: (show: boolean) => void;
  setShowIndividualMessageModal: (show: boolean) => void;
  setShowAddNewModal: (show: boolean) => void;
  setSelectedAssociate: (associate: AssociateGroup | null) => void;
  setShowToast: (show: boolean) => void;
  handleFormInputChange: (
    field: keyof AssociateFormData,
    value: string
  ) => void;
  loadAssociates: () => Promise<void>;
  saveAssociate: (updatedAssociate: AssociateGroup) => Promise<void>;
  deleteAssociate: (associateId: string) => Promise<void>;
  sendMessage: () => Promise<void>;
  cancelMessage: () => void;
  addNew: () => void;
  cancelAddNew: () => void;
  submitNewAssociate: () => Promise<void>;
  messageAssociate: (associate: AssociateGroup) => void;
  messageAll: () => void;
}

export function useAssociatesPage(
  isAuthenticated: boolean,
  authLoading: boolean
): UseAssociatesPageReturn {
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
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"error" | "success" | "info">(
    "info"
  );
  const [showToast, setShowToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load all associates
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

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadAssociates();
    }
  }, [authLoading, isAuthenticated]);

  // Handle save associate
  const saveAssociate = async (updatedAssociate: AssociateGroup) => {
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
  const deleteAssociate = async (associateId: string) => {
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
  const sendMessage = async () => {
    if (!messageText.trim()) {
      return;
    }

    setSendLoading(true);
    setSendSuccess(false);
    setSendError(null);
    setShowToast(false);

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
          setToastMessage(message);
          setToastType("info");
          setShowToast(true);
          console.log("Toast should be visible now");
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

  // Handle add new associate
  const addNew = () => {
    setNewAssociateForm({
      firstName: "",
      lastName: "",
      phoneNumber: "",
      emailAddress: "",
    });
    setFormErrors({});
    setPhoneError("");
    setIsSubmitting(false);
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
  const submitNewAssociate = async () => {
    // Prevent double submission
    if (isSubmitting) {
      return;
    }

    if (!validateNewAssociateForm()) {
      return;
    }

    setIsSubmitting(true);
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
      // Reset form
      setNewAssociateForm({
        firstName: "",
        lastName: "",
        phoneNumber: "",
        emailAddress: "",
      });
    } catch (error) {
      console.error("Error creating associate:", error);
      alert("Failed to create associate. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel add new associate
  const cancelAddNew = () => {
    setIsSubmitting(false);
    setShowAddNewModal(false);
  };

  return {
    // State
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
    // Actions
    setMessageText,
    setShowMassMessageModal,
    setShowIndividualMessageModal,
    setShowAddNewModal,
    setSelectedAssociate,
    setShowToast,
    handleFormInputChange,
    loadAssociates,
    saveAssociate,
    deleteAssociate,
    sendMessage,
    cancelMessage,
    addNew,
    cancelAddNew,
    submitNewAssociate,
    messageAssociate,
    messageAll,
  };
}
