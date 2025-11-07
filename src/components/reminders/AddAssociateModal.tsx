import React, { useState, useEffect, useMemo } from "react";
import { formatPhoneForDisplay } from "@/utils/phoneUtils";

interface Associate {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string;
  email_address: string | null;
}

interface AddAssociateModalProps {
  show: boolean;
  jobId: string;
  existingAssociateIds: string[];
  workDate: string | null;
  startTime: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddAssociateModal({
  show,
  jobId,
  existingAssociateIds,
  workDate,
  startTime,
  onClose,
  onSuccess,
}: AddAssociateModalProps) {
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssociateIds, setSelectedAssociateIds] = useState<Set<string>>(
    new Set()
  );
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      fetchAssociates();
    } else {
      // Reset state when modal closes
      setSearchQuery("");
      setSelectedAssociateIds(new Set());
      setError(null);
    }
  }, [show]);

  const fetchAssociates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/associates");
      if (!res.ok) throw new Error("Failed to fetch associates");
      const data = await res.json();
      setAssociates(data || []);
    } catch (err) {
      console.error("Failed to fetch associates:", err);
      setError("Failed to load associates. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Filter out already assigned associates and filter by search query
  const availableAssociates = useMemo(() => {
    return associates
      .filter((associate) => !existingAssociateIds.includes(associate.id))
      .filter((associate) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const fullName = `${associate.first_name || ""} ${
          associate.last_name || ""
        }`.toLowerCase();
        const phone = associate.phone_number?.toLowerCase() || "";
        const email = associate.email_address?.toLowerCase() || "";
        return (
          fullName.includes(query) ||
          phone.includes(query) ||
          email.includes(query)
        );
      })
      .sort((a, b) => {
        const nameA = `${a.first_name || ""} ${
          a.last_name || ""
        }`.toLowerCase();
        const nameB = `${b.first_name || ""} ${
          b.last_name || ""
        }`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [associates, existingAssociateIds, searchQuery]);

  const handleToggleAssociate = (associateId: string) => {
    setSelectedAssociateIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(associateId)) {
        newSet.delete(associateId);
      } else {
        newSet.add(associateId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedAssociateIds.size === availableAssociates.length) {
      setSelectedAssociateIds(new Set());
    } else {
      setSelectedAssociateIds(new Set(availableAssociates.map((a) => a.id)));
    }
  };

  const handleAddAssociates = async () => {
    if (selectedAssociateIds.size === 0) return;

    setAdding(true);
    setError(null);

    try {
      // Add all selected associates
      const addPromises = Array.from(selectedAssociateIds).map(
        async (associateId) => {
          const res = await fetch(`/api/job-assignments/${jobId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              associate_id: associateId,
              confirmation_status: "UNCONFIRMED",
              work_date: workDate,
              start_time: startTime,
              num_reminders: 0,
            }),
          });

          if (!res.ok) {
            const errorText = await res.text();
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { error: errorText || "Failed to add associate" };
            }
            throw new Error(
              errorData.error || `Failed to add associate ${associateId}`
            );
          }

          return res.json();
        }
      );

      await Promise.all(addPromises);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to add associates:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to add associates. Please try again."
      );
    } finally {
      setAdding(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-black">
            Add Associates to Reminder
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {availableAssociates.length > 0 && (
          <div className="mb-4 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={
                  selectedAssociateIds.size === availableAssociates.length &&
                  availableAssociates.length > 0
                }
                onChange={handleSelectAll}
                className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Select All ({selectedAssociateIds.size} selected)
              </span>
            </label>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto mb-4 border border-gray-200 rounded-md">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading associates...
            </div>
          ) : availableAssociates.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchQuery
                ? "No associates found matching your search."
                : "No available associates to add."}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {availableAssociates.map((associate) => {
                const fullName =
                  `${associate.first_name || ""} ${
                    associate.last_name || ""
                  }`.trim() || "Unnamed";
                const isSelected = selectedAssociateIds.has(associate.id);

                return (
                  <label
                    key={associate.id}
                    className={`flex items-center gap-3 w-full p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      isSelected ? "bg-blue-50" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleAssociate(associate.id)}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-black">{fullName}</p>
                      <p className="text-sm text-gray-600">
                        {formatPhoneForDisplay(associate.phone_number)}
                      </p>
                      {associate.email_address && (
                        <p className="text-sm text-gray-500">
                          {associate.email_address}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            disabled={adding}
          >
            Cancel
          </button>
          <button
            onClick={handleAddAssociates}
            disabled={selectedAssociateIds.size === 0 || adding}
            className="px-4 py-2 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {adding
              ? `Adding ${selectedAssociateIds.size}...`
              : `Add ${
                  selectedAssociateIds.size > 0
                    ? `${selectedAssociateIds.size} `
                    : ""
                }Associate${selectedAssociateIds.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
