// Server-only helpers for time math.
// Assumptions: DB stores work_date as 'YYYY-MM-DD' and start_time as UTC ISO strings.

const DEFAULT_AGENCY_TZ = process.env.AGENCY_TZ || "America/Denver";
export const AGENCY_TZ = DEFAULT_AGENCY_TZ;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

const dateTimeFormatCache = new Map<string, Intl.DateTimeFormat>();

function getDateTimeFormatter(timeZone: string) {
  if (!dateTimeFormatCache.has(timeZone)) {
    dateTimeFormatCache.set(
      timeZone,
      new Intl.DateTimeFormat("en-CA", {
        timeZone,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  }
  return dateTimeFormatCache.get(timeZone)!;
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const formatter = getDateTimeFormatter(timeZone);
  const parts = formatter.formatToParts(date);
  const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const zonedAsUTC = Date.UTC(
    Number(partMap.year),
    Number(partMap.month) - 1,
    Number(partMap.day),
    Number(partMap.hour),
    Number(partMap.minute),
    Number(partMap.second)
  );
  return zonedAsUTC - date.getTime();
}

function parseTimeParts(time: string): [number, number, number] {
  const trimmed = time.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    throw new Error(`Invalid time value "${time}"`);
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? "0");
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    Number.isNaN(second) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    throw new Error(`Invalid time value "${time}"`);
  }
  return [hour, minute, second];
}

export function localDateTimeToUTCISO(
  workDateISO: string,
  localHHmmss: string,
  timeZone: string = AGENCY_TZ
): string {
  if (!workDateISO) {
    throw new Error("workDateISO is required to convert local time to UTC");
  }
  const [year, month, day] = workDateISO.split("-").map(Number);
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    throw new Error(`Invalid workDateISO value "${workDateISO}"`);
  }
  const [hour, minute, second] = parseTimeParts(localHHmmss);
  const baseUtcMs = Date.UTC(year, month - 1, day, hour, minute, second, 0);

  let utcMs = baseUtcMs;
  for (let i = 0; i < 3; i++) {
    const offset = getTimeZoneOffsetMs(new Date(utcMs), timeZone);
    const candidate = baseUtcMs - offset;
    if (Math.abs(candidate - utcMs) < 1) {
      utcMs = candidate;
      break;
    }
    utcMs = candidate;
  }

  return new Date(utcMs).toISOString();
}

export function localDateTimeToUTCDate(
  workDateISO: string,
  localHHmmss: string,
  timeZone: string = AGENCY_TZ
): Date {
  return new Date(localDateTimeToUTCISO(workDateISO, localHHmmss, timeZone));
}

export function eventUTC(workDateISO: string, utcHHmm: string): Date {
  const [y, m, d] = workDateISO.split("-").map(Number);
  const [hh, mm] = utcHHmm.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0));
}

export function dateISOInTZ(date: Date, tz = AGENCY_TZ): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = Number(parts.find((p) => p.type === "year")!.value);
  const m = Number(parts.find((p) => p.type === "month")!.value);
  const d = Number(parts.find((p) => p.type === "day")!.value);
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d, 0, 0, 0);
  const t2 = new Date(t + days * 86400000);
  return `${t2.getUTCFullYear()}-${pad2(t2.getUTCMonth() + 1)}-${pad2(
    t2.getUTCDate()
  )}`;
}

// Format local wall-clock time for SMS in a target TZ (e.g., America/Denver)
export function hhmm12InTZ(
  utcHHmm: string,
  workDateISO: string,
  tz = AGENCY_TZ
): string {
  const dt = eventUTC(workDateISO, utcHHmm);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(dt);
}

export function prettyDateInTZ(workDateISO: string, tz = AGENCY_TZ): string {
  const [y, m, d] = workDateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)); // noon UTC to avoid any weirdness
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(dt);
}
