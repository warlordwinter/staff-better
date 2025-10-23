"use client";

import React, { useState } from "react";
import { AssociateGroup } from "@/model/interfaces/AssociateGroup";
import AssociateInlineEditor from "@/components/shared/AssociateInlineEditor";
import AssociateActions from "@/components/shared/AssociateActions";
import {
  associateGroupToFormData,
  formDataToAssociateGroup,
} from "@/utils/associateUtils";

interface GroupAssociateTableRowProps {
  associate: AssociateGroup;
  onSave: (updatedAssociate: AssociateGroup) => void;
  onDelete: () => void;
  onMessage: () => void;
}

export default function GroupAssociateTableRow({
  associate,
  onSave,
  onDelete,
  onMessage,
}: GroupAssociateTableRowProps) {
  const [isEditing, setIsEditing] = useState(associate.isNew || false);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = (formData: any) => {
    const updatedAssociate = formDataToAssociateGroup(
      formData,
      associate.groupId,
      associate.id
    );
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
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {isEditing ? (
          <AssociateInlineEditor
            initialData={associateGroupToFormData(associate)}
            onSave={handleSave}
            onCancel={handleCancel}
            onDelete={associate.isNew ? onDelete : undefined}
            isNew={associate.isNew}
          />
        ) : (
          <span className="font-medium">{associate.firstName}</span>
        )}
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {!isEditing && associate.lastName}
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {!isEditing && associate.phoneNumber}
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {!isEditing && associate.emailAddress}
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {!isEditing && (
          <AssociateActions
            onEdit={handleEdit}
            onDelete={onDelete}
            onMessage={onMessage}
            showMessageButton={true}
            size="sm"
          />
        )}
      </td>
    </tr>
  );
}
