import { addDays, isSunday, todayStr } from "./date";
import type { Profile } from "./types";

export const ACTIVITY = [
  {
    value: 1.2,
    title: "Sedentary",
    description: "Mostly sitting at work or school, with little or no planned exercise.",
  },
  {
    value: 1.375,
    title: "Lightly active",
    description: "Mostly sitting, plus light exercise such as walking or yoga 1-3 days a week.",
  },
  {
    value: 1.55,
    title: "Moderately active",
    description: "Exercise or sports 3-5 days a week, or a job spent on your feet most of the day.",
  },
  {
    value: 1.725,
    title: "Very active",
    description: "Hard exercise or sports 6-7 days a week, or a physically demanding job with regular training.",
  },
  {
    value: 1.9,
    title: "Extra active",
    description: "Heavy physical work for most of the day, or multiple strenuous workouts each day.",
  },
];

// Used until the profile is filled in.
export const DEFAULT_TARGET = { kcal: 2400, protein: 150 };

export function isProfileComplete(p: Profile): boolean {
  return !!(p.sex && p.age && p.heightCm && p.weightKg);
}

/** Basal metabolic rate, Mifflin-St Jeor. */
export function bmr(p: Profile): number {
  const base = 10 * (p.weightKg ?? 0) + 6.25 * (p.heightCm ?? 0) - 5 * (p.age ?? 0);
  return base + (p.sex === "female" ? -161 : 5);
}

/** Maintenance calories (total daily energy expenditure). */
export function tdee(p: Profile): number {
  return p.maintenanceKcal ?? bmr(p) * (p.activityFactor ?? 1.2);
}

const round10 = (n: number) => Math.round(n / 10) * 10;

export type DayTargets = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  maintenanceDay: boolean;
  isDefault: boolean;
};

/** Calorie and macro targets for a given date (Sundays can be maintenance days). */
export function dayTargets(p: Profile, date: string): DayTargets {
  let kcal = DEFAULT_TARGET.kcal;
  let protein = DEFAULT_TARGET.protein;
  let adjustment = 0;
  let maintenanceDay = false;
  const isDefault = !isProfileComplete(p);

  if (!isDefault) {
    const maintenance = tdee(p);
    const goalMode = p.goalMode ?? "lose";
    adjustment =
      p.calorieAdjustment ??
      (goalMode === "maintain" ? 0 : goalMode === "gain" ? 250 : -(p.deficitKcal ?? 500));
    maintenanceDay = goalMode === "lose" && (p.sundayMaintenance ?? true) && isSunday(date);
    const target = maintenanceDay
      ? maintenance
      : goalMode === "lose"
        ? p.cutTargetKcal ?? maintenance + adjustment
        : maintenance + adjustment;
    kcal = round10(Math.max(target, bmr(p))); // never plan below BMR
    protein = Math.round(((p.proteinPerKg ?? 1.6) * (p.weightKg ?? 0)) / 5) * 5;
  }

  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const fiber = Math.round((kcal / 1000) * 14);
  return { kcal, protein, carbs, fat, fiber, maintenanceDay, isDefault };
}

// A known Monday and Sunday, used to show "weekday" and "Sunday" targets side by side.
const REF_WEEKDAY = "2024-01-01";
const REF_SUNDAY = "2024-01-07";

export function plannedTargets(p: Profile): { weekday: DayTargets; sunday: DayTargets } {
  return { weekday: dayTargets(p, REF_WEEKDAY), sunday: dayTargets(p, REF_SUNDAY) };
}

/** True when the chosen deficit would put the weekday target below BMR (so it gets lifted to BMR). */
export function isFlooredAtBmr(p: Profile): boolean {
  if (!isProfileComplete(p) || (p.goalMode && p.goalMode !== "lose")) return false;
  const adjustment = p.calorieAdjustment ?? -(p.deficitKcal ?? 500);
  return (p.cutTargetKcal ?? tdee(p) + adjustment) < bmr(p);
}

export type Projection = {
  toTargetKg: number;
  direction: "lose" | "gain";
  kgPerWeek: number;
  weeks: number;
  goalDate: string;
};

/**
 * Rough weight-change forecast: about 7,700 kcal per kg.
 * A Sunday maintenance day applies only to a weight-loss plan.
 */
export function projection(p: Profile): Projection | null {
  if (!p.weightKg || !p.goalWeightKg) return null;
  const goalMode = p.goalMode ?? "lose";
  if (goalMode === "maintain") return null;
  const change = goalMode === "lose" ? p.weightKg - p.goalWeightKg : p.goalWeightKg - p.weightKg;
  const adjustment =
    Math.abs(p.calorieAdjustment ?? (goalMode === "lose" ? -(p.deficitKcal ?? 500) : 250));
  const activeDays = goalMode === "lose" && (p.sundayMaintenance ?? true) ? 6 : 7;
  const kgPerWeek = (adjustment * activeDays) / 7700;
  if (change <= 0 || kgPerWeek <= 0) return null;
  const weeks = change / kgPerWeek;
  return {
    toTargetKg: change,
    direction: goalMode,
    kgPerWeek,
    weeks,
    goalDate: addDays(todayStr(), Math.round(weeks * 7)),
  };
}
