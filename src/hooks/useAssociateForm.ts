import { useState } from "react";
import { AssociateFormData } from "@/components/shared/AssociateForm";
import { isValidPhoneNumber } from "@/utils/phoneUtils";
import { AssociateGroup } from "@/model/interfaces/AssociateGroup";

export interface UseAssociateFormReturn {
  newAssociateForm: AssociateFormData;
  formErrors: Partial<AssociateFormData>;
  phoneError: string;
  isSubmitting: boolean;
  showAddNewModal: boolean;
  setShowAddNewModal: (show: boolean) => void;
  handleFormInputChange: (
    field: keyof AssociateFormData,
    value: string
  ) => void;
  validateNewAssociateForm: () => boolean;
  submitNewAssociate: (
    onCreateAssociate: (data: {
      first_name: string;
      last_name: string;
      phone_number: string | null;
      email_address: string | null;
    }) => Promise<AssociateGroup>
  ) => Promise<void>;
  addNew: () => void;
  cancelAddNew: () => void;
}

export function useAssociateForm(
  onError?: (message: string) => void
): UseAssociateFormReturn {
  const [showAddNewModal, setShowAddNewModal] = useState(false);
  const [newAssociateForm, setNewAssociateForm] = useState<AssociateFormData>({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    emailAddress: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<AssociateFormData>>({});
  const [phoneError, setPhoneError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const submitNewAssociate = async (
    onCreateAssociate: (data: {
      first_name: string;
      last_name: string;
      phone_number: string | null;
      email_address: string | null;
    }) => Promise<AssociateGroup>
  ) => {
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
      await onCreateAssociate({
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        phone_number: formData.phoneNumber.trim() || null,
        email_address: formData.emailAddress.trim() || null,
      });

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
      if (onError) {
        onError("Failed to create associate. Please try again.");
      }
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
    newAssociateForm,
    formErrors,
    phoneError,
    isSubmitting,
    showAddNewModal,
    setShowAddNewModal,
    handleFormInputChange,
    validateNewAssociateForm,
    submitNewAssociate,
    addNew,
    cancelAddNew,
  };
}

