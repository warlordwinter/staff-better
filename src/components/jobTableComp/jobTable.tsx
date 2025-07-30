import React, { useState, useEffect } from 'react';
import JobTableHeader from './jobTableHeader';
import JobTableHeadRow from './jobTableHeadRow';
import JobTableRow from './jobTableRow';
import { Job } from '@/model/interfaces/Job';
import { JobAssignment } from '@/model/interfaces/JobAssignment';
import { Associate } from '@/model/interfaces/Associate';

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
      setJobs(data);
    } catch (err) {
      console.error("Failed to fetch jobs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleAddJob = async () => {
    const newJob = {
      job_title: 'Warehouse Job',
      customer_name: 'John Worker',
      job_status: 'Active',
      start_date: new Date().toISOString().slice(0, 10),
    };

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newJob),
      });

      if (!res.ok) {
        throw new Error('Failed to create job');
      }

      const createdJob = await res.json();
      setJobs([createdJob[0], ...jobs]);
    } catch (error) {
      console.error('Failed to add job:', error);
      // You might want to show a toast notification here
    }
  };

  const handleUpdateJob = async (id: string, updatedFields: Partial<Job>) => {
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedFields),
      });

      if (!res.ok) {
        throw new Error('Failed to update job');
      }

      // const updatedJob = await res.json();
      
      // Update local state
      setJobs((prev) =>
        prev.map((job) => (job.id === id ? { ...job, ...updatedFields } : job))
      );
    } catch (error) {
      console.error('Failed to update job:', error);
      // You might want to show a toast notification here
    }
  };

  const handleDeleteJob = async (id: string) => {
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete job');
      }

      // Update local state
      setJobs((prev) => prev.filter((job) => job.id !== id));
    } catch (error) {
      console.error('Failed to delete job:', error);
      // You might want to show a toast notification here
    }
  };

  const handleUploadComplete = async (result: UploadResult) => {
    if (result.success) {
      console.log(`Successfully uploaded ${result.rowsProcessed} rows`);
      // Refresh the jobs list to show the newly uploaded jobs
      await fetchJobs();
      // You might want to show a success toast notification here
    } else {
      console.error('Upload failed:', result.error);
      // You might want to show an error toast notification here
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto px-4 mt-24 overflow-x-auto">
      <JobTableHeader 
        onFileSelect={(file) => console.log('Selected file:', file)} 
        onAddManually={handleAddJob}
        onUploadComplete={handleUploadComplete}
      />
      <table className="w-full table-fixed border-collapse bg-white rounded-lg overflow-hidden min-w-[800px]">
        <thead>
          <JobTableHeadRow  />
        </thead>
        <tbody>
          {jobs.map((job) => (
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