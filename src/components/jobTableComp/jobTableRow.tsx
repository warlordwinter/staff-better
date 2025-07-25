import React, { useState } from 'react';
import Image from 'next/image';
import { Job } from '@/model/interfaces/job';

interface Props {
  job: Job;
  onUpdate: (id: string, updatedJob: Partial<Job>) => void;
  onDelete: (id: string) => void;
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

const JobTableRow: React.FC<Props> = ({ job, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedJob, setEditedJob] = useState(job);

  const handleEditClick = () => setIsEditing(true);
  
  const handleSave = () => {
    onUpdate(job.id, editedJob);
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setEditedJob(job);
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedJob((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <tr className="hover:bg-gray-50 text-sm text-black border-b border-zinc-100 h-10">
      <td className="px-4">
        {isEditing ? (
          <input
            name="job_title"
            value={editedJob.job_title}
            onChange={handleChange}
            className="border border-gray-300 rounded px-2 w-full"
          />
        ) : (
          job.job_title
        )}
      </td>

      <td className="px-4 text-blue-600">
        {isEditing ? (
          <input
            name="customer_name"
            value={editedJob.customer_name}
            onChange={handleChange}
            className="border border-gray-300 rounded px-2 w-full"
          />
        ) : (
          job.customer_name
        )}
      </td>

      <td className="px-4">
        {isEditing ? (
          <select
            name="job_status"
            value={editedJob.job_status}
            onChange={handleChange}
            className="border border-gray-300 rounded px-2 w-full"
          >
            <option value="Active">Active</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Past">Past</option>
          </select>
        ) : (
          <span className={`px-2 py-0.5 rounded-sm text-xs font-bold uppercase ${getStatusStyle(job.job_status)}`}>
            {job.job_status}
          </span>
        )}
      </td>

      <td className="px-4">
        {isEditing ? (
          <input
            name="start_date"
            type="date"
            value={editedJob.start_date}
            onChange={handleChange}
            className="border border-gray-300 rounded px-2 w-full"
          />
        ) : (
          job.start_date
        )}
      </td>

      <td className="px-2 min-w-[120px] text-center">
        {isEditing ? (
          <div className="flex gap-1 justify-center items-center">
            <button
              onClick={handleSave}
              className="px-1.5 py-0.5 text-[11px] bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-1.5 py-0.5 text-[11px] bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-2 justify-center items-center">
            <button onClick={handleEditClick} title="Edit">
              <Image
                src="/icons/edit.svg"
                alt="Edit"
                width={16}
                height={16}
                className="cursor-pointer"
              />
            </button>
            <button onClick={() => onDelete(job.id)} title="Delete">
              <Image
                src="/icons/trash.svg"
                alt="Delete"
                width={16}
                height={16}
                className="cursor-pointer"
              />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
};

export default JobTableRow;