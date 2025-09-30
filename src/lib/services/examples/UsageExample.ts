// Example of how to use the improved services

import { serviceContainer } from "../ServiceContainer";
import { ReminderService } from "../reminderService";
import { IncomingMessageService } from "../IncomingMessageService";
import { SchedulerService } from "../schedulerService";

export class UsageExample {
  private reminderService: ReminderService;
  private incomingMessageService: IncomingMessageService;
  private schedulerService: SchedulerService;

  constructor() {
    // Get services from the container
    this.reminderService = serviceContainer.getReminderService();
    this.incomingMessageService = serviceContainer.getIncomingMessageService();
    this.schedulerService = serviceContainer.getSchedulerService();
  }

  // Example: Start the reminder scheduler
  async startReminderScheduler(): Promise<void> {
    console.log("Starting reminder scheduler...");
    this.schedulerService.start();
    console.log("Scheduler started successfully");
  }

  // Example: Process incoming SMS message
  async handleIncomingSMS(fromNumber: string, messageBody: string) {
    console.log(`Processing SMS from ${fromNumber}: ${messageBody}`);

    const result = await this.incomingMessageService.processIncomingMessage(
      fromNumber,
      messageBody
    );

    console.log("Message processing result:", result);
    return result;
  }

  // Example: Send a test reminder
  async sendTestReminder(jobId: string, associateId: string) {
    console.log(
      `Sending test reminder for job ${jobId}, associate ${associateId}`
    );

    const result = await this.reminderService.sendTestReminder(
      jobId,
      associateId
    );

    console.log("Test reminder result:", result);
    return result;
  }

  // Example: Run reminder check manually
  async runManualReminderCheck() {
    console.log("Running manual reminder check...");

    const results = await this.schedulerService.runNow();

    console.log(
      `Manual check completed: ${results.length} reminders processed`
    );
    return results;
  }

  // Example: Get scheduler statistics
  getSchedulerStats() {
    const stats = this.schedulerService.getStats();
    console.log("Scheduler statistics:", stats);
    return stats;
  }

  // Example: Update scheduler configuration
  updateSchedulerSettings() {
    serviceContainer.updateSchedulerConfig({
      intervalMinutes: 30, // Change to check every 30 minutes
      maxRetries: 5, // Increase retry attempts
    });

    console.log("Scheduler configuration updated");
  }
}

// Example usage in an API route
export async function handleTwilioWebhook(
  fromNumber: string,
  messageBody: string
) {
  const usageExample = new UsageExample();
  return await usageExample.handleIncomingSMS(fromNumber, messageBody);
}

// Example usage for starting the scheduler
export function initializeServices() {
  const usageExample = new UsageExample();
  usageExample.startReminderScheduler();
  console.log("All services initialized and scheduler started");
}
