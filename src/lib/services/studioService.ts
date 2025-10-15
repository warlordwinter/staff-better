// Service for initiating Twilio Studio flows for SMS confirmations

import { ILogger } from "./interfaces/index";

export interface StudioFlowConfig {
  accountSid: string;
  authToken: string;
  flowSid: string;
  fromNumber: string;
}

export interface ConfirmationSmsParams {
  associateId: string;
  jobId: string;
  phoneNumber: string;
  associateName?: string;
  jobTitle?: string;
  workDate?: string;
  startTime?: string;
  location?: string;
}

export class StudioService {
  constructor(
    private readonly config: StudioFlowConfig,
    private readonly logger: ILogger
  ) {}

  /**
   * Initiate a confirmation SMS using Twilio Studio
   */
  async initiateConfirmationSms(params: ConfirmationSmsParams): Promise<{
    success: boolean;
    executionSid?: string;
    error?: string;
  }> {
    try {
      this.logger.info(
        `Initiating confirmation SMS for associate ${params.associateId}, job ${params.jobId}`
      );

      // Import Twilio client dynamically to avoid issues if not installed
      const twilio = require("twilio");
      const client = twilio(this.config.accountSid, this.config.authToken);

      // Start the Studio Flow execution for SMS
      const execution = await client.studio.v1
        .flows(this.config.flowSid)
        .executions.create({
          to: params.phoneNumber,
          from: this.config.fromNumber,
          parameters: {
            associate_id: params.associateId,
            job_id: params.jobId,
            associate_name: params.associateName || "",
            job_title: params.jobTitle || "",
            work_date: params.workDate || "",
            start_time: params.startTime || "",
            location: params.location || "",
          },
        });

      this.logger.info(`Studio SMS flow execution started: ${execution.sid}`);

      return {
        success: true,
        executionSid: execution.sid,
      };
    } catch (error) {
      this.logger.error(
        "Error initiating Studio confirmation SMS:",
        error as Error
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get the status of a Studio flow execution
   */
  async getExecutionStatus(executionSid: string): Promise<{
    success: boolean;
    status?: string;
    error?: string;
  }> {
    try {
      const twilio = require("twilio");
      const client = twilio(this.config.accountSid, this.config.authToken);

      const execution = await client.studio.v1
        .flows(this.config.flowSid)
        .executions(executionSid)
        .fetch();

      return {
        success: true,
        status: execution.status,
      };
    } catch (error) {
      this.logger.error("Error getting execution status:", error as Error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Cancel a Studio flow execution
   */
  async cancelExecution(executionSid: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const twilio = require("twilio");
      const client = twilio(this.config.accountSid, this.config.authToken);

      await client.studio.v1
        .flows(this.config.flowSid)
        .executions(executionSid)
        .update({ status: "ended" });

      this.logger.info(`Studio flow execution cancelled: ${executionSid}`);

      return {
        success: true,
      };
    } catch (error) {
      this.logger.error("Error cancelling execution:", error as Error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
