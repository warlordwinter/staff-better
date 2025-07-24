import React, { useState } from 'react';
import Image from 'next/image';

interface Job {
  id: string;
  title: string;
  customerName: string;
  status: string;
  date: string;
}

interface Props {
  job: Job;
  onUpdate: (id: string, updatedJob: Partial<Job>) => void;
  onDelete: (id: string) => void;
}

const getStatusStyle = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active': return 'bg-emerald-50 text-green-600';
    case 'past': return 'bg-gray-100 text-gray-500';
    case 'upcoming': return 'bg-yellow-50 text-yellow-600';
    default: return 'bg-gray-50 text-gray-600';
  }
};

const JobTableRow: React.FC<Props> = ({ job, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedJob, setEditedJob] = useState(job);

  const handleEditClick = () => {
    if (isEditing) {
      onUpdate(job.id, editedJob);
    }
    setIsEditing(!isEditing);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedJob((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <tr className="hover:bg-gray-50 text-sm text-black border-b border-zinc-100">
      <td className="h-10 text-center">
        <input type="checkbox" className="w-4 h-4" />
      </td>

      <td className="px-4">
        {isEditing ? (
          <input
            name="title"
            value={editedJob.title}
            onChange={handleChange}
            className="border border-gray-300 rounded px-2 w-full"
          />
        ) : (
          job.title
        )}
      </td>

      <td className="px-4 text-blue-600">
        {isEditing ? (
          <input
            name="customerName"
            value={editedJob.customerName}
            onChange={handleChange}
            className="border border-gray-300 rounded px-2 w-full"
          />
        ) : (
          job.customerName
        )}
      </td>

      <td className="px-4">
        <span className={`px-2 py-0.5 rounded-sm text-xs font-bold uppercase ${getStatusStyle(job.status)}`}>
          {job.status}
        </span>
      </td>

      <td className="px-4">
        {isEditing ? (
          <input
            name="date"
            type="date"
            value={editedJob.date}
            onChange={handleChange}
            className="border border-gray-300 rounded px-2 w-full"
          />
        ) : (
          job.date
        )}
      </td>

      <td className="px-2 text-center">
        <div className="flex gap-2 justify-center items-center">
          <button onClick={handleEditClick}>
            <Image
              src="/icons/edit.svg"
              alt="Edit"
              width={16}
              height={16}
              className="cursor-pointer"
            />
          </button>
          <button onClick={() => onDelete(job.id)}>
            <Image
              src="/icons/trash.svg"
              alt="Delete"
              width={16}
              height={16}
              className="cursor-pointer"
            />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default JobTableRow;
