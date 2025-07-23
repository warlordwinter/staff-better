import React, { useState } from 'react';
import JobTableHeader from './jobTableHeader';
import JobTableHeadRow from './jobTableHeadRow';
import JobTableRow from './jobTableRow';

interface Job {
  id: string;
  title: string;
  customerName: string;
  status: string;
  date: string;
}

const JobTable = () => {
  const [jobs, setJobs] = useState<Job[]>([
    {
      id: '1',
      title: 'Airport Job',
      customerName: 'Sarah Eastern',
      status: 'active',
      date: '2023/09/17',
    },
  ]);

  const handleAddJob = () => {
    const newJob: Job = {
      id: crypto.randomUUID(),
      title: 'Warehouse Job',
      customerName: 'John Worker',
      status: 'active',
      date: new Date().toISOString().slice(0, 10),
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
