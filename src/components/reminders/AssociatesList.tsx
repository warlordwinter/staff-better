import React from "react";
import { JobAssignmentResponse } from "@/utils/statusUtils";
import { formatPhoneForDisplay } from "@/utils/phoneUtils";
import { getConfirmationStatusColor } from "@/utils/statusUtils";

interface AssociatesListProps {
  assignments: JobAssignmentResponse[];
  onDeleteAssociate: (associateId: string) => void;
}

export default function AssociatesList({ assignments, onDeleteAssociate }: AssociatesListProps) {
  if (assignments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No associates assigned to this reminder yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assignments.map((assignment) => {
        const associate = assignment.associates;
        const fullName = `${associate.first_name} ${associate.last_name}`;
        return (
          <div
            key={associate.id}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-base font-semibold text-black">{fullName}</h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getConfirmationStatusColor(
                    assignment.confirmation_status
                  )}`}
                >
                  {assignment.confirmation_status}
                </span>
              </div>
              <p className="text-sm text-gray-600">{formatPhoneForDisplay(associate.phone_number)}</p>
            </div>
            <button
              onClick={() => onDeleteAssociate(associate.id)}
              className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 ml-4 p-1"
              title="Remove associate"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}

