/**
 * Utility functions for displaying reminder send times
 */

/**
 * Calculate and format reminder send times for display
 * Uses the actual reminder times from the job, with fallback to defaults
 */
export function formatReminderSendTimes(
  _workDate: string | null | undefined,
  _startTime: string | null | undefined,
  nightBeforeTime?: string | null,
  dayOfTime?: string | null
): string {
  // Format time string (HH:MM) to display format (e.g., "19:00" -> "7 PM")
  const formatSimpleTime = (
    timeString: string | null | undefined,
    defaultHour: number
  ): string => {
    if (timeString) {
      const [hours] = timeString.split(":");
      const hour = parseInt(hours, 10);
      if (!isNaN(hour)) {
        const ampm = hour >= 12 ? "PM" : "AM";
        const displayHour = hour % 12 || 12;
        return `${displayHour} ${ampm}`;
      }
    }
    // Fallback to default
    const ampm = defaultHour >= 12 ? "PM" : "AM";
    const displayHour = defaultHour % 12 || 12;
    return `${displayHour} ${ampm}`;
  };

  // Use actual times from job, with defaults: 7 PM (19:00) day before, 7 AM (07:00) day of
  const nightBefore = formatSimpleTime(nightBeforeTime, 19);
  const dayOf = formatSimpleTime(dayOfTime, 7);

  return `Reminder sends at: ${nightBefore} day before • ${dayOf} day of`;
}

/**
 * Format reminder send times for detail view with bolded times
 * Uses the actual reminder times from the job, with fallback to defaults
 */
export function formatReminderSendTimesDetail(
  _workDate: string | null | undefined,
  _startTime: string | null | undefined,
  nightBeforeTime?: string | null,
  dayOfTime?: string | null
): string {
  // Format time string (HH:MM) to display format with minutes (e.g., "19:00" -> "7:00 PM")
  const formatTime = (
    timeString: string | null | undefined,
    defaultHour: number,
    defaultMinute: number = 0
  ): string => {
    if (timeString) {
      const [hours, minutes = "00"] = timeString.split(":");
      const hour = parseInt(hours, 10);
      const minute = parseInt(minutes, 10);
      if (!isNaN(hour)) {
        const ampm = hour >= 12 ? "PM" : "AM";
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minute.toString().padStart(2, "0")} ${ampm}`;
      }
    }
    // Fallback to default
    const ampm = defaultHour >= 12 ? "PM" : "AM";
    const displayHour = defaultHour % 12 || 12;
    return `${displayHour}:${defaultMinute
      .toString()
      .padStart(2, "0")} ${ampm}`;
  };

  // Use actual times from job, with defaults: 7:00 PM (19:00) day before, 7:00 AM (07:00) day of
  const dayBeforeTime = formatTime(nightBeforeTime, 19, 0);
  const morningOfTime = formatTime(dayOfTime, 7, 0);

  return `Reminder sends at **${dayBeforeTime}** day before and **${morningOfTime}** day of`;
}
