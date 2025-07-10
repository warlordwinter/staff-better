import React from "react";
import { AssociateDateDisplay } from "./associateTableCell";
import { ActionIcons } from "./associateIcons";

export function AssociateTableRow({ data }: { data: any }) {
  return (
    <tr className="text-xs text-neutral-700">
      <TableCell className="w-[120px]">{data.firstName}</TableCell>
      <TableCell className="w-[120px]">{data.lastName}</TableCell>
      <TableCell className="w-[50px]">{data.reminders}</TableCell>
      <TableCell className="w-[180px]">
        <AssociateDateDisplay value={data.workDate} isFilled={!!data.workDate} />
      </TableCell>
      <TableCell className="w-[100px] text-right">{data.startTime}</TableCell>
      <TableCell className="w-[140px]">{data.phone}</TableCell>
      <TableCell className="w-[240px]">{data.email}</TableCell>
      <TableCell className="w-[100px]">
        <ActionIcons />
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
