import React from "react";

const JobTableHeadRow = () => (
  <tr className="bg-neutral-50 text-xs font-semibold text-zinc-700 border-b border-zinc-200 h-10">
    <th className="px-4 text-left whitespace-nowrap">Job Title</th>
    <th className="px-4 text-left whitespace-nowrap">Client Company</th>
    <th className="px-4 text-left whitespace-nowrap">Location</th>
    <th className="px-4 text-left whitespace-nowrap">Job Status</th>
    <th className="px-4 text-right whitespace-nowrap">Start Date</th>
    <th className="px-4 text-right whitespace-nowrap">End Date</th>
    <th className="px-4 text-right whitespace-nowrap">Pay Rate</th>
    <th className="px-4 text-right whitespace-nowrap">Incentive</th>
    <th className="px-4 text-left whitespace-nowrap">Associate</th>
    <th className="px-4 text-left whitespace-nowrap">Reminder Type</th>
    <th className="px-2 text-center whitespace-nowrap">Actions</th>
  </tr>
);

export default JobTableHeadRow;
