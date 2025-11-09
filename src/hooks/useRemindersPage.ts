import { useState, useEffect, useCallback } from "react";
import { Job } from "@/model/interfaces/Job";
import { convertLocalTimeToUTC } from "@/utils/timezoneUtils";

export interface JobWithCount extends Job {
  associateCount?: number;
}

export interface UseRemindersPageReturn {
  // State
  jobs: JobWithCount[];
  loading: boolean;
  searchQuery: string;
  showAddModal: boolean;
  newJobTitle: string;
  newCustomerName: string;
  newStartDate: string;
  newStartTime: string;

  // Computed
  filteredJobs: JobWithCount[];
  scheduledCount: number;
  sentCount: number;
  confirmedCount: number;

  // Actions
  setSearchQuery: (query: string) => void;
  setShowAddModal: (show: boolean) => void;
  setNewJobTitle: (title: string) => void;
  setNewCustomerName: (name: string) => void;
  setNewStartDate: (date: string) => void;
  setNewStartTime: (time: string) => void;
  loadJobs: () => Promise<void>;
  createReminder: (
    jobTitle: string,
    customerName: string,
    startDate: string,
    startTime: string
  ) => Promise<void>;
  deleteReminder: (jobId: string) => Promise<void>;
  resetForm: () => void;
}

export function useRemindersPage(
  isAuthenticated: boolean,
  authLoading: boolean
): UseRemindersPageReturn {
  const [jobs, setJobs] = useState<JobWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("");

  // Fetch jobs and their associate counts
  const loadJobs = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadJobs();
    }
  }, [authLoading, isAuthenticated, loadJobs]);

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

  // Create new reminder
  const createReminder = async (
    jobTitle: string,
    customerName: string,
    startDate: string,
    startTime: string
  ) => {
    if (!jobTitle.trim()) return;

    // Format start_time if provided (convert local time to UTC timestamp)
    let formattedStartTime: string | null = null;
    if (startTime && startTime.trim()) {
      const workDate = startDate || new Date().toISOString().slice(0, 10);

      // Convert local time input (HH:MM) to UTC time (HH:MM)
      const utcTime = convertLocalTimeToUTC(startTime.trim(), workDate);
      console.log(
        `Converting start_time: "${startTime}" (local) -> "${utcTime}" (UTC) for date ${workDate}`
      );

      if (utcTime) {
        // Create full UTC timestamp: "YYYY-MM-DDTHH:mm:00Z"
        // Ensure utcTime is in HH:mm format (it should be from convertLocalTimeToUTC)
        formattedStartTime = `${workDate}T${utcTime}:00Z`;
        console.log(
          `Formatted start_time timestamp: ${formattedStartTime} (from local "${startTime}" on ${workDate})`
        );
      } else {
        console.warn(
          `Failed to convert start_time "${startTime}" to UTC for date ${workDate}`
        );
      }
    } else {
      console.log("No start_time provided or empty");
    }

    const newJob = {
      job_title: jobTitle.trim(),
      customer_name: customerName.trim() || "Generic Company Name",
      job_status: "ACTIVE",
      start_date: startDate || new Date().toISOString().slice(0, 10),
      start_time: formattedStartTime,
    };

    console.log("Job to create:", JSON.stringify(newJob, null, 2));

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newJob),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Failed to create reminder - API response:", {
          status: res.status,
          statusText: res.statusText,
          error: errorData,
        });
        throw new Error(
          errorData.error ||
            "Failed to create reminder. Please check the console for details."
        );
      }

      const createdJob = await res.json();
      console.log(
        "Successfully created job:",
        JSON.stringify(createdJob, null, 2)
      );

      // Refresh the jobs list
      await loadJobs();
      resetForm();
    } catch (error) {
      console.error("Failed to add reminder:", error);
      throw error;
    }
  };

  // Delete reminder
  const deleteReminder = async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
      } else {
        throw new Error("Failed to delete reminder");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      throw error;
    }
  };

  // Reset form
  const resetForm = () => {
    setShowAddModal(false);
    setNewJobTitle("");
    setNewCustomerName("");
    setNewStartDate("");
    setNewStartTime("");
  };

  return {
    // State
    jobs,
    loading,
    searchQuery,
    showAddModal,
    newJobTitle,
    newCustomerName,
    newStartDate,
    newStartTime,
    // Computed
    filteredJobs,
    scheduledCount,
    sentCount,
    confirmedCount,
    // Actions
    setSearchQuery,
    setShowAddModal,
    setNewJobTitle,
    setNewCustomerName,
    setNewStartDate,
    setNewStartTime,
    loadJobs,
    createReminder,
    deleteReminder,
    resetForm,
  };
}
