import type { SOURCES } from "../../lib/constants.js";

export type Source = (typeof SOURCES)[number];

export type FoodServing = { label: string; grams: number };

export type FoodNutrients = { kcal: number; protein: number; carbs: number; fat: number; fiber: number };

/**
 * One shape for every source. To log a food, the client sends
 * { source, externalId, name, brand, per100g } plus grams to POST /api/logs.
 */
export type FoodResult = {
  id: string; // `${source}:${externalId}`
  source: Source;
  externalId: string;
  name: string;
  brand?: string;
  aliases?: string[];
  category?: string;
  per100g: FoodNutrients;
  servings: FoodServing[]; // may be empty (USDA: fetch via /api/foods/usda/:id/servings)
  // Only on /api/foods/recent
  lastGrams?: number;
  lastServingLabel?: string;
  lastServings?: number;
};
