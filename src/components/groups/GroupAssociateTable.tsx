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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
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
      </div>

      {/* Empty State */}
      {associates.length === 0 && (
        <div className="text-center py-12 bg-gray-50">
          <p className="text-gray-500 text-sm">
            No associates found in this group. Use the form above to add some!
          </p>
        </div>
      )}
    </div>
  );
}
