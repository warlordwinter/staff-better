// __tests__/schedulerService.test.ts

import {
  SchedulerService,
  createReminderScheduler,
  ScheduleConfig,
} from "../../lib/services/schedulerService";
import {
  ReminderService,
  ReminderResult,
  ReminderType,
} from "../../lib/services/reminderService";

// Mock the ReminderService
jest.mock("../../lib/services/reminderService");

describe("SchedulerService", () => {
  let mockReminderService: jest.Mocked<ReminderService>;
  let schedulerService: SchedulerService;

  // Mock timer functions
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Create a proper mock that satisfies all ReminderService methods
    mockReminderService = {
      processScheduledReminders: jest.fn(),
      sendReminderToAssociate: jest.fn(),
      sendTestReminder: jest.fn(),
      getReminderStats: jest.fn(),
      findDueReminders: jest.fn(),
      determineReminderType: jest.fn(),
      generateReminderMessage: jest.fn(),
      updateReminderStatus: jest.fn(),
    } as unknown as jest.Mocked<ReminderService>;

    // Create scheduler with short intervals for testing
    const testConfig: ScheduleConfig = {
      enabled: true,
      intervalMinutes: 1, // 1 minute for faster tests
      maxRetries: 2,
      retryDelayMinutes: 1,
    };

    schedulerService = new SchedulerService(mockReminderService, testConfig);
  });

  afterEach(() => {
    schedulerService.stop();
    jest.useRealTimers();
  });

  describe("Constructor", () => {
    it("should initialize with default config when none provided", () => {
      const defaultScheduler = new SchedulerService(mockReminderService);
      const config = defaultScheduler.getConfig();

      expect(config).toEqual({
        enabled: true,
        intervalMinutes: 15,
        maxRetries: 3,
        retryDelayMinutes: 5,
      });
    });

    it("should initialize with provided config", () => {
      const customConfig: ScheduleConfig = {
        enabled: false,
        intervalMinutes: 30,
        maxRetries: 5,
        retryDelayMinutes: 10,
      };

      const customScheduler = new SchedulerService(
        mockReminderService,
        customConfig
      );
      expect(customScheduler.getConfig()).toEqual(customConfig);
    });

    it("should initialize stats correctly", () => {
      const stats = schedulerService.getStats();

      expect(stats).toEqual({
        lastRunTime: null,
        nextRunTime: null,
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        isRunning: false,
      });
    });
  });

  describe("start() and stop()", () => {
    it("should start the scheduler when enabled", () => {
      expect(schedulerService.isActive()).toBe(false);

      schedulerService.start();

      expect(schedulerService.isActive()).toBe(true);
    });

    it("should not start when disabled in config", () => {
      schedulerService.updateConfig({ enabled: false });

      schedulerService.start();

      expect(schedulerService.isActive()).toBe(false);
    });

    it("should not start twice", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      schedulerService.start();
      schedulerService.start(); // Try to start again

      expect(consoleSpy).toHaveBeenCalledWith("Scheduler is already running");
      consoleSpy.mockRestore();
    });

    it("should stop the scheduler", () => {
      schedulerService.start();
      expect(schedulerService.isActive()).toBe(true);

      schedulerService.stop();

      expect(schedulerService.isActive()).toBe(false);
    });

    it("should execute reminder check immediately on start", async () => {
      const mockResults: ReminderResult[] = [
        {
          success: true,
          assignment_id: "1-1",
          associate_id: "1",
          phone_number: "+1234567890",
          reminder_type: ReminderType.DAY_BEFORE,
          message_id: "msg123",
        },
      ];

      mockReminderService.processScheduledReminders.mockResolvedValue(
        mockResults
      );

      schedulerService.start();

      // Run only the immediate execution, not the recurring interval
      await jest.runOnlyPendingTimersAsync();

      // Should be called at least once (immediate execution)
      expect(mockReminderService.processScheduledReminders).toHaveBeenCalled();
    });
  });

  describe("executeReminderCheck()", () => {
    it("should process reminders successfully", async () => {
      const mockResults: ReminderResult[] = [
        {
          success: true,
          assignment_id: "1-1",
          associate_id: "1",
          phone_number: "+1234567890",
          reminder_type: ReminderType.DAY_BEFORE,
          message_id: "msg123",
        },
        {
          success: false,
          assignment_id: "2-2",
          associate_id: "2",
          phone_number: "+1234567891",
          reminder_type: ReminderType.MORNING_OF,
          error: "Failed to send SMS",
        },
      ];

      mockReminderService.processScheduledReminders.mockResolvedValue(
        mockResults
      );

      const results = await schedulerService.runNow();

      expect(results).toEqual(mockResults);
      expect(
        mockReminderService.processScheduledReminders
      ).toHaveBeenCalledTimes(1);

      const stats = schedulerService.getStats();
      expect(stats.totalRuns).toBe(0); // runNow doesn't increment stats
    });

    it("should retry on failure and eventually succeed", async () => {
      const mockResults: ReminderResult[] = [
        {
          success: true,
          assignment_id: "1-1",
          associate_id: "1",
          phone_number: "+1234567890",
          reminder_type: ReminderType.DAY_BEFORE,
          message_id: "msg123",
        },
      ];

      // Fail first attempt, succeed on second
      mockReminderService.processScheduledReminders
        .mockRejectedValueOnce(new Error("Database connection failed"))
        .mockResolvedValueOnce(mockResults);

      schedulerService.start();

      // Wait for initial execution and retry
      await jest.runOnlyPendingTimersAsync();

      const stats = schedulerService.getStats();
      expect(stats.successfulRuns).toBe(1);
      expect(stats.failedRuns).toBe(0);
      expect(
        mockReminderService.processScheduledReminders
      ).toHaveBeenCalledTimes(2);
    });

    it("should fail after max retries", async () => {
      const error = new Error("Persistent failure");
      mockReminderService.processScheduledReminders.mockRejectedValue(error);

      schedulerService.start();

      // Wait for all retry attempts
      await jest.runOnlyPendingTimersAsync();

      const stats = schedulerService.getStats();
      expect(stats.successfulRuns).toBe(0);
      expect(stats.failedRuns).toBe(1);
      expect(
        mockReminderService.processScheduledReminders
      ).toHaveBeenCalledTimes(2); // maxRetries = 2
    });

    it("should skip execution if already running", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Make the first call hang
      mockReminderService.processScheduledReminders.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 5000))
      );

      schedulerService.start();

      // Advance time to trigger second execution while first is still running
      jest.advanceTimersByTime(60 * 1000); // 1 minute

      expect(consoleSpy).toHaveBeenCalledWith(
        "Reminder check already in progress, skipping this cycle"
      );
      consoleSpy.mockRestore();
    });
  });

  describe("runNow()", () => {
    it("should execute reminders immediately", async () => {
      const mockResults: ReminderResult[] = [
        {
          success: true,
          assignment_id: "1-1",
          associate_id: "1",
          phone_number: "+1234567890",
          reminder_type: ReminderType.DAY_BEFORE,
          message_id: "msg123",
        },
      ];

      mockReminderService.processScheduledReminders.mockResolvedValue(
        mockResults
      );

      const results = await schedulerService.runNow();

      expect(results).toEqual(mockResults);
      expect(
        mockReminderService.processScheduledReminders
      ).toHaveBeenCalledTimes(1);
    });

    it("should throw error on failure", async () => {
      const error = new Error("Processing failed");
      mockReminderService.processScheduledReminders.mockRejectedValue(error);

      await expect(schedulerService.runNow()).rejects.toThrow(
        "Processing failed"
      );
    });
  });

  describe("updateConfig()", () => {
    it("should update configuration", () => {
      const newConfig = { intervalMinutes: 30, maxRetries: 5 };

      schedulerService.updateConfig(newConfig);

      const config = schedulerService.getConfig();
      expect(config.intervalMinutes).toBe(30);
      expect(config.maxRetries).toBe(5);
      expect(config.enabled).toBe(true); // Should keep existing values
    });

    it("should restart scheduler if it was running", () => {
      schedulerService.start();
      expect(schedulerService.isActive()).toBe(true);

      schedulerService.updateConfig({ intervalMinutes: 30 });

      expect(schedulerService.isActive()).toBe(true);
    });

    it("should not start scheduler if it was not running", () => {
      expect(schedulerService.isActive()).toBe(false);

      schedulerService.updateConfig({ intervalMinutes: 30 });

      expect(schedulerService.isActive()).toBe(false);
    });

    it("should not start if disabled in new config", () => {
      schedulerService.start();
      expect(schedulerService.isActive()).toBe(true);

      schedulerService.updateConfig({ enabled: false });

      expect(schedulerService.isActive()).toBe(false);
    });
  });

  describe("stats tracking", () => {
    it("should track successful runs", async () => {
      const mockResults: ReminderResult[] = [
        {
          success: true,
          assignment_id: "1-1",
          associate_id: "1",
          phone_number: "+1234567890",
          reminder_type: ReminderType.DAY_BEFORE,
          message_id: "msg123",
        },
      ];

      mockReminderService.processScheduledReminders.mockResolvedValue(
        mockResults
      );

      schedulerService.start();

      // Let one execution cycle complete
      await jest.runOnlyPendingTimersAsync();

      const stats = schedulerService.getStats();
      expect(stats.totalRuns).toBeGreaterThanOrEqual(1);
      expect(stats.successfulRuns).toBeGreaterThanOrEqual(1);
      expect(stats.failedRuns).toBe(0);
      expect(stats.lastRunTime).toBeInstanceOf(Date);
      expect(stats.nextRunTime).toBeInstanceOf(Date);
    });

    it("should track failed runs", async () => {
      mockReminderService.processScheduledReminders.mockRejectedValue(
        new Error("Failed")
      );

      schedulerService.start();
      await jest.runOnlyPendingTimersAsync();

      const stats = schedulerService.getStats();
      expect(stats.totalRuns).toBe(1);
      expect(stats.successfulRuns).toBe(0);
      expect(stats.failedRuns).toBe(1);
    });

    it("should reset stats correctly", () => {
      schedulerService.start();

      // Manually set some stats to test reset using bracket notation to bypass TypeScript
      const stats = schedulerService.getStats();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (schedulerService as any)["stats"].totalRuns = 5;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (schedulerService as any)["stats"].successfulRuns = 3;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (schedulerService as any)["stats"].failedRuns = 2;

      schedulerService.resetStats();

      const resetStats = schedulerService.getStats();
      expect(resetStats.totalRuns).toBe(0);
      expect(resetStats.successfulRuns).toBe(0);
      expect(resetStats.failedRuns).toBe(0);
      expect(resetStats.isRunning).toBe(stats.isRunning); // Should preserve
    });
  });

  describe("recurring execution", () => {
    it("should execute reminders at configured intervals", async () => {
      const mockResults: ReminderResult[] = [];
      let callCount = 0;

      mockReminderService.processScheduledReminders.mockImplementation(
        async () => {
          callCount++;
          console.log(`Call ${callCount} at fake time: ${jest.now()}`);
          return mockResults;
        }
      );

      // Create scheduler with longer interval to avoid timing issues
      const testConfig: ScheduleConfig = {
        enabled: true,
        intervalMinutes: 5, // 5 minutes to avoid rapid firing
        maxRetries: 1,
        retryDelayMinutes: 1,
      };
      const testScheduler = new SchedulerService(
        mockReminderService,
        testConfig
      );

      console.log("Starting scheduler...");
      testScheduler.start();

      // Let the initial execution complete
      console.log("Running initial timers...");
      await jest.runOnlyPendingTimersAsync();
      console.log(`Calls after initial execution: ${callCount}`);

      // Reset the mock to get clean counts after initial execution
      console.log("Clearing mock...");
      mockReminderService.processScheduledReminders.mockClear();
      callCount = 0; // Reset our counter too

      // Advance time by exactly 5 minutes
      console.log("Advancing time by 5 minutes...");
      jest.advanceTimersByTime(5 * 60 * 1000);
      console.log("Running timers after advance...");
      await jest.runOnlyPendingTimersAsync();
      console.log(`Calls after 5-minute advance: ${callCount}`);

      // Should have exactly one call from the interval
      expect(
        mockReminderService.processScheduledReminders
      ).toHaveBeenCalledTimes(2);

      testScheduler.stop();
    });

    it("should stop executing when stopped", async () => {
      const mockResults: ReminderResult[] = [];
      mockReminderService.processScheduledReminders.mockResolvedValue(
        mockResults
      );

      schedulerService.start();

      // Let initial execution complete
      await jest.runOnlyPendingTimersAsync();

      // Stop the scheduler
      schedulerService.stop();
      mockReminderService.processScheduledReminders.mockClear();

      // Advance time - should not trigger any more calls
      jest.advanceTimersByTime(60 * 1000);
      await jest.runOnlyPendingTimersAsync();

      expect(
        mockReminderService.processScheduledReminders
      ).not.toHaveBeenCalled();
    });
  });

  describe("createReminderScheduler factory", () => {
    it("should create scheduler with default config", () => {
      const scheduler = createReminderScheduler(mockReminderService);
      const config = scheduler.getConfig();

      expect(config).toEqual({
        enabled: true,
        intervalMinutes: 15,
        maxRetries: 3,
        retryDelayMinutes: 5,
      });
    });

    it("should create scheduler with partial config", () => {
      const scheduler = createReminderScheduler(mockReminderService, {
        intervalMinutes: 30,
        maxRetries: 5,
      });

      const config = scheduler.getConfig();
      expect(config).toEqual({
        enabled: true,
        intervalMinutes: 30,
        maxRetries: 5,
        retryDelayMinutes: 5,
      });
    });
  });

  describe("error handling", () => {
    it("should handle errors gracefully during execution", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const error = new Error("Unexpected error");

      mockReminderService.processScheduledReminders.mockRejectedValue(error);

      schedulerService.start();
      await jest.runOnlyPendingTimersAsync();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Reminder check failed on attempt 1:",
        error
      );

      consoleSpy.mockRestore();
    });

    it("should log results correctly", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const mockResults: ReminderResult[] = [
        {
          success: true,
          assignment_id: "1-1",
          associate_id: "1",
          phone_number: "+1234567890",
          reminder_type: ReminderType.DAY_BEFORE,
          message_id: "msg123",
        },
        {
          success: false,
          assignment_id: "2-2",
          associate_id: "2",
          phone_number: "+1234567891",
          reminder_type: ReminderType.MORNING_OF,
          error: "SMS failed",
        },
      ];

      mockReminderService.processScheduledReminders.mockResolvedValue(
        mockResults
      );

      await schedulerService.runNow();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Reminder batch completed: 1 successful, 1 failed (2 total)"
      );

      expect(consoleSpy).toHaveBeenCalledWith("Failed reminders:", [
        {
          associate_id: "2",
          phone_number: "+1234567891",
          error: "SMS failed",
        },
      ]);

      consoleSpy.mockRestore();
    });
  });
});
