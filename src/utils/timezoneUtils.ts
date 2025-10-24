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
  const [uh, um] = utcTime.split(":").map(Number); // seconds ignored if present
  const { y, m, d } = normalizeDateInput(workDate);

  // Timestamp representing that UTC time on that calendar day
  const ts = new Date(Date.UTC(y, m - 1, d, uh, um, 0));

  // READ as local wall clock (viewer’s zone)
  // If you must force Mountain Time everywhere:
  // return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', hour12: false, hour: '2-digit', minute: '2-digit' }).format(ts);
  return toHHmm(ts.getHours(), ts.getMinutes());
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

  // Build a timestamp at that local wall clock time on that date (viewer's zone)
  // If you must force Mountain Time even for users outside MT, you need a TZ library; the plain Date constructor can't build "America/Denver" times on a non-MT machine reliably.
  const localTs = new Date(y, m - 1, d, lh, lm, 0);

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
