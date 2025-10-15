// Service to integrate Studio confirmations with the existing reminder system

import { ILogger } from "./interfaces/index";
import { StudioService, ConfirmationSmsParams } from "./studioService";
import { ReminderAssignment } from "./types";

export class StudioReminderService {
  constructor(
    private readonly studioService: StudioService,
    private readonly logger: ILogger
  ) {}

  /**
   * Send confirmation SMS for a reminder assignment
   * This integrates with your existing reminder system
   */
  async sendConfirmationSms(assignment: ReminderAssignment): Promise<{
    success: boolean;
    executionSid?: string;
    error?: string;
  }> {
    try {
      this.logger.info(
        `Sending confirmation SMS for assignment: Job ${assignment.job_id}, Associate ${assignment.associate_id}`
      );

      const smsParams: ConfirmationSmsParams = {
        associateId: assignment.associate_id,
        jobId: assignment.job_id,
        phoneNumber: assignment.phone_number,
        associateName: assignment.first_name,
        jobTitle: assignment.job_title,
        workDate: assignment.work_date,
        startTime: assignment.start_time,
        location: assignment.location || "TBD", // Add location if available
      };

      const result = await this.studioService.initiateConfirmationSms(
        smsParams
      );

      if (result.success) {
        this.logger.info(
          `Confirmation SMS sent successfully for assignment: Job ${assignment.job_id}, Associate ${assignment.associate_id}, Execution: ${result.executionSid}`
        );
      } else {
        this.logger.error(
          `Failed to send confirmation SMS for assignment: Job ${assignment.job_id}, Associate ${assignment.associate_id}, Error: ${result.error}`
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Error sending confirmation SMS for assignment: Job ${assignment.job_id}, Associate ${assignment.associate_id}`,
        error
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send confirmation SMS for multiple assignments
   * Useful for batch processing from cron jobs
   */
  async sendBulkConfirmationSms(assignments: ReminderAssignment[]): Promise<{
    success: boolean;
    results: Array<{
      assignment: ReminderAssignment;
      result: {
        success: boolean;
        executionSid?: string;
        error?: string;
      };
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    const results: Array<{
      assignment: ReminderAssignment;
      result: {
        success: boolean;
        executionSid?: string;
        error?: string;
      };
    }> = [];

    this.logger.info(
      `Starting bulk confirmation SMS for ${assignments.length} assignments`
    );

    for (const assignment of assignments) {
      const result = await this.sendConfirmationSms(assignment);
      results.push({ assignment, result });

      // Rate limiting to avoid overwhelming Twilio
      await this.delay(500); // 500ms delay between SMS
    }

    const successful = results.filter((r) => r.result.success).length;
    const failed = results.length - successful;

    this.logger.info(
      `Bulk confirmation SMS completed: ${successful} successful, ${failed} failed out of ${results.length} total`
    );

    return {
      success: failed === 0, // Only successful if all succeeded
      results,
      summary: {
        total: results.length,
        successful,
        failed,
      },
    };
  }

  /**
   * Helper method for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
