import React from 'react';

const JobTableHeadRow = () => (
  <div className="grid grid-cols-[3rem_1.5fr_1.5fr_1fr_1fr] bg-neutral-50 text-xs font-semibold font-['Inter'] border-b border-zinc-200">
    <div className="flex items-center justify-center h-12" />
    <div className="flex items-center px-4 h-12">Title</div>
    <div className="flex items-center px-4 h-12">Customer Name</div>
    <div className="flex items-center px-4 h-12">Status</div>
    <div className="flex items-center px-4 h-12">Date</div>
  </div>
);

export default JobTableHeadRow;
