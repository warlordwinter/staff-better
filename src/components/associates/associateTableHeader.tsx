export function AssociateTableHeader() {
  const columns = [
    { title: "First Name", className: "w-[120px]" },
    { title: "Last Name", className: "w-[120px]" },
    { title: "Reminders", className: "w-[50px]" },
    { title: "Work Date", className: "w-[180px]" },
    { title: "Start Time", className: "w-[100px] text-right" },
    { title: "Phone Number", className: "w-[140px]" },
    { title: "Email Address", className: "w-[240px]" },
    { title: "Status", className: "w-[140px]" },
    { title: "", className: "w-[100px]" },
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
