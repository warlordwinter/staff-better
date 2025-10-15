// Types for the Studio-based confirmation system

export interface ScheduleConfig {
  enabled: boolean;
  intervalMinutes: number;
  maxRetries: number;
  retryDelayMinutes: number;
}

export interface ConfirmationStatus {
  status: "Confirmed" | "Declined" | "Unconfirmed";
  timestamp: string;
  method: "studio" | "manual";
}

export interface StudioConfirmationRequest {
  associateId: string;
  jobId: string;
  confirmationStatus: "Confirmed" | "Declined" | "Unconfirmed";
  phoneNumber: string;
  flowSid?: string;
  contactChannelAddress?: string;
}

export interface StudioConfirmationResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    associateId: string;
    jobId: string;
    confirmationStatus: string;
    updatedAt: string;
  };
}
