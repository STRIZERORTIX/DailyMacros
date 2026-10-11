// All dates are "YYYY-MM-DD" strings in the phone's local time (IST for you), matching the server.
const pad = (n: number) => String(n).padStart(2, "0");

export const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const todayStr = () => toDateStr(new Date());

export const addDays = (s: string, n: number) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
};

export const isSunday = (s: string) => parseDate(s).getDay() === 0;

export const longDate = (s: string) =>
  parseDate(s).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

export function dayLabel(s: string): string {
  const t = todayStr();
  if (s === t) return "Today";
  if (s === addDays(t, -1)) return "Yesterday";
  if (s === addDays(t, 1)) return "Tomorrow";
  return parseDate(s).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

/** Which meal to pre-select, based on the time of day. */
export function suggestedMeal(now = new Date()): "breakfast" | "lunch" | "snack" | "dinner" {
  const h = now.getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 18) return "snack";
  return "dinner";
}
