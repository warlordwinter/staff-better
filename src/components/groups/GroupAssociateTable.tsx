"use client";

import React from "react";
import { AssociateGroup } from "@/model/interfaces/AssociateGroup";
import GroupAssociateTableRow from "./GroupAssociateTableRow";

interface GroupAssociateTableProps {
  associates: AssociateGroup[];
  onSave: (updatedAssociate: AssociateGroup) => void;
  onDelete: (associateId: string) => void;
  onMessage: (associate: AssociateGroup) => void;
}

export default function GroupAssociateTable({
  associates,
  onSave,
  onDelete,
  onMessage,
}: GroupAssociateTableProps) {
  return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              First Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Last Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Phone Number
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email Address
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {associates.map((associate) => (
            <GroupAssociateTableRow
              key={associate.id}
              associate={associate}
              onSave={onSave}
              onDelete={() => onDelete(associate.id)}
              onMessage={() => onMessage(associate)}
            />
          ))}
        </tbody>
      </table>

      {/* Empty State */}
      {associates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            No associates found in this group. Use the form above to add some!
          </p>
        </div>
      )}
    </div>
  );
}
