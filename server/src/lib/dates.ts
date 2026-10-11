// Dates are plain "YYYY-MM-DD" strings in the user's local day (the client decides which day it is).
// This avoids timezone bugs: a meal logged at 11:50 pm IST stays on that IST day.

export function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(date) + days * 86_400_000).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Calendar weekday of a YYYY-MM-DD date, independent of the server's timezone. */
export function isSunday(date: string): boolean {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
}

export function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  for (let cur = from; cur <= to; cur = shiftDate(cur, 1)) out.push(cur);
  return out;
}

/** Inclusive window ending on `end`. Day = 1, week = 7, month = 30. */
export function rangeWindow(range: "day" | "week" | "month", end: string): { from: string; to: string } {
  const days = range === "day" ? 1 : range === "week" ? 7 : 30;
  return { from: shiftDate(end, 1 - days), to: end };
}
