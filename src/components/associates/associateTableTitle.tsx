import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AddButton } from "./addButton";
import { Job } from "@/model/interfaces/Job";

interface AssociateTableTitleProps {
  job?: Job; // Optional job data to display title
  onAdd: () => void;
}

export function AssociateTableTitle({ job, onAdd }: AssociateTableTitleProps) {
  const router = useRouter();

  const handleBackClick = () => {
    router.push("/jobs"); // Navigate back to jobs list
  };

  const getJobTitle = () => {
    if (job) {
      return `${job.job_title} - ${job.customer_name}`;
    }
    return "Associates"; // Default title when no job is provided
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
      {/* Left side: back arrow + title */}
      <div className="flex items-center gap-3">
        {job && ( // Only show back arrow when viewing job associates
          <button
            onClick={handleBackClick}
            className="w-8 h-8 relative flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
            title="Back to Jobs"
          >
            <Image
              src="/icons/backArrow.svg"
              alt="Back"
              width={24}
              height={24}
              className="object-contain"
            />
          </button>
        )}
        <h1 className="text-lg sm:text-2xl md:text-3xl font-semibold text-black">
          {getJobTitle()}
        </h1>
      </div>

      {/* Right side: Add Button */}
      <div onClick={onAdd}>
        <AddButton />
      </div>
    </div>
  );
}