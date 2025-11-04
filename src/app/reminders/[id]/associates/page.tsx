"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/ui/navBar";
import { Job } from "@/model/interfaces/Job";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import { useAuthCheck } from "@/hooks/useAuthCheck";
import { formatPhoneForDisplay } from "@/utils/phoneUtils";
import { convertUTCTimeToLocal } from "@/utils/timezoneUtils";

interface JobAssignmentResponse {
  confirmation_status: string;
  num_reminders: number;
  work_date: string;
  start_time: string;
  associates: {
    id: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    email_address: string;
  };
}

// Helper function to format date
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[date.getMonth()];
    const day = date.getDate();
    return `${month} ${day}`;
  } catch (error) {
    return dateString;
  }
};

// Helper function to format time
const formatTime = (timeString: string, workDate: string): string => {
  try {
    const localTime = convertUTCTimeToLocal(timeString, workDate);
    const [hours, minutes] = localTime.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch (error) {
    return timeString;
  }
};

// Helper function to get status display
const getStatusDisplay = (job: Job, assignments: JobAssignmentResponse[]) => {
  // If any reminders have been sent
  if (assignments.some((a) => a.num_reminders > 0)) {
    return { label: "Sent", color: "bg-gray-400", textColor: "text-gray-900" };
  }
  
  // Check if any assignments are confirmed
  if (assignments.some((a) => a.confirmation_status === "CONFIRMED")) {
    return { label: "Confirmed", color: "bg-green-500", textColor: "text-white" };
  }
  
  if (job.job_status?.includes("FAILED") || job.job_status?.includes("DECLINED")) {
    return { label: "Failed", color: "bg-red-500", textColor: "text-white" };
  }
  
  return { label: "Scheduled", color: "bg-blue-500", textColor: "text-white" };
};

// Helper function to get confirmation status color
const getConfirmationStatusColor = (status: string) => {
  switch (status) {
    case "CONFIRMED":
      return "bg-green-100 text-green-800";
    case "SOFT_CONFIRMED":
      return "bg-yellow-100 text-yellow-800";
    case "LIKELY_CONFIRMED":
      return "bg-blue-100 text-blue-800";
    case "DECLINED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function ReminderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reminderId = params.id as string;
  const [job, setJob] = useState<Job | null>(null);
  const [assignments, setAssignments] = useState<JobAssignmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
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
        const assignmentsRes = await fetch(`/api/job-assignments/${reminderId}`);
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
    if (!window.confirm("Are you sure you want to remove this associate from this reminder?")) {
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

  const handleSendToAll = () => {
    // TODO: Implement send to all functionality
    alert("Send to all functionality coming soon");
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
  const displayDate = assignments.length > 0 ? assignments[0].work_date : job.start_date;
  const displayTime = assignments.length > 0 ? assignments[0].start_time : "";
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
            <h2 className="text-xl font-semibold text-black">Reminder Details</h2>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded ${statusDisplay.color} ${statusDisplay.textColor} text-sm font-medium`}
              >
                {statusDisplay.label}
              </span>
              <button
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
            {displayTime && (
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
                  {formatTime(displayTime, displayDate)}
                </span>
              </div>
            )}
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
            <button
              onClick={handleSendToAll}
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
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              Send to All
            </button>
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
    </div>
  );
}
