"use client";

import React from "react";
import { AssociateGroup } from "@/model/interfaces/AssociateGroup";

interface AddExistingModalProps {
  isOpen: boolean;
  availableAssociates: AssociateGroup[];
  selectedAssociateIds: string[];
  onSelectAssociate: (associateId: string, selected: boolean) => void;
  onAddSelected: () => void;
  onCancel: () => void;
}

export default function AddExistingModal({
  isOpen,
  availableAssociates,
  selectedAssociateIds,
  onSelectAssociate,
  onAddSelected,
  onCancel,
}: AddExistingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <h2 className="text-xl font-bold text-black mb-4">
          Add Existing Associates
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Select associates to add to this group:
        </p>

        {availableAssociates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              No available associates to add to this group.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-2">
              {availableAssociates.map((associate) => (
                <div
                  key={associate.id}
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    id={`associate-${associate.id}`}
                    checked={selectedAssociateIds.includes(associate.id)}
                    onChange={(e) =>
                      onSelectAssociate(associate.id, e.target.checked)
                    }
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor={`associate-${associate.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium text-gray-900">
                          {associate.firstName} {associate.lastName}
                        </span>
                        {associate.emailAddress && (
                          <span className="text-sm text-gray-500 ml-2">
                            ({associate.emailAddress})
                          </span>
                        )}
                      </div>
                      {associate.phoneNumber && (
                        <span className="text-sm text-gray-500">
                          {associate.phoneNumber}
                        </span>
                      )}
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
          <span className="text-sm text-gray-600">
            {selectedAssociateIds.length} associate
            {selectedAssociateIds.length !== 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onAddSelected}
              disabled={selectedAssociateIds.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add Selected ({selectedAssociateIds.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
