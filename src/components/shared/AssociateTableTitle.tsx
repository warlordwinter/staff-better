"use client";

import React from "react";
import { Job } from "@/model/interfaces/Job";
import AddAssociateButton from "./AddAssociateButton";

interface AssociateTableTitleProps {
  job?: Job;
  onAdd: () => void;
}

export default function AssociateTableTitle({
  job,
  onAdd,
}: AssociateTableTitleProps) {
  return (
    <div className="flex justify-between items-center mb-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {job ? `Associates for ${job.job_title}` : "Associates"}
        </h2>
        {job && (
          <p className="text-sm text-gray-600 mt-1">
            Customer: {job.customer_name} | Start Date: {job.start_date}
          </p>
        )}
      </div>
      <AddAssociateButton onAdd={onAdd} />
    </div>
  );
}
