interface AssociateTableHeaderProps {
  showJobAssignmentColumns?: boolean;
}

export function AssociateTableHeader({
  showJobAssignmentColumns = false,
}: AssociateTableHeaderProps) {
  // Base columns that are always shown
  const baseColumns = [
    { title: "First Name", className: "w-[120px]" },
    { title: "Last Name", className: "w-[120px]" },
  ];

  // Job assignment specific columns
  const jobAssignmentColumns = [{ title: "Reminders", className: "w-[50px]" }];

  // Common columns
  const commonColumns = [
    { title: "Phone Number", className: "w-[140px]" },
    { title: "Email Address", className: "w-[240px]" },
    { title: "WhatsApp", className: "w-[140px]" },
  ];

  // Job-specific columns (work date and start time are only relevant for job assignments)
  const jobSpecificColumns = [
    { title: "Work Date", className: "w-[180px]" },
    { title: "Start Time", className: "w-[100px] text-right" },
  ];

  // Status column (only for job assignments)
  const statusColumn = [{ title: "Status", className: "w-[140px]" }];

  // Actions column
  const actionsColumn = [{ title: "", className: "w-[100px]" }];

  // Build the columns array based on the mode
  const columns = [
    ...baseColumns,
    ...(showJobAssignmentColumns ? jobAssignmentColumns : []),
    ...(showJobAssignmentColumns ? jobSpecificColumns : []), // Only show work date/time for job assignments
    ...commonColumns,
    ...(showJobAssignmentColumns ? statusColumn : []),
    ...actionsColumn,
  ];

  return (
    <tr className="bg-gray-100 text-xs font-bold text-neutral-700">
      {columns.map((col, index) => (
        <th
          key={index}
          className={`px-3 py-2 border border-gray-200 text-left truncate ${col.className}`}
        >
          {col.title}
        </th>
      ))}
    </tr>
  );
}
