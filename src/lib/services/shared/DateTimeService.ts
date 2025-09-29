// Shared date and time utilities

export class DateTimeService {
  /**
   * Combine date and time string into a Date object
   */
  combineDateTime(date: Date, timeString: string): Date {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    const [hours, minutes] = timeString.split(":").map(Number);

    return new Date(year, month, day, hours, minutes, 0, 0);
  }

  /**
   * Format time string to readable format (e.g., "2:30 PM")
   */
  formatTime(timeString: string): string {
    const [hours, minutes] = timeString.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours > 12 ? hours - 12 : hours || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  }

  /**
   * Calculate hours difference between two dates
   */
  getHoursDifference(from: Date, to: Date): number {
    return (to.getTime() - from.getTime()) / (1000 * 60 * 60);
  }

  /**
   * Get current date in YYYY-MM-DD format
   */
  getCurrentDateString(): string {
    return new Date().toISOString().split("T")[0];
  }

  /**
   * Get date string for N days from now
   */
  getDateStringFromNow(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  }

  /**
   * Check if a date is today
   */
  isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  /**
   * Check if a date is tomorrow
   */
  isTomorrow(date: Date): boolean {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return (
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear()
    );
  }

  /**
   * Get time zone offset in hours
   */
  getTimezoneOffset(): number {
    return new Date().getTimezoneOffset() / -60;
  }

  /**
   * Create a delay promise
   */
  delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
