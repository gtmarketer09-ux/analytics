// Date helpers. Dates are plain 'YYYY-MM-DD' strings.

export function addDays(date: string, days: number): string {
  if (!isDate(date)) {
    throw new Error(`Invalid date value passed to addDays: ${String(date)}`);
  }
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Yesterday's date in the given time zone, e.g. 'Asia/Karachi'. */
export function yesterday(timeZone: string): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
  return addDays(today, -1);
}

export function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

/** Inclusive number of days between two dates. */
export function dayCount(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
}

/** '2026-10-30' -> { year: 2026, month: 10, day: 30 } (AdMob API format). */
export function toApiDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}