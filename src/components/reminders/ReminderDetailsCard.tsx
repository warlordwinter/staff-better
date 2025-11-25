import React from "react";
import { Job } from "@/model/interfaces/Job";
import { JobAssignmentResponse } from "@/utils/statusUtils";
import { formatDate } from "@/utils/dateUtils";
import { getStatusDisplay } from "@/utils/statusUtils";
import { convertUTCTimeToLocal } from "@/utils/timezoneUtils";
import { formatReminderSendTimesDetail } from "@/utils/reminderUtils";

interface ReminderDetailsCardProps {
  job: Job;
  assignments: JobAssignmentResponse[];
  reminderStatus: { success: boolean; message: string } | null;
  onEditClick: () => void;
  onDismissStatus: () => void;
}

const formatTime = (timeString: string, workDate: string): string => {
  try {
    const localTime = convertUTCTimeToLocal(timeString, workDate);
    const [hours, minutes] = localTime.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch {
    return timeString;
  }
};

export default function ReminderDetailsCard({
  job,
  assignments,
  reminderStatus,
  onEditClick,
  onDismissStatus,
}: ReminderDetailsCardProps) {
  const displayDate =
    assignments.length > 0 ? assignments[0].work_date : job.start_date;
  // Prioritize start_time from assignments, but fall back to job.start_time if no assignments
  const displayTime =
    assignments.length > 0 && assignments[0].start_time
      ? assignments[0].start_time
      : job.start_time || "";
  const statusDisplay = getStatusDisplay(job, assignments);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-xl font-semibold text-black">Reminder Details</h2>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded text-xs font-medium ${statusDisplay.color} ${statusDisplay.textColor}`}
          >
            {statusDisplay.label}
          </span>
          <button
            onClick={onEditClick}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Edit reminder"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2 text-gray-700">
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm font-medium">{formatDate(displayDate)}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <svg
            className="w-5 h-5 text-gray-500"
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
          <span className="text-sm font-medium">
            {displayTime
              ? formatTime(displayTime, displayDate)
              : "Time not set"}
          </span>
        </div>
      </div>

      {/* Reminder Message */}
      <div className="mb-4">
        <textarea
          readOnly
          value={job.customer_name || "No additional details provided."}
          className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm resize-none focus:outline-none"
          rows={2}
        />
      </div>

      {/* Reminder Send Times */}
      {displayDate && displayTime && (
        <div className="flex items-center gap-2 text-gray-700">
          <svg
            className="w-5 h-5 text-gray-500"
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
          <span className="text-sm">
            {formatReminderSendTimesDetail(
              displayDate || null,
              displayTime || null,
              job.night_before_time,
              job.day_of_time
            )
              .split("**")
              .map((part, index) =>
                index % 2 === 1 ? (
                  <strong key={index} className="font-semibold">{part}</strong>
                ) : (
                  <span key={index}>{part}</span>
                )
              )}
          </span>
        </div>
      )}

      {reminderStatus && (
        <div
          className={`mt-4 p-3 rounded-lg ${
            reminderStatus.success
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{reminderStatus.message}</p>
            <button
              onClick={onDismissStatus}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-4 h-4"
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
        </div>
      )}
    </div>
  );
}
