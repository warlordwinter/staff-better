"use client";
import React, { useState, useEffect } from "react";
import { AssociateTableHeader } from "./associateTableHeader";
import { AssociateTableRow } from "./associateTableRow";
import { AssociateTableTitle } from "./associateTableTitle";
import { Associate } from "@/model/interfaces/Associate";
import { Job } from "@/model/interfaces/Job";
import LoadingSpinner from "../ui/loadingSpinner";
import {
  convertLocalTimeToUTC,
  convertUTCTimeToLocal,
} from "@/utils/timezoneUtils";

interface JobAssignmentResponse {
  confirmation_status: string;
  num_reminders: number;
  work_date: string;
  start_time: string; // UTC from database
  associates: {
    id: string;
    first_name: string;
    last_name: string;
    work_date: string;
    start_time: string; // UTC from database
    phone_number: string;
    email_address: string;
  };
}

// Combined interface for display purposes
interface AssociateDisplay extends Associate {
  // JobAssignment fields for display
  confirmation_status?: string;
  num_reminders?: number;
  job_work_date?: string;
  job_start_time?: string; // Local time for display
  isNew?: boolean; // Track if this is a new unsaved associate
}

interface AssociateTableProps {
  jobId?: string; // Optional job ID if showing assignments for a specific job
  job?: Job; // Optional job data for display purposes
}

