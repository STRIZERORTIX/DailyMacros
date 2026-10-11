import { isSunday } from "./dates.js";

export type Profile = {
  sex?: "male" | "female";
  goalMode?: "lose" | "maintain" | "gain";
  age?: number;
  heightCm?: number;
  weightKg?: number;
  goalWeightKg?: number;
  activityFactor?: number;
  deficitKcal?: number;
  calorieAdjustment?: number;
  sundayMaintenance?: boolean;
  proteinPerKg?: number;
};

export const DEFAULT_TARGET = { kcal: 2400, protein: 150 };

export function isProfileComplete(p: Profile): boolean {
  return !!(p.sex && p.age && p.heightCm && p.weightKg);
}

export function bmr(p: Profile): number {
  const base = 10 * (p.weightKg ?? 0) + 6.25 * (p.heightCm ?? 0) - 5 * (p.age ?? 0);
  return base + (p.sex === "female" ? -161 : 5);
}

export function tdee(p: Profile): number {
  return bmr(p) * (p.activityFactor ?? 1.2);
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

/** Same rules as the client `dayTargets` (Sunday maintenance, never below BMR). */
export function dayTargets(p: Profile, date: string): DayTargets {
  let kcal = DEFAULT_TARGET.kcal;
  let protein = DEFAULT_TARGET.protein;
  let maintenanceDay = false;
  const isDefault = !isProfileComplete(p);

  if (!isDefault) {
    const maintenance = tdee(p);
    const goalMode = p.goalMode ?? "lose";
    const adjustment =
      p.calorieAdjustment ??
      (goalMode === "maintain" ? 0 : goalMode === "gain" ? 250 : -(p.deficitKcal ?? 500));
    maintenanceDay = goalMode === "lose" && (p.sundayMaintenance ?? true) && isSunday(date);
    const target = maintenanceDay ? maintenance : maintenance + adjustment;
    kcal = round10(Math.max(target, bmr(p)));
    protein = Math.round(((p.proteinPerKg ?? 1.6) * (p.weightKg ?? 0)) / 5) * 5;
  }

  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const fiber = Math.round((kcal / 1000) * 14);
  return { kcal, protein, carbs, fat, fiber, maintenanceDay, isDefault };
}
