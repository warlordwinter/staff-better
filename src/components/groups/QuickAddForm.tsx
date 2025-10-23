"use client";

import React from "react";
import { AssociateGroup } from "@/model/interfaces/AssociateGroup";
import AssociateForm, {
  AssociateFormData,
} from "@/components/shared/AssociateForm";
import { formDataToAssociateGroup } from "@/utils/associateUtils";

interface QuickAddFormProps {
  groupId: string;
  onAddAssociate: (associate: AssociateGroup) => void;
}

export default function QuickAddForm({
  groupId,
  onAddAssociate,
}: QuickAddFormProps) {
  const handleSubmit = (formData: AssociateFormData) => {
    const newAssociate = formDataToAssociateGroup(formData, groupId);
    onAddAssociate(newAssociate);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Quick Add New Associate
      </h3>
      <AssociateForm
        onSubmit={handleSubmit}
        submitButtonText="Add Now"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3"
      />
    </div>
  );
}
