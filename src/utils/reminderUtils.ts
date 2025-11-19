/**
 * Utility functions for displaying reminder send times
 */

/**
 * Calculate and format reminder send times for display
 * Day Before: 7 PM local time the day before
 * Morning Of: 7 AM local time on the day of
 */
export function formatReminderSendTimes(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _workDate: string | null | undefined,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _startTime: string | null | undefined
): string {
  // Always show default send times: 7 PM day before and 7 AM day of
  // Format: "7 PM night before • 7 AM day of" (no colons, simpler)
  const formatSimpleTime = (hours: number): string => {
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;
    return `${displayHour} ${ampm}`;
  };

  // Default times: 7 PM (19:00) day before, 7 AM (07:00) day of
  return `Reminder sends at: ${formatSimpleTime(
    19
  )} night before • ${formatSimpleTime(7)} day of`;
}

/**
 * Format reminder send times for detail view with bolded times
 */
export function formatReminderSendTimesDetail(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _workDate: string | null | undefined,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _startTime: string | null | undefined
): string {
  // Always show default send times: 7:00 PM day before and 7:00 AM day of
  // Format times with colons and minutes
  const formatTime = (hours: number, minutes: number = 0): string => {
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  // Default times: 7:00 PM (19:00) day before, 7:00 AM (07:00) day of
  const dayBeforeTime = formatTime(19, 0); // 7:00 PM
  const morningOfTime = formatTime(7, 0); // 7:00 AM

  return `Reminder sends at **${dayBeforeTime}** night before and **${morningOfTime}** day of shift`;
}
