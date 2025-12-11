import React, { useState, useRef, useEffect } from "react";

interface ReminderModalProps {
  show: boolean;
  mode: "add" | "edit";
  jobTitle: string;
  customerName: string;
  startDate: string;
  startTime: string;
  nightBeforeTime?: string;
  dayOfTime?: string;
  onJobTitleChange: (value: string) => void;
  onCustomerNameChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onNightBeforeTimeChange?: (value: string) => void;
  onDayOfTimeChange?: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

// Generate time options for dropdown (hourly from 5:00 AM to 11:00 PM)
const generateTimeOptions = (): string[] => {
  const options: string[] = [];
  for (let hour = 5; hour < 24; hour++) {
    const timeString = `${hour.toString().padStart(2, "0")}:00`;
    options.push(timeString);
  }
  return options;
};

// Format time for display (e.g., "19:00" -> "7:00 PM")
const formatTimeForDisplay = (time: string): string => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

// Custom Time Dropdown Component
interface TimeDropdownProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label: string;
}

function TimeDropdown({
  id,
  value,
  onChange,
  options,
}: TimeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedDisplay = formatTimeForDisplay(value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-left flex items-center justify-between"
      >
        <span>{selectedDisplay}</span>
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.map((time) => {
            const displayTime = formatTimeForDisplay(time);
            const isSelected = time === value;
            return (
              <button
                key={time}
                type="button"
                onClick={() => {
                  onChange(time);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                  isSelected ? "bg-orange-50 text-orange-600 font-medium" : ""
                }`}
              >
                {displayTime}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Helper function to check if date/time is in the past
const isDateTimeInPast = (date: string, time: string): boolean => {
  if (!date || !time) return false;

  const now = new Date();
  const selectedDate = new Date(`${date}T${time}`);

  // Add 2 minutes buffer to account for reminder calculation time
  const bufferMs = 2 * 60 * 1000;
  return selectedDate.getTime() <= now.getTime() + bufferMs;
};

// Get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

// Get current time in HH:MM format
const getCurrentTime = (): string => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

export default function ReminderModal({
  show,
  mode,
  jobTitle,
  customerName,
  startDate,
  startTime,
  nightBeforeTime = "19:00",
  dayOfTime = "07:00",
  onJobTitleChange,
  onCustomerNameChange,
  onStartDateChange,
  onStartTimeChange,
  onNightBeforeTimeChange,
  onDayOfTimeChange,
  onSave,
  onCancel,
}: ReminderModalProps) {
  if (!show) return null;

  const isEditMode = mode === "edit";
  const title = isEditMode ? "Edit Reminder" : "Add New Reminder";
  const subtitle = isEditMode
    ? "Update the reminder details."
    : "Create a new reminder.";
  const buttonText = isEditMode ? "Save Changes" : "Create Reminder";
  const jobTitleId = isEditMode ? "editJobTitle" : "jobTitle";
  const customerNameId = isEditMode ? "editCustomerName" : "customerName";
  const startDateId = isEditMode ? "editStartDate" : "startDate";
  const startTimeId = isEditMode ? "editStartTime" : "startTime";
  const nightBeforeTimeId = isEditMode
    ? "editNightBeforeTime"
    : "nightBeforeTime";
  const dayOfTimeId = isEditMode ? "editDayOfTime" : "dayOfTime";

  const timeOptions = generateTimeOptions();

  // Validation: Check if date/time is in the past
  const todayDate = getTodayDate();
  const isPastDateTime =
    startDate && startTime ? isDateTimeInPast(startDate, startTime) : false;
  const isToday = startDate === todayDate;
  const minTime = isToday ? getCurrentTime() : "00:00";

  // Determine if save should be disabled
  const isSaveDisabled = !jobTitle.trim() || isPastDateTime;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 pb-8 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-black">{title}</h2>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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

        <div className="space-y-4">
          <div>
            <label
              htmlFor={jobTitleId}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Shift Title *
            </label>
            <input
              type="text"
              id={jobTitleId}
              value={jobTitle}
              onChange={(e) => onJobTitleChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter job title"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor={customerNameId}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Customer Name
            </label>
            <input
              type="text"
              id={customerNameId}
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter customer name"
            />
          </div>

          <div>
            <label
              htmlFor={startDateId}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Shift Date
            </label>
            <input
              type="date"
              id={startDateId}
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              min={todayDate}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                isPastDateTime ? "border-red-500" : "border-gray-300"
              }`}
            />
            {isPastDateTime && (
              <p className="text-red-500 text-xs mt-1">
                Cannot schedule reminders in the past. Please select a future
                date and time.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor={startTimeId}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Shift Time
            </label>
            <input
              type="time"
              id={startTimeId}
              value={startTime}
              onChange={(e) => onStartTimeChange(e.target.value)}
              min={isToday ? minTime : "08:00"}
              max="23:00"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                isPastDateTime ? "border-red-500" : "border-gray-300"
              }`}
            />
            {isToday && startTime && startTime < minTime && (
              <p className="text-red-500 text-xs mt-1">
                Time must be in the future. Current time is{" "}
                {formatTimeForDisplay(minTime)}.
              </p>
            )}
          </div>

          {/* Reminder Times Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reminder Times
            </label>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor={nightBeforeTimeId}
                  className="block text-xs text-gray-600 mb-1"
                >
                  Day Before
                </label>
                <TimeDropdown
                  id={nightBeforeTimeId}
                  value={nightBeforeTime}
                  onChange={(value) => onNightBeforeTimeChange?.(value)}
                  options={timeOptions}
                  label="Day Before"
                />
              </div>
              <div>
                <label
                  htmlFor={dayOfTimeId}
                  className="block text-xs text-gray-600 mb-1"
                >
                  Day Of
                </label>
                <TimeDropdown
                  id={dayOfTimeId}
                  value={dayOfTime}
                  onChange={(value) => onDayOfTimeChange?.(value)}
                  options={timeOptions}
                  label="Day Of"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Reminder Summary */}
        {nightBeforeTime && dayOfTime && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <svg
                className="w-5 h-5 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                Sends at{" "}
                <strong>{formatTimeForDisplay(nightBeforeTime)}</strong> day
                before and <strong>{formatTimeForDisplay(dayOfTime)}</strong>{" "}
                day of
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isSaveDisabled}
            className="px-4 py-2 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
