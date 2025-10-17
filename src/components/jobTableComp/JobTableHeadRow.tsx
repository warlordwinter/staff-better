import React from "react";

const JobTableHeadRow = () => (
  <tr className="bg-neutral-50 text-xs font-semibold text-zinc-700 border-b border-zinc-200 h-10">
    <th className="w-[1.5fr] px-4 text-left">Job Title</th>
    <th className="w-[1.5fr] px-4 text-left">Location</th>
    <th className="w-[.5fr] px-4 text-left">Job Status</th>
    <th className="w-[1fr] px-4 text-left">Start Date</th>
    <th className="w-[1fr] px-4 text-left">End Date</th>
    <th className="w-[1fr] px-4 text-left">Pay Rate</th>
    <th className="w-[6rem] px-2 text-center">Actions</th>
  </tr>
);

export default JobTableHeadRow;
