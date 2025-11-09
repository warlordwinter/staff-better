"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
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
import ImportOptions from "@/components/jobTableComp/importOptions";
import { extractDataWithHeaders } from "@/utils/excelParser";

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
  const [showAddNewModal, setShowAddNewModal] = useState(false);
  const [newAssociateForm, setNewAssociateForm] = useState<AssociateFormData>({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    emailAddress: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<AssociateFormData>>({});
  const [phoneError, setPhoneError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showImportOptions, setShowImportOptions] = useState(false);
  type UploadStep =
    | "idle"
    | "parsing"
    | "validating"
    | "uploading"
    | "complete"
    | "error";
  const [uploadStatus, setUploadStatus] = useState<{
    step: UploadStep;
    message: string;
  }>({ step: "idle", message: "" });
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const loadAssociates = useCallback(async () => {
    try {
      const associatesData = await GroupsDataService.fetchAllAssociates();
      setAssociates(associatesData);
    } catch (error) {
      console.error("Error loading associates:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load all associates
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadAssociates();
    }
  }, [authLoading, isAuthenticated, loadAssociates]);

  const clearStatusTimeout = useCallback(() => {
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = null;
    }
  }, []);

  const resetUploadStatus = useCallback(() => {
    clearStatusTimeout();
    setUploadStatus({ step: "idle", message: "" });
  }, [clearStatusTimeout]);

  useEffect(() => {
    return () => {
      clearStatusTimeout();
    };
  }, [clearStatusTimeout]);

  const showUploadMessage = useCallback(
    (step: UploadStep, message: string) => {
      clearStatusTimeout();
      setUploadStatus({ step, message });

      if (step === "complete" || step === "error") {
        statusTimeoutRef.current = setTimeout(() => {
          resetUploadStatus();
        }, 4000);
      }
    },
    [clearStatusTimeout, resetUploadStatus]
  );

  const handleUploadClick = useCallback(() => {
    resetUploadStatus();
    fileInputRef.current?.click();
    setShowImportOptions(false);
  }, [resetUploadStatus]);

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
    setNewAssociateForm({
      firstName: "",
      lastName: "",
      phoneNumber: "",
      emailAddress: "",
    });
    setFormErrors({});
    setPhoneError("");
    setShowAddNewModal(true);
    setShowImportOptions(false);
  };


  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowImportOptions(false);
      }
    };

    if (showImportOptions) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showImportOptions]);

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

  const normalizeHeaderKey = (header: string) =>
    header.toLowerCase().replace(/[\s_-]/g, "");

  const buildHeaderMapping = (headers: string[]) => {
    const canonicalMap: Record<
      "first_name" | "last_name" | "phone_number" | "email_address" | "name",
      string[]
    > = {
      first_name: ["firstname", "first"],
      last_name: ["lastname", "last", "surname"],
      phone_number: ["phonenumber", "phone", "mobile", "contactnumber", "contact", "tel"],
      email_address: ["emailaddress", "email", "e-mail"],
      name: ["name", "fullname", "fullname"],
    };

    const mapping: Partial<
      Record<"first_name" | "last_name" | "phone_number" | "email_address" | "name", string>
    > = {};

    headers.forEach((header) => {
      const normalized = normalizeHeaderKey(header);
      (Object.keys(canonicalMap) as Array<
        "first_name" | "last_name" | "phone_number" | "email_address" | "name"
      >).forEach((key) => {
        if (canonicalMap[key].includes(normalized)) {
          if (!mapping[key]) {
            mapping[key] = header;
          }
        }
      });
    });

    return mapping;
  };

  const validateRows = (
    rows: Array<{
      firstName: string;
      lastName: string;
      phoneNumber: string;
      emailAddress: string | null;
      sourceRow: number;
    }>
  ) => {
    const emailRegex = /\S+@\S+\.\S+/;

    for (const row of rows) {
      // At least first name OR last name is required
      if ((!row.firstName || !row.firstName.trim()) && (!row.lastName || !row.lastName.trim())) {
        return `Row ${row.sourceRow}: Name is required (first name or last name).`;
      }
      // Phone number is optional - if provided, do basic validation
      if (row.phoneNumber && row.phoneNumber.trim()) {
        // Check if it has at least some digits (7+ digits for local numbers, 10+ for full numbers)
        const digitsOnly = row.phoneNumber.replace(/\D/g, "");
        if (digitsOnly.length < 7) {
          return `Row ${row.sourceRow}: Phone number appears to be too short.`;
        }
        // If it has 10+ digits, validate format more strictly
        if (digitsOnly.length >= 10 && !isValidPhoneNumber(row.phoneNumber)) {
          return `Row ${row.sourceRow}: Invalid phone number format.`;
        }
      }
      // Email is optional, but if provided, validate it
      if (row.emailAddress && row.emailAddress.trim() && !emailRegex.test(row.emailAddress)) {
        return `Row ${row.sourceRow}: Invalid email address.`;
      }
    }

    return "";
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setIsUploading(true);
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const fileType = fileExtension === 'csv' ? 'CSV' : 'Excel';
    showUploadMessage("parsing", `Parsing ${fileType} file...`);

    try {
      const { headers, rows } = await extractDataWithHeaders(file);

      if (!headers.length || !rows.length) {
        throw new Error("No data found in the file.");
      }

      const headerMapping = buildHeaderMapping(headers);
      
      // Check if we have a "name" column but no separate first/last name columns
      const hasNameColumn = !!headerMapping.name;
      const hasFirstNameColumn = !!headerMapping.first_name;
      const hasLastNameColumn = !!headerMapping.last_name;
      const hasPhoneColumn = !!headerMapping.phone_number;

      // Validate required fields
      if (!hasPhoneColumn) {
        throw new Error("Missing required column: phone number");
      }

      // We need either (first_name AND last_name) OR name column
      if (!hasNameColumn && (!hasFirstNameColumn || !hasLastNameColumn)) {
        throw new Error(
          "Missing required columns: Please provide either 'Name' column or both 'First Name' and 'Last Name' columns"
        );
      }

      showUploadMessage("validating", "Validating data...");

      const mapping = headerMapping as Partial<Record<
        "first_name" | "last_name" | "phone_number" | "email_address" | "name",
        string
      >>;

      // Helper function to extract phone number from any string
      const extractPhoneNumber = (value: string | undefined): string => {
        if (!value) return "";
        const str = typeof value === "string" ? value.trim() : String(value).trim();
        if (!str) return "";
        
        // Remove common extension markers (EXT, ext, x, X, extension, etc.)
        const cleaned = str.replace(/\s*(EXT|ext|x|X|extension|Extension)[\s\-:]*\d*/gi, "").trim();
        
        // Check if it looks like a phone number (has digits)
        const digitsOnly = cleaned.replace(/\D/g, "");
        // Accept if it has at least 7 digits (some formats might be shorter)
        // But prefer 10+ digits for standard US numbers
        if (digitsOnly.length >= 7) {
          return cleaned; // Return cleaned format (without extension)
        }
        return "";
      };

      // Helper function to extract email from any string
      const extractEmail = (value: string | undefined): string | null => {
        if (!value) return null;
        const str = typeof value === "string" ? value.trim() : String(value).trim();
        if (!str) return null;
        // Check if it looks like an email
        const emailRegex = /\S+@\S+\.\S+/;
        if (emailRegex.test(str)) {
          return str;
        }
        return null;
      };

      // Helper function to parse name (handles "Last, First" format)
      const parseName = (fullName: string): { firstName: string; lastName: string } => {
        const trimmed = fullName.trim();
        if (!trimmed) return { firstName: "", lastName: "" };

        // Handle "Last, First" format (e.g., "Chen, Lisa")
        if (trimmed.includes(",")) {
          const parts = trimmed.split(",").map((p) => p.trim()).filter((p) => p.length > 0);
          if (parts.length >= 2) {
            return { firstName: parts[1], lastName: parts[0] };
          }
          // If comma but only one part, treat as last name
          if (parts.length === 1) {
            return { firstName: "", lastName: parts[0] };
          }
        }

        // Handle normal "First Last" format
        const nameParts = trimmed.split(/\s+/).filter((part) => part.length > 0);
        if (nameParts.length === 0) {
          return { firstName: "", lastName: "" };
        }
        if (nameParts.length === 1) {
          return { firstName: nameParts[0], lastName: "" };
        }
        // First word is first name, rest is last name
        return {
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(" "),
        };
      };

      const processedRows = rows
        .map((row, index) => {
          const sourceRow = index + 2;
          let firstName = "";
          let lastName = "";
          let phoneNumber = "";
          let emailAddress: string | null = null;

          // Handle name splitting if we have a "name" column
          if (hasNameColumn && mapping.name) {
            const rawName = row[mapping.name];
            const fullName =
              typeof rawName === "string"
                ? rawName.trim()
                : rawName
                ? String(rawName).trim()
                : "";

            if (fullName) {
              const parsed = parseName(fullName);
              firstName = parsed.firstName;
              lastName = parsed.lastName;
            }
          } else {
            // Use separate first_name and last_name columns
            const rawFirstName = mapping.first_name ? row[mapping.first_name] : undefined;
            const rawLastName = mapping.last_name ? row[mapping.last_name] : undefined;

            firstName =
              typeof rawFirstName === "string"
                ? rawFirstName.trim()
                : rawFirstName
                ? String(rawFirstName).trim()
                : "";
            lastName =
              typeof rawLastName === "string"
                ? rawLastName.trim()
                : rawLastName
                ? String(rawLastName).trim()
                : "";
          }

          // Extract phone number from phone_number column
          const rawPhoneNumber = mapping.phone_number ? row[mapping.phone_number] : undefined;
          phoneNumber = extractPhoneNumber(rawPhoneNumber);

          // Extract email from email_address column
          const rawEmailAddress = mapping.email_address ? row[mapping.email_address] : undefined;
          emailAddress = extractEmail(rawEmailAddress);

          // If we didn't find phone/email in their expected columns, try searching all columns
          // Search for phone if missing
          if (!phoneNumber) {
            Object.entries(row).forEach(([header, value]) => {
              if (header !== mapping.phone_number) {
                const potentialPhone = extractPhoneNumber(value);
                if (potentialPhone) {
                  phoneNumber = potentialPhone;
                }
              }
            });
          }
          // Search for email if missing
          if (!emailAddress) {
            Object.entries(row).forEach(([header, value]) => {
              if (header !== mapping.email_address) {
                const potentialEmail = extractEmail(value);
                if (potentialEmail) {
                  emailAddress = potentialEmail;
                }
              }
            });
          }

          // Skip rows that don't have at least a name
          // Phone number is optional - user can add it later
          if ((!firstName || !firstName.trim()) && (!lastName || !lastName.trim())) {
            return null; // No name at all - skip this row
          }

          // If no phone number found, set to empty string (will be null in API)
          // User can add it later
          return {
            firstName: firstName || "Unknown",
            lastName: lastName || "",
            phoneNumber: phoneNumber || "",
            emailAddress,
            sourceRow,
          };
        })
        .filter(
          (
            row
          ): row is {
            firstName: string;
            lastName: string;
            phoneNumber: string;
            emailAddress: string | null;
            sourceRow: number;
          } => row !== null
        );

      if (!processedRows.length) {
        throw new Error("No valid rows found in the file.");
      }

      const validationError = validateRows(processedRows);
      if (validationError) {
        throw new Error(validationError);
      }

      showUploadMessage(
        "uploading",
        `Uploading ${processedRows.length} associates...`
      );

      const payload = processedRows.map((row) => ({
        first_name: row.firstName,
        last_name: row.lastName,
        phone_number: row.phoneNumber && row.phoneNumber.trim() ? row.phoneNumber : null,
        email_address: row.emailAddress || null,
      }));

      const response = await fetch("/api/associates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error ||
            "Failed to upload associates. Please try again."
        );
      }

      const insertedAssociates: Array<{
        id: string;
        first_name: string;
        last_name: string;
        phone_number: string;
        email_address: string;
        created_at?: string;
        updated_at?: string;
      }> = await response.json();

      const newAssociates: AssociateGroup[] = insertedAssociates.map(
        (associate) => ({
          id: associate.id,
          firstName: associate.first_name || "",
          lastName: associate.last_name || "",
          phoneNumber: associate.phone_number || "",
          emailAddress: associate.email_address || "",
          groupId: "",
          createdAt: associate.created_at
            ? new Date(associate.created_at)
            : new Date(),
          updatedAt: associate.updated_at
            ? new Date(associate.updated_at)
            : new Date(),
        })
      );

      setAssociates((prev) => {
        const existingIds = new Set(prev.map((associate) => associate.id));
        const uniqueNewAssociates = newAssociates.filter(
          (associate) => !existingIds.has(associate.id)
        );
        return [...uniqueNewAssociates, ...prev];
      });

      showUploadMessage(
        "complete",
        `Successfully uploaded ${processedRows.length} associates.`
      );
    } catch (error) {
      console.error("Error uploading associates:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Upload failed. Please try again.";
      showUploadMessage("error", message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadStatusDismiss = () => {
    resetUploadStatus();
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
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowImportOptions((prev) => !prev)}
                disabled={isUploading}
                className="px-4 py-2 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white rounded-lg font-medium inline-flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-sm font-normal font-['Inter']">
                  {isUploading ? "Processing..." : "Add"}
                </span>
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
              </button>

              {showImportOptions && (
                <div className="absolute right-0 mt-2 z-10">
                  <ImportOptions
                    onUploadCSV={handleUploadClick}
                    onAddManually={handleAddNew}
                  />
                </div>
              )}
            </div>
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

        {uploadStatus.step !== "idle" && (
          <div
            className={`mb-4 max-w-lg rounded-lg border px-4 py-3 text-sm shadow-sm ${
              uploadStatus.step === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : uploadStatus.step === "complete"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-blue-200 bg-blue-50 text-blue-800"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {uploadStatus.step === "error"
                    ? "Upload Failed"
                    : uploadStatus.step === "complete"
                    ? "Upload Complete"
                    : uploadStatus.step === "uploading"
                    ? "Uploading..."
                    : uploadStatus.step === "validating"
                    ? "Validating..."
                    : "Parsing..."}
                </p>
                <p className="mt-1 text-xs text-inherit">
                  {uploadStatus.message}
                </p>
              </div>
              <button
                onClick={handleUploadStatusDismiss}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>
        )}

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
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          disabled={isUploading}
        />
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
