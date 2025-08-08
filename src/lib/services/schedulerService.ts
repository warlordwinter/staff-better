// Manages reminder scheduling and execution

import { ReminderService, ReminderResult } from "./reminderService";

export interface ScheduleConfig {
  enabled: boolean;
  intervalMinutes: number; // How often to check for reminders (e.g., every 15 minutes)
  maxRetries: number;
  retryDelayMinutes: number;
}

export interface SchedulerStats {
  lastRunTime: Date | null;
  nextRunTime: Date | null;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  isRunning: boolean;
}

export class SchedulerService {
  private reminderService: ReminderService;
  private config: ScheduleConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private stats: SchedulerStats;

  constructor(
    reminderService: ReminderService,
    config: ScheduleConfig = {
      enabled: true,
      intervalMinutes: 3, // Check every 15 minutes
      maxRetries: 3,
      retryDelayMinutes: 5,
    }
  ) {
    this.reminderService = reminderService;
    this.config = config;
    this.stats = {
      lastRunTime: null,
      nextRunTime: null,
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      isRunning: false,
    };
  }

  /**
 * Start the reminder scheduler
 * This begins the recurring process of checking and sending reminders
 */
start(): void {
  if (!this.config.enabled) {
    console.log("Scheduler is disabled in config");
    return;
  }

  if (this.intervalId) {
    console.log("Scheduler is already running");
    return;
  }

  console.log(`Starting reminder scheduler (checking every ${this.config.intervalMinutes} minutes)`);
  
  // Set up recurring execution first so isActive() works correctly
  this.intervalId = setInterval(() => {
    this.executeReminderCheck();
  }, this.config.intervalMinutes * 60 * 1000);

  this.updateNextRunTime();
  
  // Run the first check immediately, but don't wait for it
  // This prevents timing conflicts while still executing immediately
  this.executeReminderCheck();
}

  /**
   * Stop the reminder scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("Reminder scheduler stopped");
    }

    this.stats.nextRunTime = null;
  }

  /**
   * Execute a single reminder check cycle
   * This is the main method that gets called on each scheduled interval
   */
  private async executeReminderCheck(): Promise<void> {
    if (this.isRunning) {
      console.log("Reminder check already in progress, skipping this cycle");
      return;
    }

    this.isRunning = true;
    this.stats.isRunning = true;
    this.stats.totalRuns++;

    let attempt = 1;
    let success = false;

    while (attempt <= this.config.maxRetries && !success) {
      try {
        console.log(
          `Starting reminder check (attempt ${attempt}/${this.config.maxRetries})`
        );

        const results: ReminderResult[] =
          await this.reminderService.processScheduledReminders();

        this.logResults(results);
        this.stats.successfulRuns++;
        this.stats.lastRunTime = new Date();
        success = true;

        console.log(
          `Reminder check completed successfully on attempt ${attempt}`
        );
      } catch (error) {
        console.error(`Reminder check failed on attempt ${attempt}:`, error);

        if (attempt < this.config.maxRetries) {
          console.log(
            `Retrying in ${this.config.retryDelayMinutes} minutes...`
          );
          await this.delay(this.config.retryDelayMinutes * 60 * 1000);
        } else {
          this.stats.failedRuns++;
          console.error("All retry attempts exhausted");
        }

        attempt++;
      }
    }

    this.isRunning = false;
    this.stats.isRunning = false;
    this.updateNextRunTime();
  }

  /**
   * Run reminder check immediately (manual trigger)
   * Useful for testing or manual execution
   */
  async runNow(): Promise<ReminderResult[]> {
    console.log("Running reminder check manually");
    try {
      const results = await this.reminderService.processScheduledReminders();
      this.logResults(results);
      return results;
    } catch (error) {
      console.error("Manual reminder check failed:", error);
      throw error;
    }
  }

  /**
   * Update scheduler configuration
   */
  updateConfig(newConfig: Partial<ScheduleConfig>): void {
    const wasRunning = this.intervalId !== null;

    if (wasRunning) {
      this.stop();
    }

    this.config = { ...this.config, ...newConfig };

    if (wasRunning && this.config.enabled) {
      this.start();
    }

    console.log("Scheduler config updated:", this.config);
  }

  /**
   * Get current scheduler statistics
   */
  getStats(): SchedulerStats {
    return { ...this.stats };
  }

  /**
   * Get current configuration
   */
  getConfig(): ScheduleConfig {
    return { ...this.config };
  }

  /**
   * Check if scheduler is currently running
   */
  isActive(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      lastRunTime: this.stats.lastRunTime, // Keep last run time
      nextRunTime: this.stats.nextRunTime, // Keep next run time
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      isRunning: this.stats.isRunning, // Keep current running state
    };
  }

  // Private helper methods

  private updateNextRunTime(): void {
    if (this.intervalId) {
      this.stats.nextRunTime = new Date(
        Date.now() + this.config.intervalMinutes * 60 * 1000
      );
    }
  }

  private logResults(results: ReminderResult[]): void {
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => r.success === false).length;

    console.log(
      `Reminder batch completed: ${successful} successful, ${failed} failed (${results.length} total)`
    );

    // Log failed reminders for debugging
    if (failed > 0) {
      const failedResults = results.filter((r) => !r.success);
      console.log(
        "Failed reminders:",
        failedResults.map((r) => ({
          associate_id: r.associate_id,
          phone_number: r.phone_number,
          error: r.error,
        }))
      );
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Factory function to create and configure the scheduler
export function createReminderScheduler(
  reminderService: ReminderService,
  config?: Partial<ScheduleConfig>
): SchedulerService {
  const defaultConfig: ScheduleConfig = {
    enabled: true,
    intervalMinutes: 15,
    maxRetries: 3,
    retryDelayMinutes: 5,
  };

  const mergedConfig = config ? { ...defaultConfig, ...config } : defaultConfig;
  return new SchedulerService(reminderService, mergedConfig);
}

// Singleton pattern for global scheduler instance (optional)
let globalScheduler: SchedulerService | null = null;

export function getGlobalScheduler(): SchedulerService | null {
  return globalScheduler;
}

export function setGlobalScheduler(scheduler: SchedulerService): void {
  globalScheduler = scheduler;
}
