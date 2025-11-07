import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Job } from "@/model/interfaces/Job";
import { JobAssignmentResponse } from "@/utils/statusUtils";
import { convertUTCTimeToLocal, convertLocalTimeToUTC } from "@/utils/timezoneUtils";

export interface ReminderStatus {
  success: boolean;
  message: string;
}

export function useReminderDetail(reminderId: string) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [assignments, setAssignments] = useState<JobAssignmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [processingReminders, setProcessingReminders] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<ReminderStatus | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const jobRes = await fetch(`/api/jobs/${reminderId}`);
        if (!jobRes.ok) throw new Error("Failed to fetch job");
        const jobData = await jobRes.json();
        setJob(jobData);

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

  const refreshAssignments = async () => {
    const assignmentsRes = await fetch(`/api/job-assignments/${reminderId}`);
    if (assignmentsRes.ok) {
      const assignmentsData = await assignmentsRes.json();
      setAssignments(assignmentsData || []);
    }
  };

  const handleDeleteAssociate = async (associateId: string) => {
    if (!window.confirm("Are you sure you want to remove this associate from this reminder?")) {
      return;
    }

    try {
      const res = await fetch(`/api/job-assignments/${reminderId}/${associateId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove associate");
      await refreshAssignments();
    } catch (error) {
      console.error("Failed to delete:", error);
      alert("Failed to remove associate");
    }
  };

  const handleProcessReminders = async () => {
    if (!window.confirm("This will process and send reminders to all associates for this job. Continue?")) {
      return;
    }

    setProcessingReminders(true);
    setReminderStatus(null);

    try {
      const res = await fetch("/api/reminders/process", { method: "GET" });
      const data = await res.json();

      if (res.ok && data.success) {
        setReminderStatus({
          success: true,
          message: data.message || `Processed ${data.processed} reminders. ${data.successful} successful, ${data.failed} failed.`,
        });
        await refreshAssignments();
      } else {
        setReminderStatus({
          success: false,
          message: data.error || "Failed to process reminders",
        });
      }
    } catch (error) {
      console.error("Failed to process reminders:", error);
      setReminderStatus({
        success: false,
        message: error instanceof Error ? error.message : "Failed to process reminders",
      });
    } finally {
      setProcessingReminders(false);
    }
  };

  const handleEditClick = () => {
    if (job) {
      setEditJobTitle(job.job_title || "");
      setEditCustomerName(job.customer_name || "");
      setEditStartDate(job.start_date || "");

      let localTime = "";
      if (assignments.length > 0 && assignments[0].start_time) {
        const workDate = assignments[0].work_date || job.start_date;
        localTime = convertUTCTimeToLocal(assignments[0].start_time, workDate);
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
      const res = await fetch(`/api/jobs/${reminderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error("Failed to update reminder");

      const updatedJob = await res.json();
      setJob(updatedJob);

      if (editStartTime.trim()) {
        const workDate = editStartDate || job.start_date;
        const utcTime = convertLocalTimeToUTC(editStartTime.trim(), workDate);

        if (!utcTime) {
          alert("Invalid time format. The reminder details were updated, but the time was not changed.");
        } else if (assignments.length > 0) {
          const updatePromises = assignments.map(async (assignment) => {
            try {
              const res = await fetch(`/api/job-assignments/${reminderId}/${assignment.associates.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ start_time: utcTime, work_date: workDate }),
              });

              if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to update assignment for ${assignment.associates.first_name}`);
              }
              return res.json();
            } catch (error) {
              console.error(`Failed to update assignment:`, error);
              throw error;
            }
          });

          try {
            await Promise.all(updatePromises);
          } catch (error) {
            alert(`Failed to update some assignments: ${error instanceof Error ? error.message : "Unknown error"}`);
          }
        }
      }

      await refreshAssignments();
      setShowEditModal(false);
    } catch (error) {
      console.error("Failed to update reminder:", error);
      alert("Failed to update reminder. Please try again.");
    }
  };

  const handleAddAssociate = () => {
    setShowAddModal(true);
  };

  const handleAddSuccess = async () => {
    await refreshAssignments();
  };

  return {
    // State
    job,
    assignments,
    loading,
    showEditModal,
    editJobTitle,
    editCustomerName,
    editStartDate,
    editStartTime,
    processingReminders,
    reminderStatus,
    showAddModal,
    // Actions
    setEditJobTitle,
    setEditCustomerName,
    setEditStartDate,
    setEditStartTime,
    setShowEditModal,
    setShowAddModal,
    setReminderStatus,
    handleDeleteAssociate,
    handleProcessReminders,
    handleEditClick,
    handleUpdateReminder,
    handleAddAssociate,
    handleAddSuccess,
    refreshAssignments,
  };
}

