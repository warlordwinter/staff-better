import React, { useState } from 'react';
import JobTableHeader from './jobTableHeader';
import JobTableHeadRow from './JobTableHeadRow';
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
    const newCustomer = 'John Worker';
    const newJob: Job = {
      id: crypto.randomUUID(),
      title: 'Warehouse Job',
      customerName: newCustomer,
      status: 'active',
      date: new Date().toISOString().slice(0, 10),
    };
    setJobs([...jobs, newJob]);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto m-24">
    <JobTableHeader onFileSelect={(file) => console.log('Selected file:', file)} />

      <div className="w-full rounded-lg bg-white overflow-hidden">
        <JobTableHeadRow />
        {jobs.map((job) => (
          <JobTableRow key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
};

export default JobTable;
