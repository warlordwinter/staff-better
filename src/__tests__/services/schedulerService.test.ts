import {
  SchedulerService,
  createReminderScheduler,
} from "@/lib/services/schedulerService";
import {
  ReminderService,
  ReminderResult,
} from "@/lib/services/reminderService";

jest.useFakeTimers();

describe("SchedulerService", () => {
  let reminderService: jest.Mocked<ReminderService>;
  let scheduler: SchedulerService;

  beforeEach(() => {
    jest.resetAllMocks();
    reminderService = {
      processScheduledReminders: jest.fn<Promise<ReminderResult[]>, []>(),
    } as unknown as jest.Mocked<ReminderService>;

    scheduler = new SchedulerService(reminderService, {
      enabled: true,
      intervalMinutes: 1,
      maxRetries: 2,
      retryDelayMinutes: 1,
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    scheduler.stop();
  });

  it("starts, runs immediately, and schedules next runs", async () => {
    reminderService.processScheduledReminders.mockResolvedValue([]);

    scheduler.start();

    // Wait for the immediate execution to complete
    jest.advanceTimersByTime(0);
    await Promise.resolve();

    // Immediate run triggers once
    expect(reminderService.processScheduledReminders).toHaveBeenCalledTimes(1);

    // Advance time to trigger interval run
    jest.advanceTimersByTime(60 * 1000);
    await Promise.resolve(); // Allow any pending promises to resolve
    expect(reminderService.processScheduledReminders).toHaveBeenCalledTimes(2);

    const stats = scheduler.getStats();
    expect(stats.totalRuns).toBe(2); // More precise assertion
    expect(scheduler.isActive()).toBe(true);
  });

  it("stops the scheduler and clears interval", () => {
    reminderService.processScheduledReminders.mockResolvedValue([]);
    scheduler.start();

    scheduler.stop();
    expect(scheduler.isActive()).toBe(false);

    // Advancing time should not trigger more runs
    const callsBefore =
      reminderService.processScheduledReminders.mock.calls.length;
    jest.advanceTimersByTime(5 * 60 * 1000);
    expect(reminderService.processScheduledReminders).toHaveBeenCalledTimes(
      callsBefore
    );
  });

  it("retries on failure up to maxRetries", async () => {
    const error = new Error("boom");
    // First attempt fails, second attempt succeeds
    reminderService.processScheduledReminders
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce([]);

    // Start the scheduler to trigger executeReminderCheck which has retry logic
    scheduler.start();

    // Wait for the immediate execution and retry to complete
    await Promise.resolve();

    // Advance timers to allow the retry delay to complete
    jest.advanceTimersByTime(60 * 1000); // 1 minute retry delay
    await Promise.resolve();

    expect(reminderService.processScheduledReminders).toHaveBeenCalledTimes(2);
  });

  it("factory creates a scheduler with merged config", () => {
    reminderService.processScheduledReminders.mockResolvedValue([]);
    const created = createReminderScheduler(reminderService, {
      intervalMinutes: 2,
    });
    expect(created.getConfig().intervalMinutes).toBe(2);
  });
});
