import React from "react";

interface EditReminderModalProps {
  show: boolean;
  jobTitle: string;
  customerName: string;
  startDate: string;
  startTime: string;
  onJobTitleChange: (value: string) => void;
  onCustomerNameChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function EditReminderModal({
  show,
  jobTitle,
  customerName,
  startDate,
  startTime,
  onJobTitleChange,
  onCustomerNameChange,
  onStartDateChange,
  onStartTimeChange,
  onSave,
  onCancel,
}: EditReminderModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
        <h2 className="text-xl font-bold text-black mb-4">Edit Reminder</h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="editJobTitle"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Job Title *
            </label>
            <input
              type="text"
              id="editJobTitle"
              value={jobTitle}
              onChange={(e) => onJobTitleChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter job title"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="editCustomerName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Customer Name
            </label>
            <input
              type="text"
              id="editCustomerName"
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter customer name"
            />
          </div>

          <div>
            <label
              htmlFor="editStartDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Start Date
            </label>
            <input
              type="date"
              id="editStartDate"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label
              htmlFor="editStartTime"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Start Time
            </label>
            <input
              type="time"
              id="editStartTime"
              value={startTime}
              onChange={(e) => onStartTimeChange(e.target.value)}
              min="08:00"
              max="23:00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!jobTitle.trim()}
            className="px-4 py-2 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
