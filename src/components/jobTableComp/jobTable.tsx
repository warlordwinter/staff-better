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
  const [associates, setAssociates] = useState<Associate[]>([]);

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
    // Fetch associates for dropdown
    (async () => {
      try {
        const res = await fetch("/api/associates");
        const data = await res.json();
        if (Array.isArray(data)) {
          setAssociates(data);
        } else {
          console.error("Unexpected associates data:", data);
        }
      } catch (e) {
        console.error("Failed to fetch associates", e);
      }
    })();
  }, []);

  const handleAddJob = () => {
    const newJob = {
      id: `temp-${Date.now()}`, // Temporary ID for new jobs
      title: "",
      location: "",
      client_company: "",
      company_id: "", // Server will set based on auth user
      associate_id: null,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: null,
      pay_rate: null,
      incentive_bonus: null,
      num_reminders: null,
      job_status: "UPCOMING",
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
        // Shape payload: omit id and isNew and company_id; coerce number fields
        const {
          id: _omitId,
          isNew: _omitIsNew,
          company_id: _omitCompany,
          ...rest
        } = updatedFields as any;
        const payload: any = {
          ...rest,
        };
        if (payload.pay_rate !== undefined) {
          payload.pay_rate =
            payload.pay_rate === null || payload.pay_rate === ""
              ? null
              : Number(payload.pay_rate);
        }
        if (payload.incentive_bonus !== undefined) {
          payload.incentive_bonus =
            payload.incentive_bonus === null || payload.incentive_bonus === ""
              ? null
              : Number(payload.incentive_bonus);
        }
        if (payload.num_reminders !== undefined) {
          payload.num_reminders =
            payload.num_reminders === null || payload.num_reminders === ""
              ? null
              : parseInt(payload.num_reminders as any, 10);
        }
        if (payload.job_status) {
          // Align to DB enum
          const up = String(payload.job_status).toUpperCase();
          payload.job_status = [
            "UPCOMING",
            "ONGOING",
            "COMPLETED",
            "CANCELLED",
          ].includes(up)
            ? up
            : "UPCOMING";
        }

        const res = await fetch("/api/jobs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
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
        // Shape update payload
        const {
          id: _omitId2,
          company_id: _omitCompany2,
          isNew: _omitIsNew2,
          ...rest
        } = updatedFields as any;
        const payload: any = { ...rest };
        if (payload.pay_rate !== undefined) {
          payload.pay_rate =
            payload.pay_rate === null || payload.pay_rate === ""
              ? null
              : Number(payload.pay_rate);
        }
        if (payload.incentive_bonus !== undefined) {
          payload.incentive_bonus =
            payload.incentive_bonus === null || payload.incentive_bonus === ""
              ? null
              : Number(payload.incentive_bonus);
        }
        if (payload.num_reminders !== undefined) {
          payload.num_reminders =
            payload.num_reminders === null || payload.num_reminders === ""
              ? null
              : parseInt(payload.num_reminders as any, 10);
        }
        if (payload.job_status) {
          const up = String(payload.job_status).toUpperCase();
          payload.job_status = [
            "UPCOMING",
            "ONGOING",
            "COMPLETED",
            "CANCELLED",
          ].includes(up)
            ? up
            : undefined;
        }

        const res = await fetch(`/api/jobs/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const responseData = await res.json();

        if (!res.ok) {
          console.error("Job update failed:", responseData);
          throw new Error(responseData.error || "Failed to update job");
        }

        console.log("Job updated successfully:", responseData);

        // Update local state
        setJobs((prev) =>
          prev.map((job) => (job.id === id ? { ...job, ...payload } : job))
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
      <table className="w-full table-auto border-collapse bg-white rounded-lg overflow-hidden min-w-[1200px]">
        <thead>
          <JobTableHeadRow />
        </thead>
        <tbody>
          {Array.isArray(jobs) &&
            jobs.map((job) => (
              <JobTableRow
                key={job.id}
                job={job}
                associates={associates}
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
