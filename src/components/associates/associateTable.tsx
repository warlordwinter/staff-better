"use client";
import React, { useState, useEffect } from "react";
import { AssociateTableHeader } from "./associateTableHeader";
import { AssociateTableRow } from "./associateTableRow";
import { AssociateTableTitle } from "./associateTableTitle";
import { Associate } from "@/model/interfaces/Associate";
import { JobAssignment } from "@/model/interfaces/JobAssignment";
import { Job } from "@/model/interfaces/Job";
import { ConfirmationStatus } from "@/model/enums/ConfirmationStatus";

// Combined interface for display purposes
interface AssociateDisplay extends Associate {
  // JobAssignment fields for display
  confirmation_status?: string;
  num_reminders?: number;
  job_work_date?: string;
  job_start_time?: string;
}

interface AssociateTableProps {
  jobId?: string; // Optional job ID if showing assignments for a specific job
  job?: Job; // Optional job data for display purposes
}

export default function AssociateTable({ jobId, job }: AssociateTableProps) {
  const [associatesData, setAssociatesData] = useState<AssociateDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        
        if (jobId) {
          console.log('Fetching job assignments for job ID:', jobId);
          
          // Fetch job assignments for a specific job
          const res = await fetch(`/api/job-assignments/${jobId}`);
          
          if (!res.ok) {
            const errorText = await res.text();
            console.error('API Error:', errorText);
            throw new Error(`Failed to fetch job assignments: ${res.status}`);
          }
          
          const assignments = await res.json();
          console.log('Raw assignments data:', assignments);
          
          // Handle case where there are no assignments yet
          if (!assignments || assignments.length === 0) {
            console.log('No job assignments found for this job');
            setAssociatesData([]);
            return;
          }
          
          // Transform the data to match display format
          const displayData: AssociateDisplay[] = assignments.map((assignment: any) => {
            console.log('Processing assignment:', assignment);
            
            if (!assignment.associates) {
              console.error('No associates data found in assignment:', assignment);
              return null;
            }
            
            return {
              id: assignment.associates.id,
              first_name: assignment.associates.first_name,
              last_name: assignment.associates.last_name,
              // Use the associate's default work_date and start_time for the base Associate fields
              work_date: assignment.associates.work_date,
              start_time: assignment.associates.start_time,
              phone_number: assignment.associates.phone_number,
              email_address: assignment.associates.email_address,
              // Job assignment specific fields
              confirmation_status: assignment.confirmation_status,
              num_reminders: assignment.num_reminders,
              // Use the assignment-specific work_date and start_time for the job
              job_work_date: assignment.work_date,
              job_start_time: assignment.start_time,
            };
          }).filter(Boolean); // Remove any null entries
          
          setAssociatesData(displayData);
        } else {
          // Fetch all associates
          const res = await fetch('/api/associates');
          
          if (!res.ok) {
            throw new Error('Failed to fetch associates');
          }
          
          const associates = await res.json();
          setAssociatesData(associates);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [jobId]);

  const handleSave = async (index: number, updatedData: AssociateDisplay) => {
    try {
      const associate = associatesData[index];
      
      // Update the associate
      const associateUpdates = {
        first_name: updatedData.first_name,
        last_name: updatedData.last_name,
        work_date: updatedData.work_date,
        start_time: updatedData.start_time,
        phone_number: updatedData.phone_number,
        email_address: updatedData.email_address,
      };

      const associateRes = await fetch(`/api/associates/${associate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(associateUpdates),
      });

      if (!associateRes.ok) {
        throw new Error('Failed to update associate');
      }

      // If we have job assignment data, update that too
      if (jobId && (updatedData.confirmation_status !== undefined || updatedData.num_reminders !== undefined)) {
        const assignmentUpdates = {
          confirmation_status: updatedData.confirmation_status,
          num_reminders: updatedData.num_reminders,
          work_date: updatedData.job_work_date,
          start_time: updatedData.job_start_time,
        };

        const assignmentRes = await fetch(`/api/job-assignments/${jobId}/${associate.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(assignmentUpdates),
        });

        if (!assignmentRes.ok) {
          throw new Error('Failed to update job assignment');
        }
      }

      // Update local state
      setAssociatesData(prev => 
        prev.map((associate, i) => 
          i === index ? { ...associate, ...updatedData } : associate
        )
      );

      console.log('Updated data at index', index, ':', updatedData);
    } catch (error) {
      console.error('Failed to save:', error);
      setError('Failed to save changes');
    }
  };

  const handleDelete = async (index: number) => {
    if (!window.confirm('Are you sure you want to delete this associate?')) {
      return;
    }

    try {
      const associate = associatesData[index];

      if (jobId) {
        // Delete job assignment
        const res = await fetch(`/api/job-assignments/${jobId}/${associate.id}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          throw new Error('Failed to delete job assignment');
        }
      } else {
        // Delete associate entirely
        const res = await fetch(`/api/associates/${associate.id}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          throw new Error('Failed to delete associate');
        }
      }

      // Update local state
      setAssociatesData(prev => prev.filter((_, i) => i !== index));
      console.log('Deleted associate at index:', index);
    } catch (error) {
      console.error('Failed to delete:', error);
      setError('Failed to delete');
    }
  };

  const handleAdd = async () => {
    try {
      if (jobId) {
        // For job assignments, we'd typically show a modal to select an existing associate
        // or create a new one. For now, let's create a new associate and assign them
        const newAssociate = {
          first_name: "",
          last_name: "",
          work_date: new Date().toISOString().slice(0, 10),
          start_time: "08:00",
          phone_number: "",
          email_address: "",
        };

        // Create the associate first
        const associateRes = await fetch('/api/associates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newAssociate),
        });

        if (!associateRes.ok) {
          throw new Error('Failed to create associate');
        }

        const createdAssociate = await associateRes.json();

        // Then create the job assignment
        const newAssignment = {
          job_id: jobId,
          associate_id: createdAssociate[0].id,
          confirmation_status: "unconfirmed",
          work_date: new Date().toISOString().slice(0, 10),
          start_time: "08:00",
          num_reminders: 0,
        };

        const assignmentRes = await fetch(`/api/job-assignments/job/${jobId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newAssignment),
        });

        if (!assignmentRes.ok) {
          throw new Error('Failed to create job assignment');
        }

        // Add to local state
        const displayAssociate: AssociateDisplay = {
          ...createdAssociate[0],
          confirmation_status: "unconfirmed",
          num_reminders: 0,
          job_work_date: new Date().toISOString().slice(0, 10),
          job_start_time: "08:00",
        };

        setAssociatesData(prev => [...prev, displayAssociate]);
      } else {
        // Just create a new associate
        const newAssociate = {
          first_name: "",
          last_name: "",
          work_date: new Date().toISOString().slice(0, 10),
          start_time: "08:00",
          phone_number: "",
          email_address: "",
        };

        const res = await fetch('/api/associates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newAssociate),
        });

        if (!res.ok) {
          throw new Error('Failed to create associate');
        }

        const createdAssociate = await res.json();
        setAssociatesData(prev => [...prev, createdAssociate[0]]);
      }

      console.log('Added new associate');
    } catch (error) {
      console.error('Failed to add associate:', error);
      setError('Failed to add associate');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
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
          {jobId ? "No associates assigned to this job yet." : "No associates found."}
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
                />
              ))}
            </tbody>
          </table>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-2 mt-2 mb-2">
          </div>
        </>
      )}
    </div>
  );
}