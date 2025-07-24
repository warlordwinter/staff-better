import React, { useState } from "react";
import { AssociateDateDisplay } from "./associateTableCell";
import Image from "next/image";

export function AssociateTableRow({ data, index, onSave, onDelete }: { data: any; index: number; onSave?: (updatedData: any) => void; onDelete?: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    reminders: data.reminders || '',
    workDate: data.workDate || '',
    startTime: data.startTime || '',
    phone: data.phone || '',
    email: data.email || ''
  });

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ ...data, ...editData });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      reminders: data.reminders || '',
      workDate: data.workDate || '',
      startTime: data.startTime || '',
      phone: data.phone || '',
      email: data.email || ''
    });
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <tr className="text-xs text-neutral-700">
      <TableCell className="w-[120px]">
        {isEditing ? (
          <input
            type="text"
            value={editData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        ) : (
          data.firstName
        )}
      </TableCell>
      
      <TableCell className="w-[120px]">
        {isEditing ? (
          <input
            type="text"
            value={editData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        ) : (
          data.lastName
        )}
      </TableCell>
      
      <TableCell className="w-[50px]">
        {isEditing ? (
          <input
            type="number"
            value={editData.reminders}
            onChange={(e) => handleInputChange('reminders', e.target.value)}
            className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            min="0"
          />
        ) : (
          data.reminders
        )}
      </TableCell>
      
      <TableCell className="w-[180px]">
        {isEditing ? (
          <input
            type="date"
            value={editData.workDate}
            onChange={(e) => handleInputChange('workDate', e.target.value)}
            className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        ) : (
          <AssociateDateDisplay value={data.workDate} isFilled={!!data.workDate} />
        )}
      </TableCell>
      
      <TableCell className="w-[100px] text-right">
        {isEditing ? (
          <input
            type="time"
            value={editData.startTime}
            onChange={(e) => handleInputChange('startTime', e.target.value)}
            className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        ) : (
          data.startTime
        )}
      </TableCell>
      
      <TableCell className="w-[140px]">
        {isEditing ? (
          <input
            type="tel"
            value={editData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        ) : (
          data.phone
        )}
      </TableCell>
      
      <TableCell className="w-[240px]">
        {isEditing ? (
          <input
            type="email"
            value={editData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        ) : (
          data.email
        )}
      </TableCell>
      
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
