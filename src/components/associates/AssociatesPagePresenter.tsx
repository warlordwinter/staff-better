"use client";

import React from "react";
import { useAuthCheck } from "@/hooks/useAuthCheck";
import { useAssociatesPage } from "@/hooks/useAssociatesPage";
import AssociatesPageView from "./AssociatesPageView";

export default function AssociatesPagePresenter() {
  const { loading: authLoading, isAuthenticated } = useAuthCheck();
  const model = useAssociatesPage(isAuthenticated, authLoading);

  const handleUploadCSV = async (file: File) => {
    console.log("🎯 Presenter: handleUploadCSV called with file:", file.name);
    await model.uploadCSVFile(file);
  };

  return (
    <AssociatesPageView
      // Auth state
      authLoading={authLoading}
      isAuthenticated={isAuthenticated}
      // Model state
      associates={model.associates}
      loading={model.loading}
      messageText={model.messageText}
      selectedAssociate={model.selectedAssociate}
      showMassMessageModal={model.showMassMessageModal}
      showIndividualMessageModal={model.showIndividualMessageModal}
      showAddNewModal={model.showAddNewModal}
      newAssociateForm={model.newAssociateForm}
      formErrors={model.formErrors}
      phoneError={model.phoneError}
      toastMessage={model.toastMessage}
      toastType={model.toastType}
      showToast={model.showToast}
      sendLoading={model.sendLoading}
      sendSuccess={model.sendSuccess}
      sendError={model.sendError}
      isSubmitting={model.isSubmitting}
      isUploading={model.isUploading}
      // Actions
      onMessageTextChange={model.setMessageText}
      onSendMessage={model.sendMessage}
      onCancelMessage={model.cancelMessage}
      onAddNew={model.addNew}
      onCancelAddNew={model.cancelAddNew}
      onFormInputChange={model.handleFormInputChange}
      onSubmitNewAssociate={model.submitNewAssociate}
      onSaveAssociate={model.saveAssociate}
      onDeleteAssociate={model.deleteAssociate}
      onMessageAssociate={model.messageAssociate}
      onMessageAll={model.messageAll}
      onUploadCSV={handleUploadCSV}
      onCloseToast={() => {
        console.log("Closing toast");
        model.setShowToast(false);
      }}
    />
  );
}
