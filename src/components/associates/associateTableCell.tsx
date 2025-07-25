import React from "react";

export function AssociateDateDisplay({
  value,
  isFilled,
}: {
  value: string;
  isFilled: boolean;
}) {
  return (

      <div
        className={` self-stretch px-3 py-2 inline-flex items-center flex-1 bg-white rounded outline-offset-[-1px] ${
          isFilled ? "outline-slate-600 text-slate-600" : "outline-slate-400 text-slate-400"
        } flex items-center justify-between text-xs font-normal font-['Inter']`}
      >
        <span className="truncate leading-snug">
          {value || "MM / DD / YYYY"}
        </span>
    </div>
  );
}
