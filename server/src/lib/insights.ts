import { MEALS, type Meal } from "./constants.js";
import { dayTargets, type Profile } from "./calc.js";
import { eachDate, shiftDate } from "./dates.js";
import { emptyTotals, sumTotals, type Totals } from "./nutrition.js";
import type { WeightPoint } from "./weight.js";

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
    weight: {
      entries: weights.filter((point) => point.date >= from && point.date <= to),
    },
  };
}
