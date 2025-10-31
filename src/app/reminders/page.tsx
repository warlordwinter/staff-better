"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/ui/navBar";
import Footer from "@/components/ui/footer";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import { useAuthCheck } from "@/hooks/useAuthCheck";
import { Job } from "@/model/interfaces/Job";
import ImportOptions from "@/components/jobTableComp/importOptions";
import { useExcelUpload } from "@/hooks/useExcelUpload";

// Helper function to format date and time
const formatDateTime = (dateString: string): string => {
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
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, "0");
    return `${month} ${day}, ${displayHours}:${displayMinutes} ${ampm}`;
  } catch (error) {
    return dateString;
  }
};

// Helper function to determine status from job
const getStatus = (job: Job & { associateCount?: number; numReminders?: number }) => {
  // Default to Scheduled if no other status is determined
  // In a real implementation, you'd check job assignments for:
  // - num_reminders > 0 → "Sent"
  // - confirmation_status === "CONFIRMED" → "Confirmed"
  // - confirmation_status === "DECLINED" or errors → "Failed"
  
  if (job.numReminders && job.numReminders > 0) {
    // Check if any assignments are confirmed
    return { label: "Sent", color: "bg-gray-400", textColor: "text-gray-900" };
  }
  
  if (job.job_status?.includes("CONFIRMED")) {
    return { label: "Confirmed", color: "bg-green-500", textColor: "text-white" };
  }
  
  if (job.job_status?.includes("FAILED") || job.job_status?.includes("DECLINED")) {
    return { label: "Failed", color: "bg-red-500", textColor: "text-white" };
  }
  
  // Default to Scheduled
  return { label: "Scheduled", color: "bg-blue-500", textColor: "text-white" };
};

