// Abstract interface for assignment data access

import { ConfirmationStatus } from "@/model/enums/ConfirmationStatus";

export interface ActiveAssignment {
  job_id: string;
  associate_id: string;
  work_date: Date;
  start_time: string;
  confirmation_status: ConfirmationStatus;
}

export interface IAssignmentRepository {
  getActiveAssignments(associateId: string): Promise<ActiveAssignment[]>;
  updateAssignmentStatus(
    jobId: string,
    associateId: string,
    status: ConfirmationStatus
  ): Promise<void>;
}
