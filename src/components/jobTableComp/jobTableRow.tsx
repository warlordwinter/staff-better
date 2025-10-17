"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Job } from "@/model/interfaces/Job";
import { Associate } from "@/model/interfaces/Associate";
import { useRouter } from "next/navigation";

interface Props {
  job: Job;
  associates: Associate[];
  onUpdate: (id: string, updatedJob: Partial<Job>) => void;
  onDelete: (id: string) => void;
}

const getStatusStyle = (status: string) => {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-emerald-50 text-green-600";
    case "past":
      return "bg-gray-100 text-gray-500";
    case "upcoming":
      return "bg-yellow-50 text-yellow-600";
    default:
      return "bg-gray-50 text-gray-600";
  }
};

const JobTableRow: React.FC<Props> = ({
  job,
  associates,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(job.isNew || false); // Start editing if it's a new job
  const [editedJob, setEditedJob] = useState(job);
  const router = useRouter();

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click when editing
    setIsEditing(true);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Validate required fields for new jobs
    if (job.isNew && (!editedJob.title.trim() || !editedJob.location?.trim())) {
      alert("Please fill in the job title and location");
      return;
    }

    onUpdate(job.id, editedJob);
    setIsEditing(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (job.isNew) {
      // For new jobs, cancel means delete the row
      onDelete(job.id);
    } else {
      // For existing jobs, cancel means revert changes
      setEditedJob(job);
      setIsEditing(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "pay_rate" || name === "incentive_bonus") {
      const num = value === "" ? null : Number(value);
      setEditedJob((prev) => ({ ...prev, [name]: num as any }));
      return;
    }
    if (name === "num_reminders") {
      const num = value === "" ? null : parseInt(value, 10);
      setEditedJob((prev) => ({ ...prev, [name]: num as any }));
      return;
    }
    if (name === "job_status") {
      setEditedJob((prev) => ({ ...prev, [name]: value.toUpperCase() }));
      return;
    }
    setEditedJob((prev) => ({ ...prev, [name]: value }));
  };

  const handleRowClick = () => {
    if (!isEditing && !job.isNew) {
      router.push(`/jobs/${job.id}/associates`);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click when deleting
    onDelete(job.id);
  };

  return (
    <tr
      className={`text-sm text-black border-b border-zinc-100 h-10 ${
        job.isNew ? "bg-blue-50" : ""
      } ${!isEditing && !job.isNew ? "hover:bg-gray-50 cursor-pointer" : ""}`}
      onClick={handleRowClick}
    >
      {/* Job Title */}
      <td className="px-4">
        {isEditing ? (
          <input
            name="title"
            value={editedJob.title}
            onChange={handleChange}
            onClick={(e) => e.stopPropagation()}
            className="border border-gray-300 rounded px-2 w-full"
          />
        ) : (
          job.title
        )}
      </td>

      {/* Client Company */}
      <td className="px-4">
        {isEditing ? (
          <input
            name="client_company"
            value={editedJob.client_company || ""}
            onChange={handleChange}
            onClick={(e) => e.stopPropagation()}
            className="border border-gray-300 rounded px-2 w-full"
          />
        ) : (
          editedJob.client_company || ""
        )}
      </td>

      <td className="px-4 text-blue-600">
        {isEditing ? (
          <input
            name="location"
            value={editedJob.location || ""}
            onChange={handleChange}
            onClick={(e) => e.stopPropagation()}
            className="border border-gray-300 rounded px-2 w-full"
          />
        ) : (
          job.location
        )}
      </td>

      <td className="px-4">
        {isEditing ? (
          <select
            name="job_status"
            value={editedJob.job_status || "Upcoming"}
            onChange={handleChange}
            onClick={(e) => e.stopPropagation()}
            className="border border-gray-300 rounded px-2 w-full"
          >
            <option value="UPCOMING">Upcoming</option>
            <option value="ONGOING">Ongoing</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        ) : (
          <span
            className={`px-2 py-0.5 rounded-sm text-xs font-bold uppercase ${getStatusStyle(
              job.job_status || "UPCOMING"
            )}`}
          >
            {job.job_status || "UPCOMING"}
          </span>
        )}
      </td>

      <td className="px-4 text-right whitespace-nowrap">
        {isEditing ? (
          <input
            name="start_date"
            type="date"
            value={editedJob.start_date || ""}
            onChange={handleChange}
            onClick={(e) => e.stopPropagation()}
            className="border border-gray-300 rounded px-2 w-full"
          />
        ) : (
          job.start_date
        )}
      </td>

      <td className="px-4 text-right whitespace-nowrap">
        {isEditing ? (
          <input
            name="end_date"
            type="date"
            value={editedJob.end_date || ""}
            onChange={handleChange}
            onClick={(e) => e.stopPropagation()}
            className="border border-gray-300 rounded px-2 w-full"
          />
        ) : (
          job.end_date
        )}
      </td>

      <td className="px-4 text-right whitespace-nowrap">
        {isEditing ? (
          <input
            name="pay_rate"
            type="number"
            step="0.01"
            value={editedJob.pay_rate || ""}
            onChange={handleChange}
            onClick={(e) => e.stopPropagation()}
            className="border border-gray-300 rounded px-2 w-full"
          />
        ) : job.pay_rate ? (
          `$${Number(job.pay_rate).toFixed(2)}`
        ) : (
          ""
        )}
      </td>

      {/* Incentive */}
      <td className="px-4 text-right whitespace-nowrap">
        {isEditing ? (
          <input
            name="incentive_bonus"
            type="number"
            step="0.01"
            value={editedJob.incentive_bonus ?? ""}
            onChange={handleChange}
            onClick={(e) => e.stopPropagation()}
            className="border border-gray-300 rounded px-2 w-full"
          />
        ) : editedJob.incentive_bonus ? (
          `$${Number(editedJob.incentive_bonus).toFixed(2)}`
        ) : (
          ""
        )}
      </td>

      {/* Associate dropdown */}
      <td className="px-4">
        {associates.length === 0 ? (
          <span className="text-gray-500">No associates found</span>
        ) : isEditing ? (
          <select
            name="associate_id"
            value={editedJob.associate_id || ""}
            onChange={handleChange}
            onClick={(e) => e.stopPropagation()}
            className="border border-gray-300 rounded px-2 w-full"
          >
            <option value="">Unassigned</option>
            {associates.map((a) => (
              <option
                key={a.id}
                value={a.id}
              >{`${a.first_name} ${a.last_name}`}</option>
            ))}
          </select>
        ) : (
          (() => {
            const found = associates.find(
              (a) => a.id === editedJob.associate_id
            );
            return found ? `${found.first_name} ${found.last_name}` : "";
          })()
        )}
      </td>

      {/* Reminder Type placeholder (future) */}
      <td className="px-4">
        {isEditing ? (
          <input
            name="reminder_type"
            disabled
            placeholder="(coming soon)"
            className="border border-gray-200 bg-gray-50 text-gray-400 rounded px-2 w-full"
          />
        ) : (
          ""
        )}
      </td>

      <td className="px-2 min-w-[120px] text-center">
        {isEditing ? (
          <div className="flex gap-1 justify-center items-center">
            <button
              onClick={handleSave}
              className="px-1.5 py-0.5 text-[11px] bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none"
            >
              {job.isNew ? "Create" : "Save"}
            </button>
            <button
              onClick={handleCancel}
              className="px-1.5 py-0.5 text-[11px] bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none"
            >
              {job.isNew ? "Cancel" : "Cancel"}
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
            <button onClick={handleDeleteClick} title="Delete">
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
