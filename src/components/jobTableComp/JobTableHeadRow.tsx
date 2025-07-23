import React from 'react';

const JobTableHeadRow = () => (
  <tr className="bg-neutral-50 text-xs font-semibold text-zinc-700 border-b border-zinc-200">
    <th className="w-[3rem] h-12" />
    <th className="w-[1.5fr] px-4 text-left">Title</th>
    <th className="w-[1.5fr] px-4 text-left">Customer Name</th>
    <th className="w-[1fr] px-4 text-left">Status</th>
    <th className="w-[1fr] px-4 text-left">Date</th>
  </tr>
);

export default JobTableHeadRow;