export default function AssociateTable({ jobId, job }: AssociateTableProps) {
  const [associatesData, setAssociatesData] = useState<AssociateDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);

        if (jobId) {
          console.log("Fetching job assignments for job ID:", jobId);

          const res = await fetch(`/api/job-assignments/${jobId}`);
          if (!res.ok) {
            const errorText = await res.text();
            console.error("API Error:", errorText);
            throw new Error(`Failed to fetch job assignments: ${res.status}`);
          }

          const assignments = await res.json();
          console.log("Raw assignments data:", assignments);

          if (!assignments || assignments.length === 0) {
            console.log("No job assignments found for this job");
            setAssociatesData([]);
            return;
          }

          const displayData: AssociateDisplay[] = assignments
            .map((assignment: JobAssignmentResponse) => {
              if (!assignment.associates) {
                console.error(
                  "No associates data found in assignment:",
                  assignment
                );
                return null;
              }

              // Convert UTC times from database to local times for display (pass date strings)
              const localJobTime = convertUTCTimeToLocal(
                assignment.start_time,
                assignment.work_date
              );

              return {
                id: assignment.associates.id,
                first_name: assignment.associates.first_name,
                last_name: assignment.associates.last_name,
                work_date: assignment.work_date,
                start_date: localJobTime, // Local time for display
                phone_number: assignment.associates.phone_number,
                email_address: assignment.associates.email_address,
                // Job assignment specific fields
                confirmation_status: assignment.confirmation_status,
                num_reminders: assignment.num_reminders,
                job_work_date: assignment.work_date,
                job_start_time: localJobTime, // Local time for display
              };
            })
            .filter(Boolean) as AssociateDisplay[];

          setAssociatesData(displayData);
        } else {
          // Fetch all associates
          const res = await fetch("/api/associates");
          if (!res.ok) {
            throw new Error("Failed to fetch associates");
          }
          const utcAssociates = await res.json();

          // Convert UTC times to local times for display
          const localAssociates = utcAssociates.map((associate: Associate) => ({
            ...associate,
            start_date: associate.start_date
              ? convertUTCTimeToLocal(
                  associate.start_date,
                  associate.work_date || ""
                )
              : "",
          }));

          setAssociatesData(localAssociates);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setError(
          error instanceof Error ? error.message : "Failed to fetch data"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [jobId]);

  const handleSave = async (index: number, updatedData: AssociateDisplay) => {
    try {
      const associate = associatesData[index];
      const isNewAssociate = associate.isNew;

      // Convert local times to UTC before sending to API
      const utcAssociateTime = convertLocalTimeToUTC(
        updatedData.start_date ?? undefined,
        updatedData.work_date ?? new Date().toISOString().split("T")[0]
      );

      let savedAssociate;

      if (isNewAssociate) {
        // Create new associate in database
        const associateRes = await fetch("/api/associates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: updatedData.first_name,
            last_name: updatedData.last_name,
            work_date: updatedData.work_date,
            start_date: utcAssociateTime, // UTC for API
            phone_number: updatedData.phone_number,
            email_address: updatedData.email_address,
          }),
        });
        if (!associateRes.ok) throw new Error("Failed to create associate");
        const createdAssociate = await associateRes.json();
        savedAssociate = createdAssociate[0];

        // Create job assignment if in job context
        if (jobId) {
          const utcJobTime = convertLocalTimeToUTC(
            updatedData.job_start_time || (updatedData.start_date ?? undefined),
            updatedData.job_work_date ||
              (updatedData.work_date ?? new Date().toISOString().split("T")[0])
          );

          const assignmentRes = await fetch(`/api/job-assignments/${jobId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              job_id: jobId,
              associate_id: savedAssociate.id,
              confirmation_status:
                updatedData.confirmation_status || "UNCONFIRMED",
              work_date: updatedData.job_work_date || updatedData.work_date,
              start_time: utcJobTime, // UTC for API
              num_reminders: updatedData.num_reminders || 0,
            }),
          });
          if (!assignmentRes.ok)
            throw new Error("Failed to create job assignment");
        }
      } else {
        // Update existing associate
        const associateUpdates = {
          first_name: updatedData.first_name,
          last_name: updatedData.last_name,
          work_date: updatedData.work_date,
          start_date: utcAssociateTime, // UTC for API
          phone_number: updatedData.phone_number,
          email_address: updatedData.email_address,
        };

        const associateRes = await fetch(`/api/associates/${associate.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(associateUpdates),
        });
        if (!associateRes.ok) throw new Error("Failed to update associate");

        // Update job assignment if present
        if (
          jobId &&
          (updatedData.confirmation_status !== undefined ||
            updatedData.num_reminders !== undefined ||
            updatedData.job_work_date ||
            updatedData.job_start_time)
        ) {
          const utcJobTime = convertLocalTimeToUTC(
            updatedData.job_start_time || (updatedData.start_date ?? undefined),
            updatedData.job_work_date ||
              (updatedData.work_date ?? new Date().toISOString().split("T")[0])
          );

          const assignmentUpdates = {
            confirmation_status: updatedData.confirmation_status,
            num_reminders: updatedData.num_reminders,
            work_date: updatedData.job_work_date || updatedData.work_date,
            start_time: utcJobTime, // UTC for API
          };

          const assignmentRes = await fetch(
            `/api/job-assignments/${jobId}/${associate.id}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(assignmentUpdates),
            }
          );
          if (!assignmentRes.ok)
            throw new Error("Failed to update job assignment");
        }
      }

      // Update local state with saved data (keep local times for display)
      const finalData = isNewAssociate
        ? { ...savedAssociate, ...updatedData, isNew: false }
        : { ...associate, ...updatedData };

      setAssociatesData((prev) =>
        prev.map((a, i) => (i === index ? finalData : a))
      );

      // Remove from newly added list since it's been saved
      setNewlyAddedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(associate.id);
        return newSet;
      });

      console.log("Saved data at index", index, ":", updatedData);
    } catch (error) {
      console.error("Failed to save:", error);
      setError("Failed to save changes");
    }
  };

  const handleDelete = async (index: number) => {
    const associate = associatesData[index];
    const isNewAssociate = associate.isNew;

    if (isNewAssociate) {
      // For new associates, just remove from local state
      setAssociatesData((prev) => prev.filter((_, i) => i !== index));
      setNewlyAddedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(associate.id);
        return newSet;
      });
      console.log("Removed new associate at index:", index);
      return;
    }

    // For existing associates, confirm deletion and delete from database
    if (!window.confirm("Are you sure you want to delete this associate?"))
      return;

    try {
      if (jobId) {
        const res = await fetch(
          `/api/job-assignments/${jobId}/${associate.id}`,
          {
            method: "DELETE",
          }
        );
        if (!res.ok) throw new Error("Failed to delete job assignment");
      }

      const res = await fetch(`/api/associates/${associate.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete associate");

      setAssociatesData((prev) => prev.filter((_, i) => i !== index));
      console.log("Deleted associate at index:", index);
    } catch (error) {
      console.error("Failed to delete:", error);
      setError("Failed to delete");
    }
  };

  const handleAdd = () => {
    const localTime = "08:00"; // default local
    const workDate = new Date();
    const yyyy = workDate.getFullYear();
    const mm = String(workDate.getMonth() + 1).padStart(2, "0");
    const dd = String(workDate.getDate()).padStart(2, "0");
    const workDateISO = `${yyyy}-${mm}-${dd}`;

    // Create a temporary local-only associate
    const tempId = `temp-${Date.now()}`; // Generate temporary ID
    const newAssociate: AssociateDisplay = {
      id: tempId,
      first_name: "",
      last_name: "",
      work_date: workDateISO,
      start_date: localTime,
      phone_number: "",
      email_address: "",
      isNew: true, // Mark as new unsaved associate
      // Job assignment fields if in job context
      ...(jobId && {
        confirmation_status: "UNCONFIRMED",
        num_reminders: 0,
        job_work_date: workDateISO,
        job_start_time: localTime,
      }),
    };

    // Add to local state and mark for editing
    setAssociatesData((prev) => [...prev, newAssociate]);
    setNewlyAddedIds((prev) => new Set([...prev, tempId]));

    console.log("Added new associate for editing");
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 h-screen">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 overflow-x-auto">
      <AssociateTableTitle job={job} onAdd={handleAdd} />
      {associatesData.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {jobId
            ? "No associates assigned to this job yet."
            : "No associates found."}
          <br />
          <button
            onClick={handleAdd}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Associate
          </button>
        </div>
      ) : (
        <>
          <table className="w-full table-auto border-collapse mt-4">
            <thead>
              <AssociateTableHeader showJobAssignmentColumns={!!jobId} />
            </thead>
            <tbody>
              {associatesData.map((associate, index) => (
                <AssociateTableRow
                  key={associate.id}
                  data={associate}
                  index={index}
                  onSave={(updatedData) => handleSave(index, updatedData)}
                  onDelete={() => handleDelete(index)}
                  showJobAssignmentColumns={!!jobId}
                  isEditing={newlyAddedIds.has(associate.id)}
                />
              ))}
            </tbody>
          </table>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-2 mt-2 mb-2" />
        </>
      )}
    </div>
  );
}
