// Pure helpers for the weight log (no imports, easy to test).

export type WeightPoint = { date: string; weightKg: number };

/** Whole days since 1970, from "YYYY-MM-DD" (timezone and daylight-saving safe). */
export const dayIndex = (s: string): number => {
  const [y, m, d] = s.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};

export const latestPoint = (pts: readonly WeightPoint[]): WeightPoint | null =>
  pts.length ? pts.reduce((a, b) => (b.date > a.date ? b : a)) : null;

function avgIn(pts: readonly WeightPoint[], fromIdx: number, toIdx: number): number | null {
  const xs = pts.filter((p) => {
    const i = dayIndex(p.date);
    return i >= fromIdx && i <= toIdx;
  });
  return xs.length ? xs.reduce((s, p) => s + p.weightKg, 0) / xs.length : null;
}

/** Average of the last 7 days vs the 7 days before. Single weigh-ins bounce around, averages do not. */
export function weeklyAverages(pts: readonly WeightPoint[], today: string) {
  const t = dayIndex(today);
  const current = avgIn(pts, t - 6, t);
  const previous = avgIn(pts, t - 13, t - 7);
  return { current, previous, change: current !== null && previous !== null ? current - previous : null };
}

/** Least-squares trend in kg per week (negative = losing) over the last `windowDays`. Needs 3+ points over 7+ days. */
export function slopePerWeek(pts: readonly WeightPoint[], today: string, windowDays = 28): number | null {
  const t = dayIndex(today);
  const xs = pts
    .map((p) => ({ x: dayIndex(p.date), y: p.weightKg }))
    .filter((p) => p.x >= t - windowDays && p.x <= t);
  if (xs.length < 3) return null;
  const minX = Math.min(...xs.map((p) => p.x));
  const maxX = Math.max(...xs.map((p) => p.x));
  if (maxX - minX < 7) return null;
  const mx = xs.reduce((s, p) => s + p.x, 0) / xs.length;
  const my = xs.reduce((s, p) => s + p.y, 0) / xs.length;
  let num = 0;
  let den = 0;
  for (const p of xs) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  return den === 0 ? null : (num / den) * 7;
}

export type Advice = { tone: "good" | "warn" | "info"; text: string };

const kg = (n: number) => (Math.round(Math.abs(n) * 100) / 100).toString();

export function trendAdvice(
  slope: number | null,
  weightKg: number | null,
  goalMode: "lose" | "maintain" | "gain" = "lose",
): Advice {
  if (slope === null) {
    return { tone: "info", text: "Log your weight 3 or more times a week for 2 weeks to see a trend." };
  }
  const weight = weightKg ?? 80;
  if (goalMode === "maintain") {
    if (Math.abs(slope) <= 0.1) return { tone: "good", text: "On track: your weight is staying around maintenance." };
    return {
      tone: "info",
      text: `${slope > 0 ? "Trending up" : "Trending down"} about ${kg(slope)} kg a week. Adjust calories if you want your weight to stay steadier.`,
    };
  }
  if (goalMode === "gain") {
    if (slope > 0.005 * weight) {
      return { tone: "warn", text: `Gaining about ${kg(slope)} kg a week, which may be fast for a lean bulk. Consider a smaller surplus.` };
    }
    if (slope >= 0.1) return { tone: "good", text: `On track for a gradual gain: about ${kg(slope)} kg a week.` };
    if (slope < -0.1) {
      return { tone: "warn", text: `Weight is trending down about ${kg(slope)} kg a week. Consider eating a little more to support your bulk.` };
    }
    return { tone: "info", text: "Weight is fairly steady. Review your trend over another couple of weeks before changing calories." };
  }

  const tooFast = -0.01 * weight; // more than 1% of body weight per week
  if (slope < tooFast) {
    return {
      tone: "warn",
      text: `Losing about ${kg(slope)} kg a week, which is fast. Eat a little more to protect muscle and keep hunger down.`,
    };
  }
  if (slope <= -0.25) return { tone: "good", text: `On track: about ${kg(slope)} kg a week.` };
  if (slope < 0.1) {
    return {
      tone: "warn",
      text: "Weight is flat. If it has been flat for 2 weeks, trim about 150-200 kcal (a smaller rice portion or one banana less) or add steps.",
    };
  }
  return {
    tone: "warn",
    text: `Trending up about ${kg(slope)} kg a week. Check portions and extras, then trim about 200 kcal.`,
  };
}
