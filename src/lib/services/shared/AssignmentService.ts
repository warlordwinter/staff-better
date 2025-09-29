// Shared assignment business logic

import {
  updateJobAssignment,
  getActiveAssignmentsFromDatabase,
} from "../../dao/JobsAssignmentsDao";
import { ConfirmationStatus } from "@/model/enums/ConfirmationStatus";
import { ActiveAssignment } from "../interfaces/ActiveAssignment";
import { DateTimeService } from "./DateTimeService";

export class AssignmentService {
  private dateTimeService: DateTimeService;

  constructor() {
    this.dateTimeService = new DateTimeService();
  }

  /**
   * Get active/upcoming assignments for an associate
   */
  async getActiveAssignments(associateId: string): Promise<ActiveAssignment[]> {
    const today = this.dateTimeService.getCurrentDateString();
    const sevenDaysFromNow = this.dateTimeService.getDateStringFromNow(7);

    console.log(`Getting active assignments for associate: ${associateId}`);
    console.log(`Date range: ${today} to ${sevenDaysFromNow}`);

    const assignments = await getActiveAssignmentsFromDatabase(
      today,
      sevenDaysFromNow,
      associateId
    );

    // Transform the data to match the ActiveAssignment interface
    const activeAssignments: ActiveAssignment[] = assignments.map(
      (assignment) => ({
        job_id: assignment.job_id,
        associate_id: assignment.associate_id,
        work_date: new Date(assignment.work_date),
        start_time: assignment.start_time,
        confirmation_status: this.mapConfirmationStatus(
          assignment.confirmation_status
        ),
      })
    );

    console.log(
      `Found ${activeAssignments.length} active assignments for associate: ${associateId}`
    );
    return activeAssignments;
  }

  /**
   * Determine the appropriate confirmation status based on timing
   */
  determineConfirmationStatus(
    assignment: ActiveAssignment
  ): ConfirmationStatus {
    const now = new Date();
    const workDateTime = this.dateTimeService.combineDateTime(
      assignment.work_date,
      assignment.start_time
    );
    const hoursDifference = this.dateTimeService.getHoursDifference(
      now,
      workDateTime
    );

    console.log("Work Date Time:", workDateTime);
    console.log("Now Time:", now);
    console.log("Hours difference:", hoursDifference);

    // If it's the day of the work (within 6 hours), mark as "Confirmed"
    // Otherwise, mark as "Soft Confirmed" or "Likely Confirmed"
    if (hoursDifference <= 6 && hoursDifference > 0) {
      return ConfirmationStatus.CONFIRMED;
    } else if (hoursDifference <= 24) {
      return ConfirmationStatus.LIKELY_CONFIRMED;
    } else {
      return ConfirmationStatus.SOFT_CONFIRMED;
    }
  }

  /**
   * Update assignment confirmation status
   */
  async updateAssignmentStatus(
    jobId: string,
    associateId: string,
    status: ConfirmationStatus
  ): Promise<void> {
    await updateJobAssignment(jobId, associateId, {
      confirmation_status: status,
      last_confirmation_time: new Date().toISOString(),
    });
  }

  /**
   * Update multiple assignments with the same status
   */
  async updateMultipleAssignments(
    assignments: ActiveAssignment[],
    status: ConfirmationStatus
  ): Promise<number> {
    let updatedCount = 0;

    for (const assignment of assignments) {
      await this.updateAssignmentStatus(
        assignment.job_id,
        assignment.associate_id,
        status
      );
      updatedCount++;
    }

    return updatedCount;
  }

  /**
   * Map string confirmation status to enum
   */
  private mapConfirmationStatus(status: string): ConfirmationStatus {
    switch (status?.toLowerCase()) {
      case "unconfirmed":
        return ConfirmationStatus.UNCONFIRMED;
      case "soft confirmed":
        return ConfirmationStatus.SOFT_CONFIRMED;
      case "likely confirmed":
        return ConfirmationStatus.LIKELY_CONFIRMED;
      case "confirmed":
        return ConfirmationStatus.CONFIRMED;
      case "declined":
        return ConfirmationStatus.DECLINED;
      default:
        console.warn(
          `Unknown confirmation status: ${status}, defaulting to Unconfirmed`
        );
        return ConfirmationStatus.UNCONFIRMED;
    }
  }
}
