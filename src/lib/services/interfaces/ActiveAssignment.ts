import { ConfirmationStatus } from "@/model/enums/ConfirmationStatus";

export interface ActiveAssignment {
  job_id: string;
  associate_id: string;
  work_date: Date;
  start_time: string;
  confirmation_status: ConfirmationStatus;
}
