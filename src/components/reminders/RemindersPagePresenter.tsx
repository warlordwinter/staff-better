"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRemindersPage } from "@/hooks/useRemindersPage";
import { useAuthCheck } from "@/hooks/useAuthCheck";
import { useExcelUpload } from "@/hooks/useExcelUpload";
import RemindersPageView from "./RemindersPageView";
import { JobWithCount } from "@/hooks/useRemindersPage";

export default function RemindersPagePresenter() {
  const { loading: authLoading, isAuthenticated } = useAuthCheck();
  const model = useRemindersPage(isAuthenticated, authLoading);
  const { uploadExcelFile, isUploading, progress, reset } = useExcelUpload();

  const [showOptions, setShowOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
          await model.loadJobs();
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
    model.setShowAddModal(true);
    setShowOptions(false);
  };

  // Handle create new reminder
  const handleCreateReminder = async () => {
    try {
      await model.createReminder(
        model.newJobTitle,
        model.newCustomerName,
        model.newStartDate,
        model.newStartTime
      );
    } catch {
      alert("Failed to create reminder. Please try again.");
    }
  };

  // Handle delete reminder
  const handleDeleteReminder = async (job: JobWithCount) => {
    if (window.confirm("Are you sure you want to delete this reminder?")) {
      try {
        await model.deleteReminder(job.id);
      } catch {
        alert("Failed to delete reminder. Please try again.");
      }
    }
  };

  return (
    <RemindersPageView
      // Auth state
      authLoading={authLoading}
      isAuthenticated={isAuthenticated}
      // Model state
      jobs={model.filteredJobs}
      loading={model.loading}
      searchQuery={model.searchQuery}
      showAddModal={model.showAddModal}
      newJobTitle={model.newJobTitle}
      newCustomerName={model.newCustomerName}
      newStartDate={model.newStartDate}
      newStartTime={model.newStartTime}
      scheduledCount={model.scheduledCount}
      sentCount={model.sentCount}
      confirmedCount={model.confirmedCount}
      // Upload state
      showOptions={showOptions}
      isUploading={isUploading}
      progress={progress}
      fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
      dropdownRef={dropdownRef as React.RefObject<HTMLDivElement>}
      // Actions
      onSearchChange={model.setSearchQuery}
      onToggleOptions={() => setShowOptions((prev) => !prev)}
      onUploadCSV={handleUploadCSV}
      onAddManually={handleAddManually}
      onFileChange={handleFileChange}
      onJobTitleChange={model.setNewJobTitle}
      onCustomerNameChange={model.setNewCustomerName}
      onStartDateChange={model.setNewStartDate}
      onStartTimeChange={model.setNewStartTime}
      onCreateReminder={handleCreateReminder}
      onCancelAdd={() => model.resetForm()}
      onDeleteReminder={handleDeleteReminder}
      onResetUpload={reset}
    />
  );
}
