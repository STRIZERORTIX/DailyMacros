import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { HttpError } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";
import { LogEntry } from "../models/LogEntry.js";
import { searchCustom } from "../services/foods/custom.js";
import { searchLocal } from "../services/foods/local.js";
import { getOffBarcode, searchOff } from "../services/foods/off.js";
import type { FoodResult, Source } from "../services/foods/types.js";
import { getUsdaServings, searchUsda } from "../services/foods/usda.js";

export const foodsRouter = Router();
foodsRouter.use(requireAuth);

const searchQuery = z.object({
  q: z.string().trim().min(2).max(80),
  limit: z.coerce.number().int().min(1).max(50).default(25),
  sources: z.string().optional(), // comma list of custom,local,usda,off (default: all)
});

async function settle<T>(p: Promise<T[]>, label: string, warnings: string[]): Promise<T[]> {
  try {
    return await p;
  } catch (e) {
    warnings.push(`${label}: ${e instanceof Error ? e.message : "failed"}`);
    return [];
  }
}

// GET /api/foods/search?q=idli
// GET /api/foods/search?q=idli&sources=custom,local     (fast, as-you-type)
// GET /api/foods/search?q=paneer&sources=usda,off       (online, on demand; results are cached for 7 days)
// -> { results: FoodResult[], warnings: string[] }   Order: your custom foods, curated Indian, USDA, Open Food Facts.
foodsRouter.get("/search", async (req, res) => {
  const q = searchQuery.parse(req.query);
  const want = new Set<string>(q.sources ? q.sources.split(",").map((s) => s.trim()) : ["custom", "local", "usda", "off"]);
  const warnings: string[] = [];

  const [custom, local, usda, off] = await Promise.all([
    want.has("custom") ? searchCustom(req.userId!, q.q, q.limit) : [],
    want.has("local") ? searchLocal(q.q, q.limit) : [],
    want.has("usda") ? settle(searchUsda(q.q), "USDA", warnings) : [],
    want.has("off") && q.q.length >= 3 ? settle(searchOff(q.q), "Open Food Facts", warnings) : [],
  ]);

  const seen = new Set<string>();
  const results = [...custom, ...local, ...usda, ...off].filter((f) => !seen.has(f.id) && !!seen.add(f.id));
  res.json({ results, warnings });
});

// GET /api/foods/barcode/8901058000290 -> { food } or 404 (packaged products from Open Food Facts)
foodsRouter.get("/barcode/:code", async (req, res) => {
  const code = z.string().regex(/^\d{8,14}$/, "Barcode must be 8 to 14 digits").parse(req.params.code);
  const food = await getOffBarcode(code);
  if (!food) throw new HttpError(404, "Product not found or has no nutrition data");
  res.json({ food });
});

// GET /api/foods/usda/171287/servings -> { servings: [{label, grams}] }  (household measures for a USDA food)
foodsRouter.get("/usda/:fdcId/servings", async (req, res) => {
  const fdcId = z.string().regex(/^\d{1,9}$/).parse(req.params.fdcId);
  res.json({ servings: await getUsdaServings(fdcId) });
});

// GET /api/foods/recent -> the 20 foods you logged most recently, with the portion you last used.
foodsRouter.get("/recent", async (req, res) => {
  const rows = await LogEntry.aggregate([
    { $match: { user: new Types.ObjectId(req.userId) } },
    { $sort: { createdAt: -1 } },
    { $limit: 300 },
    {
      $group: {
        _id: { source: "$food.source", ext: { $ifNull: ["$food.externalId", "$food.name"] } },
        food: { $first: "$food" },
        grams: { $first: "$grams" },
        servingLabel: { $first: "$servingLabel" },
        servings: { $first: "$servings" },
        last: { $first: "$createdAt" },
      },
    },
    { $sort: { last: -1 } },
    { $limit: 20 },
  ]);

  const foods: FoodResult[] = rows.map((r) => ({
    id: `${r._id.source}:${r._id.ext}`,
    source: r._id.source as Source,
    externalId: String(r._id.ext),
    name: r.food.name,
    brand: r.food.brand ?? undefined,
    per100g: {
      kcal: r.food.per100g.kcal,
      protein: r.food.per100g.protein,
      carbs: r.food.per100g.carbs,
      fat: r.food.per100g.fat,
      fiber: r.food.per100g.fiber ?? 0,
    },
    servings: [],
    lastGrams: r.grams,
    lastServingLabel: r.servingLabel ?? undefined,
    lastServings: r.servings ?? undefined,
  }));
  res.json({ foods });
});
