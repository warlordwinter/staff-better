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
  // Check if there are any associates assigned
  if (!job.associateCount || job.associateCount === 0) {
    return {
      label: "Need Assigned Associates",
      color: "bg-gray-400",
      textColor: "text-white",
    };
  }

  // Determine status based on numReminders (starts at 3, decreases as reminders are sent)
  // numReminders represents remaining reminders, so:
  // 3 = no reminders sent (Scheduled)
  // 2 = first reminder sent
  // 1 = second reminder sent
  // 0 = all reminders sent (Completed)
  if (job.numReminders !== undefined && job.numReminders !== null) {
    if (job.numReminders === 0) {
      return {
        label: "Completed",
        color: "bg-green-500",
        textColor: "text-white",
      };
    } else if (job.numReminders === 1) {
      return {
        label: "Second Reminder Sent",
        color: "bg-blue-500",
        textColor: "text-white",
      };
    } else if (job.numReminders === 2) {
      return {
        label: "First Reminder Sent",
        color: "bg-blue-400",
        textColor: "text-white",
      };
    }
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

  // Default to Scheduled (has associates but no reminders sent yet)
  return { label: "Scheduled", color: "bg-blue-500", textColor: "text-white" };
};

// Helper function to get status display from job and assignments (for detail view)
export const getStatusDisplay = (
  job: Job,
  assignments: JobAssignmentResponse[]
): StatusDisplay => {
  // If no assignments, show waiting status
  if (!assignments || assignments.length === 0) {
    return {
      label: "Need Assigned Associates",
      color: "bg-gray-400",
      textColor: "text-white",
    };
  }

  // Check if any assignments are confirmed (highest priority)
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

  // Determine status based on num_reminders (starts at 3, decreases as reminders are sent)
  // Find the minimum num_reminders across all assignments to show the most advanced status
  const minReminders = Math.min(
    ...assignments.map((a) => a.num_reminders ?? 3)
  );

  if (minReminders === 0) {
    return {
      label: "Completed",
      color: "bg-green-500",
      textColor: "text-white",
    };
  } else if (minReminders === 1) {
    return {
      label: "Second Reminder Sent",
      color: "bg-blue-500",
      textColor: "text-white",
    };
  } else if (minReminders === 2) {
    return {
      label: "First Reminder Sent",
      color: "bg-blue-400",
      textColor: "text-white",
    };
  }

  // Default to Scheduled (has associates but no reminders sent yet, num_reminders = 3)
  return { label: "Scheduled", color: "bg-blue-500", textColor: "text-white" };
};

// Helper function to get confirmation status color
export const getConfirmationStatusColor = (status: string): string => {
  switch (status) {
    case "CONFIRMED":
      return "bg-green-100 text-green-800";
    case "UNCONFIRMED":
      return "bg-yellow-100 text-yellow-800";
    case "DECLINED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};
