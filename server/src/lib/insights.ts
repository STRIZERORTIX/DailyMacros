import { MEALS, type Meal } from "./constants.js";
import { dayTargets, type Profile } from "./calc.js";
import { eachDate, shiftDate } from "./dates.js";
import { emptyTotals, sumTotals, type Totals } from "./nutrition.js";
import { slopePerWeek, weeklyAverages, type WeightPoint } from "./weight.js";

export type InsightEntry = { date: string; meal: Meal; totals: Totals };

function hitCalories(kcal: number, target: number): boolean {
  const slack = Math.max(100, target * 0.1);
  return Math.abs(kcal - target) <= slack;
}

function hitProtein(protein: number, target: number): boolean {
  return protein >= target * 0.9;
}

function loggingStreak(logged: Set<string>, end: string): number {
  let d = logged.has(end) ? end : shiftDate(end, -1);
  let n = 0;
  while (logged.has(d)) {
    n += 1;
    d = shiftDate(d, -1);
  }
  return n;
}

export function buildInsights(input: {
  range: "day" | "week" | "month";
  from: string;
  to: string;
  profile: Profile;
  entries: InsightEntry[];
  loggedDates: string[];
  weights: WeightPoint[];
}) {
  const { range, from, to, profile, entries, loggedDates, weights } = input;
  const byDate = new Map<string, InsightEntry[]>();
  for (const e of entries) {
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  }

  const days = eachDate(from, to).map((date) => {
    const dayEntries = byDate.get(date) ?? [];
    const totals = sumTotals(dayEntries.map((e) => e.totals));
    const byMeal = Object.fromEntries(
      MEALS.map((m) => [m, sumTotals(dayEntries.filter((e) => e.meal === m).map((e) => e.totals))]),
    ) as Record<Meal, Totals>;
    const target = dayTargets(profile, date);
    const logged = dayEntries.length > 0;
    return {
      date,
      totals,
      byMeal,
      target,
      logged,
      hitCalories: logged && hitCalories(totals.kcal, target.kcal),
      hitProtein: logged && hitProtein(totals.protein, target.protein),
    };
  });

  const loggedDays = days.filter((d) => d.logged);
  const windowTotals = sumTotals(days.map((d) => d.totals));
  const n = loggedDays.length;
  const averages = n
    ? {
        kcal: Math.round(windowTotals.kcal / n),
        protein: Math.round((windowTotals.protein / n) * 10) / 10,
        carbs: Math.round((windowTotals.carbs / n) * 10) / 10,
        fat: Math.round((windowTotals.fat / n) * 10) / 10,
        fiber: Math.round((windowTotals.fiber / n) * 10) / 10,
      }
    : emptyTotals();

  const mealSplit = Object.fromEntries(
    MEALS.map((m) => [m, sumTotals(days.map((d) => d.byMeal[m])).kcal]),
  ) as Record<Meal, number>;

  let bestDay: { date: string; kcal: number; targetKcal: number } | null = null;
  let worstDay: { date: string; kcal: number; targetKcal: number } | null = null;
  for (const d of loggedDays) {
    const miss = Math.abs(d.totals.kcal - d.target.kcal);
    if (!bestDay || miss < Math.abs(bestDay.kcal - bestDay.targetKcal)) {
      bestDay = { date: d.date, kcal: d.totals.kcal, targetKcal: d.target.kcal };
    }
    const over = d.totals.kcal - d.target.kcal;
    if (!worstDay || over > worstDay.kcal - worstDay.targetKcal) {
      worstDay = { date: d.date, kcal: d.totals.kcal, targetKcal: d.target.kcal };
    }
  }

  const week = weeklyAverages(weights, to);
  const slope = slopePerWeek(weights, to);
  const latest = weights.reduce<WeightPoint | null>((a, b) => (!a || b.date > a.date ? b : a), null);

  return {
    range,
    from,
    to,
    days,
    totals: windowTotals,
    averages,
    mealSplit,
    adherence: {
      totalDays: days.length,
      loggedDays: n,
      hitCaloriesDays: loggedDays.filter((d) => d.hitCalories).length,
      hitProteinDays: loggedDays.filter((d) => d.hitProtein).length,
      streak: loggingStreak(new Set(loggedDates), to),
    },
    bestDay,
    worstDay,
    weight: {
      latestKg: latest?.weightKg ?? null,
      latestDate: latest?.date ?? null,
      avg7d: week.current,
      avg7dChange: week.change,
      slopePerWeek: slope === null ? null : Math.round(slope * 100) / 100,
    },
  };
}
