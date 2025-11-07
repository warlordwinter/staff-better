"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/ui/navBar";
import { Job } from "@/model/interfaces/Job";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import { useAuthCheck } from "@/hooks/useAuthCheck";
import { formatPhoneForDisplay } from "@/utils/phoneUtils";
import {
  convertUTCTimeToLocal,
  convertLocalTimeToUTC,
} from "@/utils/timezoneUtils";
import { formatDate } from "@/utils/dateUtils";
import {
  getStatusDisplay,
  getConfirmationStatusColor,
  type JobAssignmentResponse,
} from "@/utils/statusUtils";

// Helper function to format time
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

export default function ReminderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reminderId = params.id as string;
  const [job, setJob] = useState<Job | null>(null);
  const [assignments, setAssignments] = useState<JobAssignmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const { loading: authLoading, isAuthenticated } = useAuthCheck();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch job details
        const jobRes = await fetch(`/api/jobs/${reminderId}`);
        if (!jobRes.ok) {
          throw new Error("Failed to fetch job");
        }
        const jobData = await jobRes.json();
        setJob(jobData);

        // Fetch job assignments
        const assignmentsRes = await fetch(
          `/api/job-assignments/${reminderId}`
        );
        if (assignmentsRes.ok) {
          const assignmentsData = await assignmentsRes.json();
          setAssignments(assignmentsData || []);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (reminderId) {
      fetchData();
    }
  }, [reminderId]);

  const handleDeleteAssociate = async (associateId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to remove this associate from this reminder?"
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        `/api/job-assignments/${reminderId}/${associateId}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) throw new Error("Failed to remove associate");

      // Refresh assignments
      const assignmentsRes = await fetch(`/api/job-assignments/${reminderId}`);
      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        setAssignments(assignmentsData || []);
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      alert("Failed to remove associate");
    }
  };

  const handleEditClick = () => {
    if (job) {
      setEditJobTitle(job.job_title || "");
      setEditCustomerName(job.customer_name || "");
      setEditStartDate(job.start_date || "");

      // Get start time from first assignment if available, convert to local time for display
      let localTime = "";
      if (assignments.length > 0 && assignments[0].start_time) {
        const workDate = assignments[0].work_date || job.start_date;
        const localTimeStr = convertUTCTimeToLocal(
          assignments[0].start_time,
          workDate
        );
        // Convert "HH:mm" to "HH:mm" format for time input (already in correct format)
        localTime = localTimeStr;
      }
      setEditStartTime(localTime);

      setShowEditModal(true);
    }
  };

  const handleUpdateReminder = async () => {
    if (!editJobTitle.trim() || !job) return;

    const updates = {
      job_title: editJobTitle.trim(),
      customer_name: editCustomerName.trim() || "Generic Company Name",
      start_date: editStartDate || job.start_date,
    };

    try {
      // Update job details
      const res = await fetch(`/api/jobs/${reminderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        throw new Error("Failed to update reminder");
      }

      const updatedJob = await res.json();
      setJob(updatedJob);

      // Update start_time for all assignments if provided
      if (editStartTime.trim()) {
        const workDate = editStartDate || job.start_date;
        console.log("Updating time:", {
          editStartTime: editStartTime.trim(),
          workDate,
        });
        const utcTime = convertLocalTimeToUTC(editStartTime.trim(), workDate);
        console.log("Converted UTC time:", utcTime);

        if (!utcTime) {
          console.error("Failed to convert local time to UTC");
          alert(
            "Invalid time format. Please use HH:mm format (e.g., 14:30). The reminder details were updated, but the time was not changed."
          );
          // Continue to close modal even if time conversion failed
        } else if (assignments.length === 0) {
          console.warn("No assignments to update time for");
          // Time will be set when associates are added
        } else {
          console.log(
            `Updating ${assignments.length} assignments with time ${utcTime}`
          );
          // Update all assignments with the new start_time
          const updatePromises = assignments.map(async (assignment) => {
            try {
              const res = await fetch(
                `/api/job-assignments/${reminderId}/${assignment.associates.id}`,
                {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    start_time: utcTime,
                    work_date: workDate,
                  }),
                }
              );

              if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(
                  errorData.error ||
                    `Failed to update assignment for ${assignment.associates.first_name} ${assignment.associates.last_name}`
                );
              }

              return res.json();
            } catch (error) {
              console.error(
                `Failed to update assignment for ${assignment.associates.id}:`,
                error
              );
              throw error;
            }
          });

          try {
            await Promise.all(updatePromises);
          } catch (error) {
            console.error("Error updating assignments:", error);
            alert(
              `Failed to update some assignments: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
            // Still refresh to show what was updated
          }

          // Refresh assignments to get updated data
          const assignmentsRes = await fetch(
            `/api/job-assignments/${reminderId}`
          );
          if (assignmentsRes.ok) {
            const assignmentsData = await assignmentsRes.json();
            setAssignments(assignmentsData || []);
          }
        }
      }

      setShowEditModal(false);
    } catch (error) {
      console.error("Failed to update reminder:", error);
      alert("Failed to update reminder. Please try again.");
    }
  };

  // Show loading spinner while auth is loading or data is loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Navbar />
        <LoadingSpinner />
      </div>
    );
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  if (!job) {
    return (
      <div>
        <Navbar />
        <div className="flex justify-center items-center min-h-screen">
          <div>Reminder not found</div>
        </div>
      </div>
    );
  }

  // Get the first assignment's date/time for display (all should be same for same job)
  const displayDate =
    assignments.length > 0 ? assignments[0].work_date : job.start_date;
  // Get start time from any assignment that has it, or empty string if none
  const displayTime =
    assignments.length > 0 && assignments[0].start_time
      ? assignments[0].start_time
      : "";
  const statusDisplay = getStatusDisplay(job, assignments);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/reminders"
              className="text-gray-600 hover:text-gray-900 transition-colors"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-4xl font-bold text-black">{job.job_title}</h1>
          </div>
          <button
            onClick={() => {
              // TODO: Implement add associate functionality
              router.push(`/reminders/${reminderId}/associates?add=true`);
            }}
            className="px-4 py-2 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white rounded-lg font-medium inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Associate
          </button>
        </div>

        {/* Reminder Details Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-xl font-semibold text-black">
              Reminder Details
            </h2>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded ${statusDisplay.color} ${statusDisplay.textColor} text-sm font-medium`}
              >
                {statusDisplay.label}
              </span>
              <button
                onClick={handleEditClick}
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

          {/* Date and Time */}
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
              <span className="text-sm font-medium">
                {formatDate(displayDate)}
              </span>
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

          {/* Message */}
          <p className="text-gray-700">
            {job.customer_name || "No additional details provided."}
          </p>
        </div>

        {/* Assigned Associates Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-black">
              Assigned Associates ({assignments.length})
            </h2>
          </div>

          {/* Associates List */}
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No associates assigned to this reminder yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => {
                const associate = assignment.associates;
                const fullName = `${associate.first_name} ${associate.last_name}`;
                return (
                  <div
                    key={associate.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base font-semibold text-black">
                          {fullName}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getConfirmationStatusColor(
                            assignment.confirmation_status
                          )}`}
                        >
                          {assignment.confirmation_status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatPhoneForDisplay(associate.phone_number)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteAssociate(associate.id)}
                      className="ml-4 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      title="Remove associate"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Edit Reminder Modal */}
      {showEditModal && (
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
                  value={editJobTitle}
                  onChange={(e) => setEditJobTitle(e.target.value)}
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
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
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
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
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
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  min="08:00"
                  max="23:00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditJobTitle("");
                  setEditCustomerName("");
                  setEditStartDate("");
                  setEditStartTime("");
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateReminder}
                disabled={!editJobTitle.trim()}
                className="px-4 py-2 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
