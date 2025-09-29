// Tests for DateTimeService

import { DateTimeService } from "@/lib/services/shared/DateTimeService";

describe("DateTimeService", () => {
  let dateTimeService: DateTimeService;

  beforeEach(() => {
    dateTimeService = new DateTimeService();
  });

  describe("combineDateTime", () => {
    it("should combine date and time correctly", () => {
      const date = new Date("2023-10-01");
      const timeString = "14:30";

      const result = dateTimeService.combineDateTime(date, timeString);

      expect(result.getFullYear()).toBe(2023);
      expect(result.getMonth()).toBe(9); // October is month 9 (0-indexed)
      expect(result.getDate()).toBe(1);
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);
    });

    it("should handle midnight times", () => {
      const date = new Date("2023-10-01");
      const timeString = "00:00";

      const result = dateTimeService.combineDateTime(date, timeString);

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });

    it("should handle end of day times", () => {
      const date = new Date("2023-10-01");
      const timeString = "23:59";

      const result = dateTimeService.combineDateTime(date, timeString);

      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
    });
  });

  describe("formatTime", () => {
    it("should format AM times correctly", () => {
      expect(dateTimeService.formatTime("09:00")).toBe("9:00 AM");
      expect(dateTimeService.formatTime("00:30")).toBe("12:30 AM");
      expect(dateTimeService.formatTime("11:45")).toBe("11:45 AM");
    });

    it("should format PM times correctly", () => {
      expect(dateTimeService.formatTime("13:00")).toBe("1:00 PM");
      expect(dateTimeService.formatTime("15:30")).toBe("3:30 PM");
      expect(dateTimeService.formatTime("23:59")).toBe("11:59 PM");
    });

    it("should handle noon and midnight", () => {
      expect(dateTimeService.formatTime("12:00")).toBe("12:00 PM");
      expect(dateTimeService.formatTime("00:00")).toBe("12:00 AM");
    });
  });

  describe("getHoursDifference", () => {
    it("should calculate hours difference correctly", () => {
      const from = new Date("2023-10-01T10:00:00Z");
      const to = new Date("2023-10-01T14:00:00Z");

      const result = dateTimeService.getHoursDifference(from, to);
      expect(result).toBe(4);
    });

    it("should handle negative differences", () => {
      const from = new Date("2023-10-01T14:00:00Z");
      const to = new Date("2023-10-01T10:00:00Z");

      const result = dateTimeService.getHoursDifference(from, to);
      expect(result).toBe(-4);
    });

    it("should handle fractional hours", () => {
      const from = new Date("2023-10-01T10:00:00Z");
      const to = new Date("2023-10-01T12:30:00Z");

      const result = dateTimeService.getHoursDifference(from, to);
      expect(result).toBe(2.5);
    });
  });

  describe("getCurrentDateString", () => {
    it("should return current date in YYYY-MM-DD format", () => {
      const result = dateTimeService.getCurrentDateString();
      const expected = new Date().toISOString().split("T")[0];

      expect(result).toBe(expected);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("getDateStringFromNow", () => {
    it("should return future date string", () => {
      const result = dateTimeService.getDateStringFromNow(7);
      const expected = new Date();
      expected.setDate(expected.getDate() + 7);
      const expectedString = expected.toISOString().split("T")[0];

      expect(result).toBe(expectedString);
    });

    it("should handle negative days", () => {
      const result = dateTimeService.getDateStringFromNow(-1);
      const expected = new Date();
      expected.setDate(expected.getDate() - 1);
      const expectedString = expected.toISOString().split("T")[0];

      expect(result).toBe(expectedString);
    });
  });

  describe("isToday", () => {
    it("should identify today's date", () => {
      const today = new Date();
      expect(dateTimeService.isToday(today)).toBe(true);
    });

    it("should not identify yesterday's date", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(dateTimeService.isToday(yesterday)).toBe(false);
    });

    it("should not identify tomorrow's date", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(dateTimeService.isToday(tomorrow)).toBe(false);
    });
  });

  describe("isTomorrow", () => {
    it("should identify tomorrow's date", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(dateTimeService.isTomorrow(tomorrow)).toBe(true);
    });

    it("should not identify today's date", () => {
      const today = new Date();
      expect(dateTimeService.isTomorrow(today)).toBe(false);
    });

    it("should not identify day after tomorrow's date", () => {
      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      expect(dateTimeService.isTomorrow(dayAfterTomorrow)).toBe(false);
    });
  });

  describe("getTimezoneOffset", () => {
    it("should return timezone offset in hours", () => {
      const offset = dateTimeService.getTimezoneOffset();
      expect(typeof offset).toBe("number");
      expect(offset).toBeGreaterThanOrEqual(-12);
      expect(offset).toBeLessThanOrEqual(14);
    });
  });

  describe("delay", () => {
    it("should create a delay promise", async () => {
      const start = Date.now();
      await dateTimeService.delay(100);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(90); // Allow some tolerance
    });
  });
});
