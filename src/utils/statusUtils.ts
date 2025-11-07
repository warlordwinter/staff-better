import { Job } from "@/model/interfaces/Job";

export interface StatusDisplay {
  label: string;
  color: string;
  textColor: string;
}

export interface JobAssignmentResponse {
  confirmation_status: string;
  num_reminders: number;
  work_date: string;
  start_time: string;
  associates: {
    id: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    email_address: string;
  };
}

// Helper function to determine status from job (for list view)
export const getStatus = (
  job: Job & { associateCount?: number; numReminders?: number }
): StatusDisplay => {
  if (job.numReminders && job.numReminders > 0) {
    return { label: "Sent", color: "bg-gray-400", textColor: "text-gray-900" };
  }

  if (job.job_status?.includes("CONFIRMED")) {
    return {
      label: "Confirmed",
      color: "bg-green-500",
      textColor: "text-white",
    };
  }

  if (
    job.job_status?.includes("FAILED") ||
    job.job_status?.includes("DECLINED")
  ) {
    return { label: "Failed", color: "bg-red-500", textColor: "text-white" };
  }

  // Default to Scheduled
  return { label: "Scheduled", color: "bg-blue-500", textColor: "text-white" };
};

// Helper function to get status display from job and assignments (for detail view)
export const getStatusDisplay = (
  job: Job,
  assignments: JobAssignmentResponse[]
): StatusDisplay => {
  // If any reminders have been sent
  if (assignments.some((a) => a.num_reminders > 0)) {
    return { label: "Sent", color: "bg-gray-400", textColor: "text-gray-900" };
  }

  // Check if any assignments are confirmed
  if (assignments.some((a) => a.confirmation_status === "CONFIRMED")) {
    return {
      label: "Confirmed",
      color: "bg-green-500",
      textColor: "text-white",
    };
  }

  if (
    job.job_status?.includes("FAILED") ||
    job.job_status?.includes("DECLINED")
  ) {
    return { label: "Failed", color: "bg-red-500", textColor: "text-white" };
  }

  return { label: "Scheduled", color: "bg-blue-500", textColor: "text-white" };
};

// Helper function to get confirmation status color
export const getConfirmationStatusColor = (status: string): string => {
  switch (status) {
    case "CONFIRMED":
      return "bg-green-100 text-green-800";
    case "SOFT_CONFIRMED":
      return "bg-yellow-100 text-yellow-800";
    case "LIKELY_CONFIRMED":
      return "bg-blue-100 text-blue-800";
    case "DECLINED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};
