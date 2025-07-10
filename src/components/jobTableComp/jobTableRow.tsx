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
  <tr className="hover:bg-gray-50 text-sm text-black border-b border-zinc-100">
    <td className="h-10 text-center">
      <input type="checkbox" className="w-4 h-4" />
    </td>
    <td className="px-4">{job.title}</td>
    <td className="px-4 text-blue-600">{job.customerName}</td>
    <td className="px-4">
      <span
        className={`px-2 py-0.5 rounded-sm text-xs font-bold uppercase ${getStatusStyle(job.status)}`}
      >
        {job.status}
      </span>
    </td>
    <td className="px-4">{job.date}</td>
  </tr>
);

export default JobTableRow;
