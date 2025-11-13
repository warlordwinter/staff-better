import { AssociateGroup } from "@/model/interfaces/AssociateGroup";
import { AssociateFormData } from "@/components/shared/AssociateForm";
import { useAssociates } from "./useAssociates";
import { useAssociateMessaging } from "./useAssociateMessaging";
import { useAssociateForm } from "./useAssociateForm";
import { useAssociateCSVUpload } from "./useAssociateCSVUpload";
import { useToast } from "./useToast";

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
  // Toast hook
  const toast = useToast();

  // Associates data management
  const associates = useAssociates(isAuthenticated, authLoading, (message) => {
    toast.showToastMessage(message, "error");
  });

  // Messaging functionality
  const messaging = useAssociateMessaging((message, type) => {
    toast.showToastMessage(message, type);
  });

  // Form management
  const form = useAssociateForm((message) => {
    toast.showToastMessage(message, "error");
  });

  // CSV upload
  const csvUpload = useAssociateCSVUpload();

  // Wrapper for sendMessage that uses associates list
  const sendMessage = async () => {
    await messaging.sendMessage(associates.associates, () => {
      // This callback is already handled in useAssociateMessaging
    });
  };

  // Wrapper for submitNewAssociate that uses createAssociate
  const submitNewAssociate = async () => {
    await form.submitNewAssociate(associates.createAssociate);
  };

  // Wrapper for uploadCSVFile that uses loadAssociates and toast
  const uploadCSVFile = async (file: File) => {
    await csvUpload.uploadCSVFile(
      file,
      associates.loadAssociates,
      () => {
        // Error handling is done in the hook via toast
      },
      toast.showToastMessage
    );
  };

  return {
    // State from associates
    associates: associates.associates,
    loading: associates.loading,

    // State from messaging
    messageText: messaging.messageText,
    selectedAssociate: messaging.selectedAssociate,
    showMassMessageModal: messaging.showMassMessageModal,
    showIndividualMessageModal: messaging.showIndividualMessageModal,
    sendLoading: messaging.sendLoading,
    sendSuccess: messaging.sendSuccess,
    sendError: messaging.sendError,

    // State from form
    showAddNewModal: form.showAddNewModal,
    newAssociateForm: form.newAssociateForm,
    formErrors: form.formErrors,
    phoneError: form.phoneError,
    isSubmitting: form.isSubmitting,

    // State from CSV upload
    isUploading: csvUpload.isUploading,

    // State from toast
    toastMessage: toast.toastMessage,
    toastType: toast.toastType,
    showToast: toast.showToast,

    // Actions from associates
    loadAssociates: associates.loadAssociates,
    saveAssociate: associates.saveAssociate,
    deleteAssociate: associates.deleteAssociate,

    // Actions from messaging
    setMessageText: messaging.setMessageText,
    setShowMassMessageModal: messaging.setShowMassMessageModal,
    setShowIndividualMessageModal: messaging.setShowIndividualMessageModal,
    setSelectedAssociate: messaging.setSelectedAssociate,
    sendMessage,
    cancelMessage: messaging.cancelMessage,
    messageAssociate: messaging.messageAssociate,
    messageAll: messaging.messageAll,

    // Actions from form
    setShowAddNewModal: form.setShowAddNewModal,
    handleFormInputChange: form.handleFormInputChange,
    addNew: form.addNew,
    cancelAddNew: form.cancelAddNew,
    submitNewAssociate,

    // Actions from toast
    setShowToast: toast.setShowToast,

    // Actions from CSV upload
    uploadCSVFile,
  };
}
