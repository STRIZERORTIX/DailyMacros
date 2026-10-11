import { Food } from "../../models/Food.js";
import { escapeRegex, scoreMatch, tokenize } from "./text.js";
import type { FoodResult } from "./types.js";

// Partial, multi-word matching over name + aliases, e.g. "kadal" or "chana boil" both find boiled channa.
export async function searchLocal(q: string, limit: number): Promise<FoodResult[]> {
  const tokens = tokenize(q);
  if (tokens.length === 0) return [];

  const docs = await Food.find({
    $and: tokens.map((t) => ({ searchText: { $regex: escapeRegex(t) } })),
  })
    .limit(200)
    .lean();

  return docs
    .map((d) => ({ d, s: scoreMatch(d.name, d.aliases, q) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ d }) => ({
      id: `local:${d.slug}`,
      source: "local" as const,
      externalId: d.slug,
      name: d.name,
      aliases: d.aliases,
      category: d.category ?? undefined,
      per100g: {
        kcal: d.per100g.kcal,
        protein: d.per100g.protein,
        carbs: d.per100g.carbs,
        fat: d.per100g.fat,
        fiber: d.per100g.fiber ?? 0,
      },
      servings: d.servings.map((s) => ({ label: s.label, grams: s.grams })),
    }));
}
