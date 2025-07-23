import React, { useState, useEffect } from 'react';
import JobTableHeader from './jobTableHeader';
import JobTableHeadRow from './jobTableHeadRow';
import JobTableRow from './jobTableRow';

interface Job {
  id: string;
  job_title: string;
  customer_name: string;
  job_status: string;
  start_date: string;
}

const JobTable = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    fetchJobs();
  }, []);

  

  const handleAddJob = () => {
    const newJob: Job = {
      id: crypto.randomUUID(),
      job_title: 'Warehouse Job',
      customer_name: 'John Worker',
      job_status: 'active',
      start_date: new Date().toISOString().slice(0, 10),
    };
    setJobs([...jobs, newJob]);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto px-4 mt-24 overflow-x-auto">
      <JobTableHeader onFileSelect={(file) => console.log('Selected file:', file)} />
      <table className="w-full table-fixed border-collapse bg-white rounded-lg overflow-hidden min-w-[800px]">
        <thead>
          <JobTableHeadRow />
        </thead>
        <tbody>
          {jobs.map((job) => (
            <JobTableRow key={job.id} job={job} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default JobTable;
