"use client";

import React, { RefObject, useState } from "react";
import Image from "next/image";
import Navbar from "@/components/ui/navBar";
import Footer from "@/components/ui/footer";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import ImportOptions from "@/components/jobTableComp/importOptions";
import ReminderModal from "@/components/reminders/ReminderModal";
import { JobWithCount } from "@/hooks/useRemindersPage";
import { formatDateTime } from "@/utils/dateUtils";
import { getStatus } from "@/utils/statusUtils";
import { formatReminderSendTimes } from "@/utils/reminderUtils";
import { convertLocalTimeToUTC, convertUTCTimeToLocal } from "@/utils/timezoneUtils";

interface RemindersPageViewProps {
  // Auth state
  authLoading: boolean;
  isAuthenticated: boolean;
  // Model state
  jobs: JobWithCount[];
  loading: boolean;
  searchQuery: string;
  showAddModal: boolean;
  newJobTitle: string;
  newCustomerName: string;
  newStartDate: string;
  newStartTime: string;
  scheduledCount: number;
  sentCount: number;
  confirmedCount: number;
  // Upload state
  showOptions: boolean;
  isUploading: boolean;
  progress: {
    step: string;
    message: string;
  };
  fileInputRef: RefObject<HTMLInputElement>;
  dropdownRef: RefObject<HTMLDivElement>;
  // Actions
  onSearchChange: (query: string) => void;
  onToggleOptions: () => void;
  onUploadCSV: () => void;
  onAddManually: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onJobTitleChange: (title: string) => void;
  onCustomerNameChange: (name: string) => void;
  onStartDateChange: (date: string) => void;
  onStartTimeChange: (time: string) => void;
  onCreateReminder: () => void;
  onCancelAdd: () => void;
  onDeleteReminder: (job: JobWithCount) => void;
  onResetUpload: () => void;
}

