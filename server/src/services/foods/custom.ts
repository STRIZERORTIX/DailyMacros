import { CustomFood } from "../../models/CustomFood.js";
import { escapeRegex, tokenize } from "./text.js";
import type { FoodResult } from "./types.js";

export async function searchCustom(userId: string, q: string, limit: number): Promise<FoodResult[]> {
  const tokens = tokenize(q);
  if (tokens.length === 0) return [];

  const docs = await CustomFood.find({
    user: userId,
    $and: tokens.map((t) => {
      const rx = new RegExp(escapeRegex(t), "i");
      return { $or: [{ name: rx }, { aliases: rx }] };
    }),
  })
    .limit(limit)
    .lean();

  return docs.map((d) => ({
    id: `custom:${d._id}`,
    source: "custom" as const,
    externalId: String(d._id),
    name: d.name,
    aliases: d.aliases,
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
