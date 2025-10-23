"use client";
import React, { useState } from "react";
import { AssociateDateDisplay } from "./associateTableCell";
import Image from "next/image";
import { Associate } from "@/model/interfaces/Associate";
import { formatPhoneForDisplay, formatPhoneToE164 } from "@/utils/phoneUtils";
import { to12HourDisplay } from "@/utils/timezoneUtils";

interface AssociateDisplay extends Associate {
  confirmation_status?: string;
  num_reminders?: number;
  job_work_date?: string;
  job_start_time?: string; // local time for display/editing
  isNew?: boolean; // Track if this is a new unsaved associate
}

interface AssociateTableRowProps {
  data: AssociateDisplay;
  index: number;
  onSave?: (updatedData: AssociateDisplay) => void;
  onDelete?: () => void;
  showJobAssignmentColumns?: boolean;
  isEditing?: boolean; // External control of editing state
}

export function AssociateTableRow({
  data,
  index,
  onSave,
  onDelete,
  showJobAssignmentColumns = false,
  isEditing: externalIsEditing = false,
}: AssociateTableRowProps) {
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const isEditing = externalIsEditing || internalIsEditing;
  const [phoneError, setPhoneError] = useState("");

  const [editData, setEditData] = useState({
    first_name: data.first_name || "",
    last_name: data.last_name || "",
    num_reminders: (data.num_reminders || 0).toString(),
    work_date: data.work_date || "",
    start_date: data.start_date || "", // local time for display
    phone_number: data.phone_number || "",
    email_address: data.email_address || "",
    confirmation_status: data.confirmation_status || "UNCONFIRMED",
    job_work_date: data.job_work_date || data.work_date || "",
    job_start_time: data.job_start_time || data.start_date || "", // local time for display
  });

  const handleEdit = () => {
    setInternalIsEditing(true);
    setPhoneError("");
  };

  const handleSave = () => {
    if (editData.phone_number.trim()) {
      try {
        formatPhoneToE164(editData.phone_number);
        setPhoneError("");
      } catch {
        setPhoneError("Please enter a valid phone number");
        return;
      }
    }

    if (onSave) {
      const updatedData: AssociateDisplay = {
        ...data,
        first_name: editData.first_name,
        last_name: editData.last_name,
        work_date: editData.work_date,
        start_date: editData.start_date, // local; parent converts to UTC
        phone_number: editData.phone_number,
        email_address: editData.email_address,
        num_reminders: Number(editData.num_reminders) || 0,
        confirmation_status: editData.confirmation_status,
        job_work_date: editData.job_work_date,
        job_start_time: editData.job_start_time, // local; parent converts to UTC
      };
      onSave(updatedData);
    }

    setInternalIsEditing(false);
    setPhoneError("");
  };

  const handleCancel = () => {
    if (data.isNew) {
      // For new associates, trigger delete to remove from table
      if (onDelete) {
        onDelete();
      }
      return;
    }

    // For existing associates, reset to original data
    setEditData({
      first_name: data.first_name || "",
      last_name: data.last_name || "",
      num_reminders: (data.num_reminders || 0).toString(),
      work_date: data.work_date || "",
      start_date: data.start_date || "", // keep local time for display
      phone_number: data.phone_number || "",
      email_address: data.email_address || "",
      confirmation_status: data.confirmation_status || "UNCONFIRMED",
      job_work_date: data.job_work_date || data.work_date || "",
      job_start_time: data.job_start_time || data.start_date || "", // keep local time
    });
    setInternalIsEditing(false);
    setPhoneError("");
  };

  const handleInputChange = (field: string, value: string) => {
    setEditData((prev) => ({ ...prev, [field]: value }));

    if (field === "phone_number") {
      if (value.trim() === "") {
        setPhoneError("");
      } else {
        try {
          formatPhoneToE164(value);
          setPhoneError("");
        } catch {
          setPhoneError("Invalid phone format");
        }
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "UNCONFIRMED":
        return "bg-gray-100 text-gray-800";
      case "SOFT_CONFIRMED":
        return "bg-yellow-100 text-yellow-800";
      case "LIKELY_CONFIRMED":
        return "bg-blue-100 text-blue-800";
      case "CONFIRMED":
        return "bg-green-100 text-green-800";
      case "DECLINED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const displayTime = (time: string) => (
    <span className="font-medium">{to12HourDisplay(time) || ""}</span>
  );

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
            onChange={(e) => handleInputChange("first_name", e.target.value)}
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
            onChange={(e) => handleInputChange("last_name", e.target.value)}
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
              onChange={(e) =>
                handleInputChange("num_reminders", e.target.value)
              }
              className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              min={0}
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
            value={
              showJobAssignmentColumns
                ? editData.job_work_date
                : editData.work_date
            }
            onChange={(e) =>
              handleInputChange(
                showJobAssignmentColumns ? "job_work_date" : "work_date",
                e.target.value
              )
            }
            className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          />
        ) : (
          <AssociateDateDisplay
            value={
              showJobAssignmentColumns
                ? data.job_work_date || data.work_date || ""
                : data.work_date || ""
            }
            isFilled={
              !!(showJobAssignmentColumns
                ? data.job_work_date || data.work_date
                : data.work_date)
            }
          />
        )}
      </TableCell>

      <TableCell className="w-[140px] text-right">
        {isEditing ? (
          <div className="flex flex-col">
            <input
              type="time"
              value={
                showJobAssignmentColumns
                  ? editData.job_start_time
                  : editData.start_date
              }
              onChange={(e) =>
                handleInputChange(
                  showJobAssignmentColumns ? "job_start_time" : "start_date",
                  e.target.value
                )
              }
              className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
            {/* Intentionally no timezone label */}
          </div>
        ) : (
          displayTime(
            showJobAssignmentColumns
              ? data.job_start_time || data.start_date || ""
              : data.start_date || ""
          )
        )}
      </TableCell>

      <TableCell className="w-[140px]">
        {isEditing ? (
          <div className="relative">
            <input
              type="tel"
              value={editData.phone_number}
              onChange={(e) =>
                handleInputChange("phone_number", e.target.value)
              }
              className={`w-full px-1 py-1 text-xs border rounded focus:outline-none focus:border-blue-500 ${
                phoneError ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="(555) 123-4567"
              pattern="[0-9]*"
            />
            {phoneError && (
              <div className="absolute text-xs text-red-500 mt-1 whitespace-nowrap">
                {phoneError}
              </div>
            )}
          </div>
        ) : (
          formatPhoneForDisplay(data.phone_number)
        )}
      </TableCell>

      <TableCell className="w-[240px]">
        {isEditing ? (
          <input
            type="email"
            value={editData.email_address}
            onChange={(e) => handleInputChange("email_address", e.target.value)}
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
              onChange={(e) =>
                handleInputChange("confirmation_status", e.target.value)
              }
              className="w-full px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="UNCONFIRMED">Unconfirmed</option>
              <option value="SOFT_CONFIRMED">Soft Confirmed</option>
              <option value="LIKELY_CONFIRMED">Likely Confirmed</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="DECLINED">Declined</option>
            </select>
          ) : (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                data.confirmation_status || "UNCONFIRMED"
              )}`}
            >
              {data.confirmation_status || "UNCONFIRMED"}
            </span>
          )}
        </TableCell>
      )}

      <TableCell className="w-[100px]">
        {isEditing ? (
          <div className="flex gap-1">
            <button
              onClick={handleSave}
              disabled={!!phoneError}
              className={`px-2 py-1 text-xs text-white rounded focus:outline-none ${
                phoneError
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600"
              }`}
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
              <Image
                src="/icons/trash.svg"
                alt="Delete"
                width={16}
                height={16}
              />
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
