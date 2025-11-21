"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/ui/navBar";
import LoadingSpinner from "@/components/ui/loadingSpinner";
import { useAuthCheck } from "@/hooks/useAuthCheck";
import { useReminderDetail } from "@/hooks/useReminderDetail";
import ReminderDetailsCard from "@/components/reminders/ReminderDetailsCard";
import AssociatesList from "@/components/reminders/AssociatesList";
import ReminderModal from "@/components/reminders/ReminderModal";
import AddAssociateModal from "@/components/reminders/AddAssociateModal";

export default function ReminderDetailPage() {
  const params = useParams();
  const reminderId = params.id as string;
  const { loading: authLoading, isAuthenticated } = useAuthCheck();

  const {
    job,
    assignments,
    loading,
    showEditModal,
    editJobTitle,
    editCustomerName,
    editStartDate,
    editStartTime,
    editNightBeforeTime,
    editDayOfTime,
    reminderStatus,
    setEditJobTitle,
    setEditCustomerName,
    setEditStartDate,
    setEditStartTime,
    setEditNightBeforeTime,
    setEditDayOfTime,
    setShowEditModal,
    setReminderStatus,
    handleDeleteAssociate,
    handleEditClick,
    handleUpdateReminder,
    handleAddAssociate,
    handleAddSuccess,
    showAddModal,
    setShowAddModal,
  } = useReminderDetail(reminderId);

  // Show loading spinner while auth is loading or data is loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-6">
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
          <h1 className="text-4xl font-bold text-black">
            {job?.job_title || "Loading..."}
          </h1>
        </div>

        {job && (
          <>
            <ReminderDetailsCard
              job={job}
              assignments={assignments}
              reminderStatus={reminderStatus}
              onEditClick={handleEditClick}
              onDismissStatus={() => setReminderStatus(null)}
            />

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-black">
                  Assigned Associates ({assignments.length})
                </h2>
                <button
                  onClick={handleAddAssociate}
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
              <AssociatesList
                assignments={assignments}
                onDeleteAssociate={handleDeleteAssociate}
              />
            </div>
          </>
        )}
      </main>

      <ReminderModal
        show={showEditModal}
        mode="edit"
        jobTitle={editJobTitle}
        customerName={editCustomerName}
        startDate={editStartDate}
        startTime={editStartTime}
        nightBeforeTime={editNightBeforeTime}
        dayOfTime={editDayOfTime}
        onJobTitleChange={setEditJobTitle}
        onCustomerNameChange={setEditCustomerName}
        onStartDateChange={setEditStartDate}
        onStartTimeChange={setEditStartTime}
        onNightBeforeTimeChange={setEditNightBeforeTime}
        onDayOfTimeChange={setEditDayOfTime}
        onSave={handleUpdateReminder}
        onCancel={() => {
          setShowEditModal(false);
          setEditJobTitle("");
          setEditCustomerName("");
          setEditStartDate("");
          setEditStartTime("");
          setEditNightBeforeTime("19:00");
          setEditDayOfTime("06:00");
        }}
      />

      {job && (
        <AddAssociateModal
          show={showAddModal}
          jobId={reminderId}
          existingAssociateIds={assignments.map((a) => a.associates.id)}
          workDate={
            assignments.length > 0 ? assignments[0].work_date : job.start_date
          }
          startTime={
            assignments.length > 0
              ? assignments[0].start_time
              : job.start_time || null
          }
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}
    </div>
  );
}
