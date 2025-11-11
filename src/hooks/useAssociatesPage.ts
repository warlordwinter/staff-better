import { useState, useEffect } from "react";
import { AssociateGroup } from "@/model/interfaces/AssociateGroup";
import { AssociateFormData } from "@/components/shared/AssociateForm";
import { GroupsDataService } from "@/lib/services/groupsDataService";
import { isValidPhoneNumber } from "@/utils/phoneUtils";
import { extractDataWithHeaders } from "@/utils/excelParser";

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
  isUploading: boolean;

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
  uploadCSVFile: (file: File) => Promise<void>;
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
  const [isUploading, setIsUploading] = useState(false);

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
      setToastMessage("Failed to update associate. Please try again.");
      setToastType("error");
      setShowToast(true);
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
      setToastMessage(errorMessage);
      setToastType("error");
      setShowToast(true);
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
      setToastMessage("Failed to create associate. Please try again.");
      setToastType("error");
      setShowToast(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel add new associate
  const cancelAddNew = () => {
    setIsSubmitting(false);
    setShowAddNewModal(false);
  };

  // Handle CSV file upload
  const uploadCSVFile = async (file: File) => {
    console.log("🚀 uploadCSVFile STARTED with file:", file.name);
    setIsUploading(true);
    setShowToast(false);

    try {
      console.log("📄 Starting to parse file...");
      // Parse CSV file
      const { headers, rows } = await extractDataWithHeaders(file);
      console.log("✅ File parsed. Headers:", headers, "Rows:", rows.length);

      if (!headers.length || !rows.length) {
        throw new Error("No data found in the file");
      }

      // Use AI column mapping
      console.log("📤 Calling /api/column-mapping with headers:", headers);

      let mappingRes;
      try {
        const fetchUrl = "/api/column-mapping";
        console.log("🌐 Fetch URL:", fetchUrl);

        mappingRes = await fetch(fetchUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ headers }),
        });
        console.log("📥 Column mapping response status:", mappingRes.status);
      } catch (fetchError) {
        console.error("❌ Fetch error calling column-mapping:", fetchError);
        throw new Error(`Failed to call column mapping API: ${fetchError}`);
      }

      if (!mappingRes.ok) {
        const errorText = await mappingRes.text();
        console.error("❌ Column mapping failed:", errorText);
        throw new Error(`Failed to map columns: ${errorText}`);
      }

      const aiMapping = await mappingRes.json();
      console.log("✅ Column mapping result:", aiMapping);

      // Filter to only associate fields and convert to our format
      const columnMap: Record<string, string> = {};
      const associateFields = [
        "name",
        "first_name",
        "last_name",
        "phone_number",
        "email_address",
      ];

      associateFields.forEach((field) => {
        if (aiMapping[field] && aiMapping[field] !== "unknown") {
          columnMap[field] = aiMapping[field];
        }
      });

      // Check if required fields are present - either "name" or both "first_name" and "last_name"
      const hasNameColumn = columnMap["name"];
      const hasSeparateNames =
        columnMap["first_name"] && columnMap["last_name"];

      if (!hasNameColumn && !hasSeparateNames) {
        throw new Error(
          "File must contain either a 'Name' column or both 'First Name' and 'Last Name' columns"
        );
      }

      // Helper function to split name into first and last
      const splitName = (fullName: string): { first: string; last: string } => {
        const trimmed = fullName.trim();
        if (!trimmed) return { first: "", last: "" };

        // Remove extra whitespace and split on spaces
        const parts = trimmed.split(/\s+/).filter((part) => part.length > 0);

        if (parts.length === 0) {
          return { first: "", last: "" };
        }

        if (parts.length === 1) {
          // Single word: use as first name only
          return { first: parts[0], last: "" };
        }

        if (parts.length === 2) {
          // Two words: first = first name, second = last name
          return { first: parts[0], last: parts[1] };
        }

        // Three or more words: first word = first name, rest = last name
        // This handles cases like "Mary Jane Watson" -> first: "Mary", last: "Jane Watson"
        const first = parts[0];
        const last = parts.slice(1).join(" ");
        return { first, last };
      };

      // Transform rows to associate format
      const phoneValidationWarnings: string[] = [];
      const associates = rows
        .filter((row) => {
          // Filter out empty rows
          if (hasNameColumn) {
            const name = row[columnMap["name"]]?.trim();
            return name && name.length > 0;
          } else {
            const firstName = row[columnMap["first_name"]]?.trim();
            const lastName = row[columnMap["last_name"]]?.trim();
            return firstName && lastName;
          }
        })
        .map((row, index) => {
          let firstName = "";
          let lastName = "";

          if (hasNameColumn) {
            const fullName = row[columnMap["name"]]?.trim() || "";
            const split = splitName(fullName);
            firstName = split.first;
            lastName = split.last;
          } else {
            firstName = row[columnMap["first_name"]]?.trim() || "";
            lastName = row[columnMap["last_name"]]?.trim() || "";
          }

          const rawPhoneNumber = row[columnMap["phone_number"]]?.trim() || null;
          let validatedPhoneNumber: string | null = null;

          // Validate phone number before sending to API
          if (rawPhoneNumber) {
            const digitsOnly = rawPhoneNumber.replace(/\D/g, "");

            // Check if phone number has at least 10 digits
            if (digitsOnly.length >= 10) {
              // Validate format using isValidPhoneNumber
              if (isValidPhoneNumber(rawPhoneNumber)) {
                validatedPhoneNumber = rawPhoneNumber;
              } else {
                // Invalid format - set to null and warn
                phoneValidationWarnings.push(
                  `Row ${
                    index + 1
                  } (${firstName} ${lastName}): Invalid phone number format "${rawPhoneNumber}" - will be stored without phone number`
                );
              }
            } else {
              // Too few digits - set to null and warn
              phoneValidationWarnings.push(
                `Row ${
                  index + 1
                } (${firstName} ${lastName}): Phone number has only ${
                  digitsOnly.length
                } digit(s), needs at least 10 - will be stored without phone number`
              );
            }
          }

          const associate: Record<string, string | null> = {
            first_name: firstName,
            last_name: lastName,
            phone_number: validatedPhoneNumber,
            email_address: row[columnMap["email_address"]]?.trim() || null,
          };

          return associate;
        });

      if (associates.length === 0) {
        throw new Error("No valid associate data found in file");
      }

      // Log all associates before sending
      console.log(
        "📦 All associates before API call:",
        JSON.stringify(associates, null, 2)
      );

      // Post to API
      const response = await fetch("/api/associates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(associates),
      });

      if (!response.ok) {
        let errorMessage = "Failed to upload associates from CSV";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error("API Error Response:", errorData);
        } catch (parseError) {
          // If JSON parsing fails, try to get text
          const errorText = await response.text().catch(() => "");
          console.error("API Error (non-JSON):", errorText);
          errorMessage = errorText || errorMessage;
        }
        console.error("Response status:", response.status);
        console.error(
          "Associates being sent:",
          JSON.stringify(associates, null, 2)
        );
        throw new Error(errorMessage);
      }

      // Refresh associates list
      await loadAssociates();

      // Show success toast with warnings if any
      let successMessage = `Successfully uploaded ${associates.length} associate(s) from file`;
      if (phoneValidationWarnings.length > 0) {
        successMessage += `\n\nWarning: ${
          phoneValidationWarnings.length
        } phone number(s) were invalid and will not be used for messaging:\n${phoneValidationWarnings
          .slice(0, 5)
          .join("\n")}`;
        if (phoneValidationWarnings.length > 5) {
          successMessage += `\n... and ${
            phoneValidationWarnings.length - 5
          } more`;
        }
      }
      setToastMessage(successMessage);
      setToastType(phoneValidationWarnings.length > 0 ? "info" : "success");
      setShowToast(true);
    } catch (error) {
      console.error("Error uploading file:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to upload file. Please try again.";
      setToastMessage(errorMessage);
      setToastType("error");
      setShowToast(true);
    } finally {
      setIsUploading(false);
    }
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
    isUploading,
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
    uploadCSVFile,
  };
}
