import { env } from "../../config/env.js";
import { cached, clamp, fetchJson, round1 } from "./http.js";
import type { FoodResult, FoodServing } from "./types.js";

// USDA FoodData Central (free key: https://fdc.nal.usda.gov/api-key-signup). Good for generic / international foods.
// We skip "Branded" (US supermarket products) and use the generic datasets, whose values are per 100 g.
const BASE = "https://api.nal.usda.gov/fdc/v1";
const DATA_TYPES = "Foundation,SR Legacy,Survey (FNDDS)";

type UsdaNutrient = { nutrientId?: number; value?: number };
type UsdaFood = { fdcId: number; description: string; foodNutrients?: UsdaNutrient[] };
type UsdaPortion = {
  gramWeight?: number;
  amount?: number;
  modifier?: string;
  portionDescription?: string;
  measureUnit?: { name?: string };
};

function requireKey(): string {
  if (!env.USDA_API_KEY) throw new Error("USDA_API_KEY is not set");
  return env.USDA_API_KEY;
}

function pick(list: UsdaNutrient[], ...ids: number[]): number | undefined {
  for (const id of ids) {
    const n = list.find((x) => x.nutrientId === id);
    if (typeof n?.value === "number") return n.value;
  }
  return undefined;
}

function toFood(f: UsdaFood): FoodResult | null {
  const list = f.foodNutrients ?? [];
  // 1008 = Energy (kcal); 2047/2048 = Atwater energy used by Foundation foods; 1062 = Energy (kJ)
  let kcal = pick(list, 1008, 2047, 2048);
  if (kcal === undefined) {
    const kj = pick(list, 1062);
    if (kj !== undefined) kcal = kj / 4.184;
  }
  if (kcal === undefined) return null;
  return {
    id: `usda:${f.fdcId}`,
    source: "usda",
    externalId: String(f.fdcId),
    name: f.description,
    per100g: {
      kcal: Math.round(clamp(kcal, 1000)),
      protein: round1(clamp(pick(list, 1003) ?? 0, 100)),
      carbs: round1(clamp(pick(list, 1005) ?? 0, 100)),
      fat: round1(clamp(pick(list, 1004) ?? 0, 100)),
      fiber: round1(clamp(pick(list, 1079) ?? 0, 100)),
    },
    servings: [],
  };
}

export async function searchUsda(q: string): Promise<FoodResult[]> {
  const key = requireKey();
  const query = q.toLowerCase().trim();
  return cached(`usda:search:${query}`, async () => {
    const url =
      `${BASE}/foods/search?query=${encodeURIComponent(query)}&pageSize=12` +
      `&dataType=${encodeURIComponent(DATA_TYPES)}&api_key=${encodeURIComponent(key)}`;
    const data = await fetchJson<{ foods?: UsdaFood[] }>(url);
    return (data.foods ?? []).map(toFood).filter((x): x is FoodResult => x !== null);
  });
}

/** Household measures for one USDA food (1 cup, 1 medium, ...). Fetched on demand when the user picks the food. */
export async function getUsdaServings(fdcId: string): Promise<FoodServing[]> {
  const key = requireKey();
  return cached(`usda:servings:${fdcId}`, async () => {
    const data = await fetchJson<{ foodPortions?: UsdaPortion[] }>(
      `${BASE}/food/${encodeURIComponent(fdcId)}?api_key=${encodeURIComponent(key)}`,
    );
    const seen = new Set<string>();
    const out: FoodServing[] = [];
    for (const p of data.foodPortions ?? []) {
      if (!p.gramWeight || p.gramWeight <= 0) continue;
      const unit = p.measureUnit?.name && p.measureUnit.name !== "undetermined" ? p.measureUnit.name : "";
      const label =
        p.portionDescription && p.portionDescription !== "Quantity not specified"
          ? p.portionDescription
          : [p.amount, unit, p.modifier].filter(Boolean).join(" ");
      if (!label || seen.has(label)) continue;
      seen.add(label);
      out.push({ label, grams: round1(p.gramWeight) });
    }
    return out.slice(0, 12);
  });
}
