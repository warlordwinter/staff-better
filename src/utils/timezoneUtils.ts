// src/utils/timezoneUtils.ts

function toHHmm(h: number, m: number) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Accepts workDate as 'YYYY-MM-DD' OR a Date (we normalize to ISO date string)
function normalizeDateInput(date: string | Date): {
  y: number;
  m: number;
  d: number;
} {
  const iso =
    typeof date === "string"
      ? date
      : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(date.getDate()).padStart(2, "0")}`;
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

/**
 * Convert UTC time (HH:mm or HH:mm:ss) to LOCAL display "HH:mm" for the given work date.
 * No timezone label is returned.
 */
export function convertUTCTimeToLocal(
  utcTime: string,
  workDate: string | Date
): string {
  if (!utcTime || !workDate) return "";

  // Handle full timestamp format (e.g., "2025-10-22T19:14:00+00:00")
  if (utcTime.includes("T")) {
    const ts = new Date(utcTime);
    if (isNaN(ts.getTime())) {
      console.warn(`Invalid timestamp format: "${utcTime}"`);
      return "";
    }

    // Convert UTC to Mountain Time for display
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Denver",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    }).format(ts);
  }

  // Handle time-only format (e.g., "19:14")
  const [uh, um] = utcTime.split(":").map(Number); // seconds ignored if present
  const { y, m, d } = normalizeDateInput(workDate);

  // Timestamp representing that UTC time on that calendar day
  const ts = new Date(Date.UTC(y, m - 1, d, uh, um, 0));

  // Convert UTC to Mountain Time for display
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).format(ts);
}

/**
 * Convert LOCAL input "HH:mm" to UTC "HH:mm" for storage, anchored to the work date.
 */
export function convertLocalTimeToUTC(
  localTime: string | undefined,
  workDate: string | Date
): string {
  if (!localTime || !workDate) return "";

  // Validate the time format
  const timeMatch = localTime.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) {
    console.warn(`Invalid time format: "${localTime}"`);
    return "";
  }

  const [, hourStr, minuteStr] = timeMatch;
  const lh = parseInt(hourStr, 10);
  const lm = parseInt(minuteStr, 10);

  // Validate hour and minute values
  if (isNaN(lh) || isNaN(lm) || lh < 0 || lh > 23 || lm < 0 || lm > 59) {
    console.warn(`Invalid time values: hour=${lh}, minute=${lm}`);
    return "";
  }

  const { y, m, d } = normalizeDateInput(workDate);

  // Build a timestamp at that Mountain Time on that date
  // Use Intl.DateTimeFormat to properly handle Mountain Time
  const mountainTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Create a date string in Mountain Time format
  const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(
    2,
    "0"
  )}`;
  const timeStr = `${String(lh).padStart(2, "0")}:${String(lm).padStart(
    2,
    "0"
  )}:00`;
  const mountainDateTime = `${dateStr}T${timeStr}`;

  // Parse as Mountain Time and convert to UTC
  const localTs = new Date(mountainDateTime + "-07:00"); // Mountain Time is UTC-7

  // Read UTC HH:mm for storage
  return toHHmm(localTs.getUTCHours(), localTs.getUTCMinutes());
}

/**
 * Optional 12-hour display from a UTC time, still with no tz label.
 */
export function formatTimeForDisplay(
  utcTime: string,
  workDate: string | Date
): string {
  if (!utcTime || !workDate) return "";
  const [uh, um] = utcTime.split(":").map(Number);
  const { y, m, d } = normalizeDateInput(workDate);
  const ts = new Date(Date.UTC(y, m - 1, d, uh, um, 0));
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(ts);
}

/**
 * Get today's date (YYYY-MM-DD) in the viewer's local timezone.
 */
export function getCurrentDateInUserTimezone(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 12-hour rendering of a local "HH:mm" string (no timezone label)
export function to12HourDisplay(localHHmm: string | undefined): string {
  if (!localHHmm) return "";
  const [h, m] = localHHmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}
