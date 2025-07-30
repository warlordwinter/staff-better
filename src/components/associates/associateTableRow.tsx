import React, { useState } from "react";
import { AssociateDateDisplay } from "./associateTableCell";
import Image from "next/image";
import { Associate } from "@/model/interfaces/Associate";

// Extended interface for display purposes (includes job assignment fields)
interface AssociateDisplay extends Associate {
  confirmation_status?: string;
  num_reminders?: number;
  job_work_date?: string;
  job_start_time?: string;
}

interface AssociateTableRowProps {
  data: AssociateDisplay;
  index: number;
  onSave?: (updatedData: AssociateDisplay) => void;
  onDelete?: () => void;
  showJobAssignmentColumns?: boolean;
}

export function AssociateTableRow({ 
  data, 
  index, 
  onSave, 
  onDelete, 
  showJobAssignmentColumns = false 
}: AssociateTableRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    first_name: data.first_name || '',
    last_name: data.last_name || '',
    num_reminders: (data.num_reminders || 0).toString(),
    work_date: data.work_date || '',
    start_time: data.start_time || '',
    phone_number: data.phone_number || '',
    email_address: data.email_address || '',
    confirmation_status: data.confirmation_status || 'Unconfirmed',
    job_work_date: data.job_work_date || data.work_date || '',
    job_start_time: data.job_start_time || data.start_time || '',
  });

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (onSave) {
      const updatedData: AssociateDisplay = {
        ...data,
        first_name: editData.first_name,
        last_name: editData.last_name,
        work_date: editData.work_date,
        start_time: editData.start_time,
        phone_number: editData.phone_number,
        email_address: editData.email_address,
        num_reminders: Number(editData.num_reminders) || 0,
        confirmation_status: editData.confirmation_status,
        job_work_date: editData.job_work_date,
        job_start_time: editData.job_start_time,
      };
      onSave(updatedData);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      num_reminders: (data.num_reminders || 0).toString(),
      work_date: data.work_date || '',
      start_time: data.start_time || '',
      phone_number: data.phone_number || '',
      email_address: data.email_address || '',
      confirmation_status: data.confirmation_status || 'Unconfirmed',
      job_work_date: data.job_work_date || data.work_date || '',
      job_start_time: data.job_start_time || data.start_time || '',
    });
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Unconfirmed':
        return 'bg-gray-100 text-gray-800';
      case 'Soft Confirmed':
        return 'bg-yellow-100 text-yellow-800';
      case 'Likely Confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'Confirmed':
        return 'bg-green-100 text-green-800';
      case 'Declined':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Suppress the ESLint warning for unused index since it's used in parent
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _index = index;

  return (
    <tr className="text-xs text-neutral-700">
      <TableCell className="w-[120px]">
        {isEditing ? (
          <input
            type="text"
            value={editData.first_name}
            onChange={(e) => handleInputChange('first_name', e.target.value)}
            className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        ) : (
          data.first_name
        )}
      </TableCell>
      
      <TableCell className="w-[120px]">
        {isEditing ? (
          <input
            type="text"
            value={editData.last_name}
            onChange={(e) => handleInputChange('last_name', e.target.value)}
            className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        ) : (
          data.last_name
        )}
      </TableCell>
      
      {showJobAssignmentColumns && (
        <TableCell className="w-[50px]">
          {isEditing ? (
            <input
              type="number"
              value={editData.num_reminders}
              onChange={(e) => handleInputChange('num_reminders', e.target.value)}
              className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              min="0"
            />
          ) : (
            data.num_reminders || 0
          )}
        </TableCell>
      )}
      
      <TableCell className="w-[180px]">
        {isEditing ? (
          <input
            type="date"
            value={showJobAssignmentColumns ? editData.job_work_date : editData.work_date}
            onChange={(e) => handleInputChange(
              showJobAssignmentColumns ? 'job_work_date' : 'work_date', 
              e.target.value
            )}
            className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        ) : (
          <AssociateDateDisplay 
            value={showJobAssignmentColumns ? data.job_work_date || data.work_date : data.work_date} 
            isFilled={!!(showJobAssignmentColumns ? data.job_work_date || data.work_date : data.work_date)} 
          />
        )}
      </TableCell>
      
      <TableCell className="w-[100px] text-right">
        {isEditing ? (
          <input
            type="time"
            value={showJobAssignmentColumns ? editData.job_start_time : editData.start_time}
            onChange={(e) => handleInputChange(
              showJobAssignmentColumns ? 'job_start_time' : 'start_time', 
              e.target.value
            )}
            className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        ) : (
          showJobAssignmentColumns ? data.job_start_time || data.start_time : data.start_time
        )}
      </TableCell>
      
      <TableCell className="w-[140px]">
        {isEditing ? (
          <input
            type="tel"
            value={editData.phone_number}
            onChange={(e) => handleInputChange('phone_number', e.target.value)}
            className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        ) : (
          data.phone_number
        )}
      </TableCell>
      
      <TableCell className="w-[240px]">
        {isEditing ? (
          <input
            type="email"
            value={editData.email_address}
            onChange={(e) => handleInputChange('email_address', e.target.value)}
            className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        ) : (
          data.email_address
        )}
      </TableCell>
      
      {showJobAssignmentColumns && (
        <TableCell className="w-[140px]">
          {isEditing ? (
            <select
              value={editData.confirmation_status}
              onChange={(e) => handleInputChange('confirmation_status', e.target.value)}
              className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="Unconfirmed">Unconfirmed</option>
              <option value="Soft Confirmed">Soft Confirmed</option>
              <option value="Likely Confirmed">Likely Confirmed</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Declined">Declined</option>
            </select>
          ) : (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(data.confirmation_status || 'Unconfirmed')}`}>
              {data.confirmation_status || 'Unconfirmed'}
            </span>
          )}
        </TableCell>
      )}
      
      <TableCell className="w-[100px]">
        {isEditing ? (
          <div className="flex gap-1">
            <button
              onClick={handleSave}
              className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <button
              onClick={handleEdit}
              className="hover:bg-gray-100 p-1 rounded focus:outline-none"
              title="Edit"
            >
              <Image src="/icons/edit.svg" alt="Edit" width={16} height={16} />
            </button>
            <button
              onClick={onDelete}
              className="hover:bg-gray-100 p-1 rounded focus:outline-none"
              title="Delete"
            >
              <Image src="/icons/trash.svg" alt="Delete" width={16} height={16} />
            </button>
          </div>
        )}
      </TableCell>
    </tr>
  );
}

function TableCell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-3 py-2 border border-gray-100 truncate ${className}`}>
      {typeof children === "string" || typeof children === "number" ? (
        <span>{children}</span>
      ) : (
        children
      )}
    </td>
  );
}