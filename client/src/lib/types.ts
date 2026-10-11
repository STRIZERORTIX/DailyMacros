// Mirrors the server API contract (see PLAN.md).

export const MEALS = ["breakfast", "lunch", "snack", "dinner"] as const;
export type Meal = (typeof MEALS)[number];
export const MEAL_LABEL: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snacks",
  dinner: "Dinner",
};

export type Source = "local" | "usda" | "off" | "custom";
export const SOURCE_LABEL: Record<Source, string> = { local: "", custom: "Yours", usda: "USDA", off: "Packaged" };

export type Nutrients = { kcal: number; protein: number; carbs: number; fat: number; fiber: number };
export type Serving = { label: string; grams: number };

export type FoodResult = {
  id: string;
  source: Source;
  externalId: string;
  name: string;
  brand?: string;
  aliases?: string[];
  category?: string;
  per100g: Nutrients;
  servings: Serving[];
  lastGrams?: number;
  lastServingLabel?: string;
  lastServings?: number;
};

export type LogEntry = {
  _id: string;
  date: string;
  meal: Meal;
  food: { source: Source; externalId?: string; name: string; brand?: string; per100g: Nutrients };
  grams: number;
  servingLabel?: string;
  servings?: number;
  totals: Nutrients;
};

export type DayLog = {
  entries: LogEntry[];
  totals: Nutrients;
  byMeal: Record<Meal, Nutrients>;
};

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

export type User = { id: string; email: string; name: string; profile: Profile };

export type ReminderMeal = "breakfast" | "lunch" | "dinner";
export type MealReminder = { enabled: boolean; time: string };
export type ReminderSettings = {
  pushConfigured: boolean;
  subscribed: boolean;
  timezone: string;
  meals: Record<ReminderMeal, MealReminder>;
};

export type InsightRange = "day" | "week" | "month";

export type InsightDay = {
  date: string;
  totals: Nutrients;
  byMeal: Record<Meal, Nutrients>;
  target: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    maintenanceDay: boolean;
    isDefault: boolean;
  };
  logged: boolean;
  hitCalories: boolean;
  hitProtein: boolean;
};

export type Insights = {
  range: InsightRange;
  from: string;
  to: string;
  days: InsightDay[];
  totals: Nutrients;
  averages: Nutrients;
  mealSplit: Record<Meal, number>;
  adherence: {
    totalDays: number;
    loggedDays: number;
    hitCaloriesDays: number;
    hitProteinDays: number;
    streak: number;
  };
  bestDay: { date: string; kcal: number; targetKcal: number } | null;
  worstDay: { date: string; kcal: number; targetKcal: number } | null;
  weight: {
    latestKg: number | null;
    latestDate: string | null;
    avg7d: number | null;
    avg7dChange: number | null;
    slopePerWeek: number | null;
  };
};
