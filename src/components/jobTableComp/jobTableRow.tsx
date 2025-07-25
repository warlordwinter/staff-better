import React from 'react';
import { Job } from '@/model/interfaces/job';

const getStatusStyle = (job_status: string) => {
  switch (job_status.toLowerCase()) {
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
  <tr className="hover:bg-gray-50 text-sm text-black border-b border-zinc-100">
    <td className="h-10 text-center">
      <input type="checkbox" className="w-4 h-4" />
    </td>
    <td className="px-4">{job.job_title}</td>
    <td className="px-4 text-blue-600">{job.customer_name}</td>
    <td className="px-4">
      <span
        className={`px-2 py-0.5 rounded-sm text-xs font-bold uppercase ${getStatusStyle(job.job_status)}`}
      >
        {job.job_status}
      </span>
    </td>
    <td className="px-4">{job.start_date}</td>
  </tr>
);

export default JobTableRow;