export default function RemindersPageView({
  authLoading,
  isAuthenticated,
  jobs,
  loading,
  searchQuery,
  showAddModal,
  newJobTitle,
  newCustomerName,
  newStartDate,
  newStartTime,
  scheduledCount,
  sentCount,
  confirmedCount,
  showOptions,
  isUploading,
  progress,
  fileInputRef,
  dropdownRef,
  onSearchChange,
  onToggleOptions,
  onUploadCSV,
  onAddManually,
  onFileChange,
  onJobTitleChange,
  onCustomerNameChange,
  onStartDateChange,
  onStartTimeChange,
  onCreateReminder,
  onCancelAdd,
  onDeleteReminder,
  onResetUpload,
}: RemindersPageViewProps) {
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");

  const handleEditClick = (job: JobWithCount, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingJobId(job.id);
    setEditJobTitle(job.job_title || "");
    setEditCustomerName(job.customer_name || "");
    setEditStartDate(job.start_date || "");
    
    // Convert UTC time to local for editing
    if (job.start_time) {
      const localTime = convertUTCTimeToLocal(job.start_time, job.start_date || "");
      setEditStartTime(localTime);
    } else {
      setEditStartTime("");
    }
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingJobId(null);
    setEditJobTitle("");
    setEditCustomerName("");
    setEditStartDate("");
    setEditStartTime("");
  };

  const handleSaveEdit = async (job: JobWithCount, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!editJobTitle.trim()) return;

    try {
      // Convert local time to UTC for API
      let formattedStartTime: string | null = null;
      if (editStartTime && editStartTime.trim()) {
        const workDate = editStartDate || new Date().toISOString().slice(0, 10);
        const utcTime = convertLocalTimeToUTC(editStartTime.trim(), workDate);
        if (utcTime) {
          formattedStartTime = `${workDate}T${utcTime}:00Z`;
        }
      }

      const updates = {
        job_title: editJobTitle.trim(),
        customer_name: editCustomerName.trim() || "Generic Company Name",
        start_date: editStartDate || new Date().toISOString().slice(0, 10),
        start_time: formattedStartTime,
      };

      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        throw new Error("Failed to update reminder");
      }

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error("Failed to update reminder:", error);
      alert("Failed to update reminder. Please try again.");
    }
  };

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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingSpinner />
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
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search reminders..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* New Reminder Button with Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={onToggleOptions}
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
                  onUploadCSV={onUploadCSV}
                  onAddManually={onAddManually}
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
                    onClick={onResetUpload}
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
                      onClick={onResetUpload}
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
              onChange={onFileChange}
              accept=".csv, .xlsx, .xls, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              disabled={isUploading}
            />
          </div>
        </div>

        {/* Reminder Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => {
            const status = getStatus(job);
            const dateTime = job.start_date
              ? formatDateTime(job.start_date, job.start_time || null)
              : "Date TBD";
            const isEditing = editingJobId === job.id;

            return (
              <div
                key={job.id}
                className="relative bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col"
                onClick={(e) => {
                  // Only navigate if not editing and not clicking on buttons
                  if (!isEditing && !(e.target as HTMLElement).closest('button')) {
                    window.location.href = `/reminders/${job.id}/associates`;
                  }
                }}
              >
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  <span
                    className={`px-3 py-1 rounded text-xs font-medium ${status.color} ${status.textColor}`}
                  >
                    {status.label}
                  </span>
                </div>

                {/* Title */}
                {isEditing ? (
                  <input
                    type="text"
                    value={editJobTitle}
                    onChange={(e) => setEditJobTitle(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xl font-bold text-black mb-4 pr-20 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Job title"
                  />
                ) : (
                  <h3 className="text-xl font-bold text-black mb-4 pr-20">
                    {job.job_title || "Untitled Reminder"}
                  </h3>
                )}

                {/* Date and Time */}
                {isEditing ? (
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-gray-500"
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
                      <input
                        type="date"
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-gray-500"
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
                      <input
                        type="time"
                        value={editStartTime}
                        onChange={(e) => setEditStartTime(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-3 text-gray-600">
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
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-sm">{dateTime}</span>
                    </div>

                    {/* Reminder Send Times */}
                    {job.start_date && (
                      <div className="flex items-center gap-2 mb-3 text-gray-600">
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
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="text-sm text-gray-600">
                          {formatReminderSendTimes(job.start_date || null, job.start_time || null)}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* Description */}
                {isEditing ? (
                  <input
                    type="text"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm text-gray-600 mb-4 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Customer/Company name"
                  />
                ) : (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {job.customer_name || "No description provided."}
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
                <div
                  className="flex items-center gap-3 mt-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isEditing ? (
                    <>
                      <button
                        onClick={(e) => handleSaveEdit(job, e)}
                        disabled={!editJobTitle.trim()}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white rounded-lg font-medium text-center hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.location.href = `/reminders/${job.id}/associates`;
                        }}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white rounded-lg font-medium text-center hover:opacity-90 transition-opacity"
                      >
                        View Details
                      </button>
                      <button
                        onClick={(e) => handleEditClick(job, e)}
                        className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
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
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDeleteReminder(job);
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
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {jobs.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {searchQuery
                ? "No reminders found matching your search."
                : "No reminders yet. Create your first reminder to get started!"}
            </p>
          </div>
        )}

        {/* Add Reminder Modal */}
        <ReminderModal
          show={showAddModal}
          mode="add"
          jobTitle={newJobTitle}
          customerName={newCustomerName}
          startDate={newStartDate}
          startTime={newStartTime}
          onJobTitleChange={onJobTitleChange}
          onCustomerNameChange={onCustomerNameChange}
          onStartDateChange={onStartDateChange}
          onStartTimeChange={onStartTimeChange}
          onSave={onCreateReminder}
          onCancel={onCancelAdd}
        />
      </main>
      <Footer />
    </div>
  );
}
