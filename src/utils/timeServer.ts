// Server-only helpers for time math.
// Assumptions: DB stores work_date as 'YYYY-MM-DD' and start_time as UTC 'HH:mm'.

export const AGENCY_TZ = "America/Denver"; // change if you later store associate-specific TZ

function pad2(n: number) {
  return String(n).padStart(2, "0");
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
  const y = Number(parts.find(p => p.type === "year")!.value);
  const m = Number(parts.find(p => p.type === "month")!.value);
  const d = Number(parts.find(p => p.type === "day")!.value);
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d, 0, 0, 0);
  const t2 = new Date(t + days * 86400000);
  return `${t2.getUTCFullYear()}-${pad2(t2.getUTCMonth() + 1)}-${pad2(t2.getUTCDate())}`;
}

// Format local wall-clock time for SMS in a target TZ (e.g., America/Denver)
export function hhmm12InTZ(utcHHmm: string, workDateISO: string, tz = AGENCY_TZ): string {
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