export default function RemindersPage() {
  const { loading: authLoading, isAuthenticated } = useAuthCheck();
  const [jobs, setJobs] = useState<(Job & { associateCount?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { uploadExcelFile, isUploading, progress, reset } = useExcelUpload();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowOptions(false);
      }
    };

    if (showOptions) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showOptions]);

  // Fetch jobs and their associate counts
  const loadJobs = async () => {
      try {
        // Fetch jobs
        const jobsRes = await fetch("/api/jobs");
        if (!jobsRes.ok) throw new Error("Failed to fetch jobs");
        const jobsData: Job[] = await jobsRes.json();

        // Fetch associate counts for each job
        const jobsWithCounts = await Promise.all(
          jobsData.map(async (job) => {
            try {
              const assignmentsRes = await fetch(
                `/api/job-assignments/${job.id}`
              );
              if (assignmentsRes.ok) {
                const assignments = await assignmentsRes.json();
                return {
                  ...job,
                  associateCount: Array.isArray(assignments)
                    ? assignments.length
                    : 0,
                };
              }
              return { ...job, associateCount: 0 };
            } catch {
              return { ...job, associateCount: 0 };
            }
          })
        );

        setJobs(jobsWithCounts);
      } catch (error) {
        console.error("Error loading reminders:", error);
        setJobs([]);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadJobs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  // Handle CSV/Excel upload
  const handleUploadCSV = () => {
    fileInputRef.current?.click();
    setShowOptions(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an Excel file (xlsx, xls) or CSV
    const isExcelFile =
      file.name.toLowerCase().endsWith(".xlsx") ||
      file.name.toLowerCase().endsWith(".xls") ||
      file.type.includes("sheet") ||
      file.type.includes("excel");

    if (isExcelFile) {
      // Use the Excel upload hook for Excel files
      try {
        const result = await uploadExcelFile(file);
        if (result.success) {
          // Refresh the jobs list
          await loadJobs();
        }
      } catch (error) {
        console.error("Excel upload failed:", error);
      }
    } else {
      // For CSV files, you might want to handle differently
      console.log("CSV file selected:", file.name);
      // Add CSV handling logic here if needed
    }

    // Clear the input
    e.target.value = "";
  };

  // Handle add manually
  const handleAddManually = () => {
    setShowAddModal(true);
    setShowOptions(false);
  };

  // Handle create new reminder
  const handleCreateReminder = async () => {
    if (!newJobTitle.trim()) return;

    const newJob = {
      job_title: newJobTitle.trim(),
      customer_name: newCustomerName.trim() || "Generic Company Name",
      job_status: "ACTIVE",
      start_date: newStartDate || new Date().toISOString().slice(0, 10),
    };

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newJob),
      });

      if (!res.ok) {
        throw new Error("Failed to create reminder");
      }

      // Refresh the jobs list
      await loadJobs();
      setShowAddModal(false);
      setNewJobTitle("");
      setNewCustomerName("");
      setNewStartDate("");
    } catch (error) {
      console.error("Failed to add reminder:", error);
      alert("Failed to create reminder. Please try again.");
    }
  };

  // Filter jobs based on search
  const filteredJobs = jobs.filter((job) => {
    const query = searchQuery.toLowerCase();
    return (
      job.job_title?.toLowerCase().includes(query) ||
      job.customer_name?.toLowerCase().includes(query)
    );
  });

  // Calculate summary stats
  const scheduledCount = jobs.filter(
    (job) => job.job_status === "ACTIVE"
  ).length;
  const sentCount = jobs.filter((job) => (job as any).num_reminders > 0).length;
  const confirmedCount = jobs.filter((job) =>
    job.job_status?.includes("CONFIRMED")
  ).length;

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner />
      </div>
    );
  }

  // Don't render content if user is not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 mt-24">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-black text-5xl font-semibold font-['Inter'] mb-2">
            Reminders
          </h1>
          <p className="text-gray-600 text-lg">
            {scheduledCount} scheduled • {sentCount} sent • {confirmedCount}{" "}
            confirmed
          </p>
        </div>

        {/* Search and New Reminder Section */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 items-start sm:items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reminders..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* New Reminder Button with Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowOptions((prev) => !prev)}
              className="px-5 py-3 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white rounded-lg font-medium inline-flex items-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isUploading}
            >
              <span className="text-sm font-normal font-['Inter']">
                {isUploading ? "Processing..." : "New Reminder"}
              </span>
              <Image
                src="/icons/plus-w.svg"
                alt="Plus"
                width={20}
                height={20}
                className="object-contain"
              />
            </button>

            {showOptions && (
              <div className="absolute right-0 mt-2 z-10">
                <ImportOptions
                  onUploadCSV={handleUploadCSV}
                  onAddManually={handleAddManually}
                />
              </div>
            )}

            {/* Progress indicator */}
            {isUploading && (
              <div className="absolute right-0 mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-64">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">
                    Upload Progress
                  </h4>
                  <button
                    onClick={reset}
                    className="text-gray-400 hover:text-gray-600"
                    type="button"
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
                <div className="text-xs text-gray-600 mb-2">
                  Step: {progress.step}
                </div>
                <div className="text-xs text-gray-500">{progress.message}</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] h-2 rounded-full transition-all duration-300"
                    style={{
                      width:
                        progress.step === "idle"
                          ? "0%"
                          : progress.step === "parsing"
                          ? "20%"
                          : progress.step === "mapping"
                          ? "40%"
                          : progress.step === "transforming"
                          ? "60%"
                          : progress.step === "uploading"
                          ? "80%"
                          : progress.step === "complete"
                          ? "100%"
                          : progress.step === "error"
                          ? "100%"
                          : "0%",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Success/Error message */}
            {(progress.step === "complete" || progress.step === "error") &&
              !isUploading && (
                <div
                  className={`absolute right-0 mt-2 p-3 border rounded-lg shadow-lg z-20 min-w-64 ${
                    progress.step === "complete"
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4
                      className={`text-sm font-medium ${
                        progress.step === "complete"
                          ? "text-green-900"
                          : "text-red-900"
                      }`}
                    >
                      {progress.step === "complete"
                        ? "Upload Complete!"
                        : "Upload Failed"}
                    </h4>
                    <button
                      onClick={reset}
                      className="text-gray-400 hover:text-gray-600"
                      type="button"
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
                  <div
                    className={`text-xs ${
                      progress.step === "complete"
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {progress.message}
                  </div>
                </div>
              )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv, .xlsx, .xls, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              disabled={isUploading}
            />
          </div>
        </div>

        {/* Reminder Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => {
            const status = getStatus(job);
            const dateTime = job.start_date
              ? formatDateTime(job.start_date)
              : "Date TBD";

            return (
              <div
                key={job.id}
                className="relative bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${status.color} ${status.textColor}`}
                  >
                    {status.label}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-black mb-4 pr-20">
                  {job.job_title || "Untitled Reminder"}
                </h3>

                {/* Date and Time */}
                <div className="flex items-center gap-2 mb-3 text-gray-600">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-sm">{dateTime}</span>
                </div>

                {/* Description - using customer name as description */}
                {job.customer_name && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {job.customer_name}
                  </p>
                )}

                {/* Assigned Associates */}
                <div className="flex items-center gap-2 mb-6 text-gray-600">
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
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span className="text-sm">
                    {job.associateCount || 0} associate
                    {job.associateCount !== 1 ? "s" : ""} assigned
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 mt-auto">
                  <Link
                    href={`/jobs/${job.id}/associates`}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white rounded-lg font-medium text-center hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2 shadow-sm"
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
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                      />
                    </svg>
                    Add Associates
                  </Link>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
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
                  </Link>
                  <button
                    onClick={async () => {
                      if (
                        window.confirm(
                          "Are you sure you want to delete this reminder?"
                        )
                      ) {
                        try {
                          const res = await fetch(`/api/jobs/${job.id}`, {
                            method: "DELETE",
                          });
                          if (res.ok) {
                            setJobs((prev) =>
                              prev.filter((j) => j.id !== job.id)
                            );
                          }
                        } catch (error) {
                          console.error("Failed to delete:", error);
                        }
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete reminder"
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
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredJobs.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {searchQuery
                ? "No reminders found matching your search."
                : "No reminders yet. Create your first reminder to get started!"}
            </p>
          </div>
        )}

        {/* Add Reminder Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
              <h2 className="text-xl font-bold text-black mb-4">
                Add New Reminder
              </h2>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="jobTitle"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Job Title *
                  </label>
                  <input
                    type="text"
                    id="jobTitle"
                    value={newJobTitle}
                    onChange={(e) => setNewJobTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Enter job title"
                    autoFocus
                  />
                </div>

                <div>
                  <label
                    htmlFor="customerName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Customer Name
                  </label>
                  <input
                    type="text"
                    id="customerName"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Enter customer name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="startDate"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewJobTitle("");
                    setNewCustomerName("");
                    setNewStartDate("");
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateReminder}
                  disabled={!newJobTitle.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  Create Reminder
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

