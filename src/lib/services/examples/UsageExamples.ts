// Examples of how to use the new service architecture

import {
  getMessageRouter,
  getReminderOrchestrator,
  getSchedulerService,
  ServiceContainer,
} from "../ServiceContainer";

/**
 * Example: Processing incoming SMS messages
 */
export async function processIncomingSMS(
  fromNumber: string,
  messageBody: string
) {
  const router = getMessageRouter();

  try {
    const result = await router.processIncomingMessage(fromNumber, messageBody);

    console.log("Message processed:", {
      success: result.success,
      action: result.action,
      associateId: result.associate_id,
      responseSent: result.response_sent,
    });

    return result;
  } catch (error) {
    console.error("Error processing message:", error);
    throw error;
  }
}

/**
 * Example: Processing scheduled reminders
 */
export async function processScheduledReminders() {
  const orchestrator = getReminderOrchestrator();

  try {
    const results = await orchestrator.processScheduledReminders();

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(
      `Reminders processed: ${successful} successful, ${failed} failed`
    );

    return results;
  } catch (error) {
    console.error("Error processing reminders:", error);
    throw error;
  }
}

/**
 * Example: Starting the scheduler
 */
export function startReminderScheduler() {
  const scheduler = getSchedulerService();

  // Start the scheduler
  scheduler.start();

  console.log("Scheduler started");
  console.log("Config:", scheduler.getConfig());
  console.log("Stats:", scheduler.getStats());
}

/**
 * Example: Manual reminder for testing
 */
export async function sendTestReminder(jobId: string, associateId: string) {
  const orchestrator = getReminderOrchestrator();

  try {
    const result = await orchestrator.sendTestReminder(jobId, associateId);

    console.log("Test reminder sent:", {
      success: result.success,
      associateId: result.associate_id,
      phoneNumber: result.phone_number,
      reminderType: result.reminder_type,
    });

    return result;
  } catch (error) {
    console.error("Error sending test reminder:", error);
    throw error;
  }
}

/**
 * Example: Getting service health status
 */
export function checkServiceHealth() {
  const container = ServiceContainer.getInstance();
  const health = container.getHealthStatus();

  console.log("Service Health Status:", health);

  // Check if all services are healthy
  const allHealthy =
    Object.values(health.sharedServices).every((status) => status) &&
    health.messageRouter &&
    health.reminderOrchestrator;

  return allHealthy;
}

/**
 * Example: Webhook endpoint for Twilio
 */
export async function twilioWebhookHandler(req: any, res: any) {
  try {
    const { From: phoneNumber, Body: messageBody } = req.body;

    const result = await processIncomingSMS(phoneNumber, messageBody);

    // Twilio expects a response (even if empty)
    res.status(200).send("");

    return result;
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send("Internal Server Error");
  }
}

/**
 * Example: Cron job for reminders
 */
export async function reminderCronJob() {
  try {
    console.log("Starting reminder cron job...");

    const results = await processScheduledReminders();

    console.log(`Cron job completed: ${results.length} reminders processed`);

    return results;
  } catch (error) {
    console.error("Cron job error:", error);
    throw error;
  }
}

/**
 * Example: Graceful shutdown
 */
export function gracefulShutdown() {
  const scheduler = getSchedulerService();

  console.log("Shutting down services...");

  // Stop the scheduler
  scheduler.stop();

  console.log("Services shut down successfully");
}
