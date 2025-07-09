import React from 'react';

interface Job {
  id: string;
  title: string;
  customerName: string;
  status: string;
  date: string;
}

const getStatusStyle = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-emerald-50 text-green-600';
    case 'past':
      return 'bg-gray-100 text-gray-500';
    case 'upcoming':
      return 'bg-yellow-50 text-yellow-600';
    default:
      return 'bg-gray-50 text-gray-600';
  }
};

const JobTableRow: React.FC<{ job: Job }> = ({ job }) => (
  <div className="grid grid-cols-[3rem_1.5fr_1.5fr_1fr_1fr] hover:bg-gray-50">
    <div className="flex items-center justify-center h-10">
      <input type="checkbox" className="w-4 h-4" />
    </div>
    <div className="flex items-center px-4 h-10 text-sm text-black">{job.title}</div>
    <div className="flex items-center px-4 h-10 gap-2">
      <span className="text-blue-600 text-sm">{job.customerName}</span>
    </div>
    <div className="flex items-center px-4 h-10">
      <span className={`px-2 py-0.5 rounded-sm text-xs font-bold uppercase ${getStatusStyle(job.status)}`}>
        {job.status}
      </span>
    </div>
    <div className="flex items-center px-4 h-10 text-sm text-black">{job.date}</div>
  </div>
);

export default JobTableRow;
