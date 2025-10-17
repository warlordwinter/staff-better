"use client";

import React, { useState, useEffect } from "react";
import JobTableHeader from "./jobTableHeader";
import JobTableHeadRow from "./JobTableHeadRow";
import JobTableRow from "./jobTableRow";
import { Job } from "@/model/interfaces/Job";
import { JobAssignment } from "@/model/interfaces/JobAssignment";
import { Associate } from "@/model/interfaces/Associate";
import LoadingSpinner from "../ui/loadingSpinner";

// Use a type that matches what JobTableHeader expects
interface ExpectedUploadResult {
  success: boolean;
  data?: unknown;
  error?: string;
  rowsProcessed?: number;
}

// Your specific type for internal use
interface UploadResult {
  success: boolean;
  data?: {
    associateInsertion: Associate[];
    jobInsertion: Job[];
    jobAssignmentInsertion?: JobAssignment[];
  };
  error?: string;
  rowsProcessed?: number;
}

const JobTable = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();

      // Check if the response contains an error
      if (data.error) {
        console.error("API Error:", data.error);
        setJobs([]); // Set empty array on error
      } else if (Array.isArray(data)) {
        setJobs(data);
      } else {
        console.error("Unexpected data format:", data);
        setJobs([]); // Set empty array for unexpected format
      }
    } catch (err) {
      console.error("Failed to fetch jobs", err);
      setJobs([]); // Set empty array on network error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleAddJob = () => {
    const newJob = {
      id: `temp-${Date.now()}`, // Temporary ID for new jobs
      title: "",
      location: "",
      company_id: "", // Will be set when creating
      associate_id: null,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: null,
      pay_rate: null,
      incentive_bonus: null,
      num_reminders: null,
      job_status: "Upcoming",
      isNew: true, // Flag to indicate this is a new job
    };

    setJobs([newJob, ...jobs]);
  };

  const handleUpdateJob = async (id: string, updatedFields: Partial<Job>) => {
    const isNewJob = id.startsWith("temp-");

    try {
      if (isNewJob) {
        // Create new job
        console.log("Creating new job with data:", updatedFields);

        const res = await fetch("/api/jobs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedFields),
        });

        const responseData = await res.json();

        if (!res.ok) {
          console.error("Job creation failed:", responseData);
          throw new Error(responseData.error || "Failed to create job");
        }

        console.log("Job created successfully:", responseData);

        // Replace the temporary job with the created one
        setJobs((prev) =>
          prev.map((job) =>
            job.id === id ? { ...responseData[0], isNew: false } : job
          )
        );
      } else {
        // Update existing job
        console.log("Updating existing job:", id, "with data:", updatedFields);

        const res = await fetch(`/api/jobs/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedFields),
        });

        const responseData = await res.json();

        if (!res.ok) {
          console.error("Job update failed:", responseData);
          throw new Error(responseData.error || "Failed to update job");
        }

        console.log("Job updated successfully:", responseData);

        // Update local state
        setJobs((prev) =>
          prev.map((job) =>
            job.id === id ? { ...job, ...updatedFields } : job
          )
        );
      }
    } catch (error) {
      console.error("Failed to update job:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleDeleteJob = async (id: string) => {
    const isNewJob = id.startsWith("temp-");

    if (
      !isNewJob &&
      !window.confirm("Are you sure you want to delete this job?")
    ) {
      return;
    }

    try {
      if (!isNewJob) {
        // Delete existing job from database
        const res = await fetch(`/api/jobs/${id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          throw new Error("Failed to delete job");
        }
      }

      // Remove from local state (works for both new and existing jobs)
      setJobs((prev) => prev.filter((job) => job.id !== id));
    } catch (error) {
      console.error("Failed to delete job:", error);
      // You might want to show a toast notification here
    }
  };

  const handleUploadComplete = (result: ExpectedUploadResult) => {
    if (result.success) {
      console.log(`Successfully uploaded ${result.rowsProcessed} rows`);

      // Type guard to safely access the specific data structure
      if (
        result.data &&
        typeof result.data === "object" &&
        result.data !== null
      ) {
        const uploadData = result.data as UploadResult["data"];
        // Now you can safely access uploadData.associateInsertion, etc.
        console.log("Upload data:", uploadData);
      }

      // Refresh the jobs list to show the newly uploaded jobs
      fetchJobs();
      // You might want to show a success toast notification here
    } else {
      console.error("Upload failed:", result.error);
      // You might want to show an error toast notification here
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto px-4 mt-24 overflow-x-auto">
      <JobTableHeader
        onFileSelect={(file) => console.log("Selected file:", file)}
        onAddManually={handleAddJob}
        onUploadComplete={handleUploadComplete}
      />
      <table className="w-full table-fixed border-collapse bg-white rounded-lg overflow-hidden min-w-[800px]">
        <thead>
          <JobTableHeadRow />
        </thead>
        <tbody>
          {Array.isArray(jobs) &&
            jobs.map((job) => (
              <JobTableRow
                key={job.id}
                job={job}
                onUpdate={handleUpdateJob}
                onDelete={handleDeleteJob}
              />
            ))}
        </tbody>
      </table>
    </div>
  );
};

export default JobTable;
