// Supabase implementation of assignment repository

import { IAssignmentRepository } from "../interfaces/index";
import { ConfirmationStatus } from "@/model/enums/ConfirmationStatus";

import { JobsAssignmentsDaoSupabase } from "../../dao/implementations/supabase/JobsAssignmentsDaoSupabase";

export interface ActiveAssignment {
  job_id: string;
  associate_id: string;
  work_date: Date;
  start_time: string;
  confirmation_status: ConfirmationStatus;
}

export class AssignmentRepositorySupabase implements IAssignmentRepository {
  private jobAssignmentsDao = new JobsAssignmentsDaoSupabase();

  async getActiveAssignments(associateId: string): Promise<ActiveAssignment[]> {
    const today = new Date();
    const todayString = today.toISOString().split("T")[0]; // YYYY-MM-DD format

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    const sevenDaysString = sevenDaysFromNow.toISOString().split("T")[0];

    const assignments =
      await this.jobAssignmentsDao.getActiveAssignmentsFromDatabase(
        todayString,
        sevenDaysString,
        associateId
      );

    // Transform the data to match the ActiveAssignment interface
    return assignments.map(
      (assignment: {
        job_id: string;
        associate_id: string;
        work_date: string;
        start_time: string;
        confirmation_status: string;
      }) => ({
        job_id: assignment.job_id,
        associate_id: assignment.associate_id,
        work_date: new Date(assignment.work_date),
        start_time: assignment.start_time,
        confirmation_status: this.mapConfirmationStatus(
          assignment.confirmation_status
        ),
      })
    );
  }

  async updateAssignmentStatus(
    jobId: string,
    associateId: string,
    status: ConfirmationStatus
  ): Promise<void> {
    await this.jobAssignmentsDao.updateJobAssignment(jobId, associateId, {
      confirmation_status: status,
      last_confirmation_time: new Date().toISOString(),
    });
  }

  private mapConfirmationStatus(status: string): ConfirmationStatus {
    switch (status?.toUpperCase()) {
      case "CONFIRMED":
        return ConfirmationStatus.CONFIRMED;
      case "UNCONFIRMED":
        return ConfirmationStatus.UNCONFIRMED;
      case "DECLINED":
        return ConfirmationStatus.DECLINED;
      default:
        console.warn(
          `Unknown confirmation status: ${status}, defaulting to Unconfirmed`
        );
        return ConfirmationStatus.UNCONFIRMED;
    }
  }
}
