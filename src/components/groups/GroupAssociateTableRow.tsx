"use client";

import React, { useState, useMemo } from "react";
import { AssociateGroup } from "@/model/interfaces/AssociateGroup";
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
      <td className="px-6 py-4 text-sm text-gray-900 font-medium truncate">
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

      <td className="px-6 py-4 text-sm text-gray-700 truncate">
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

      <td className="px-6 py-4 text-sm text-gray-700 font-mono truncate">
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
          associate.phoneNumber
        )}
      </td>

      <td className="px-6 py-4 text-sm text-gray-700 truncate">
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
          associate.emailAddress
        )}
      </td>

      <td className="px-6 py-4 text-center">
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
              showMessageButton={true}
              size="md"
            />
          </div>
        )}
      </td>
    </tr>
  );
}
