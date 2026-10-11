import { Router } from "express";
import { z } from "zod";
import { MEALS, SOURCES } from "../lib/constants.js";
import { daysBetween } from "../lib/dates.js";
import { HttpError, objectId } from "../lib/http.js";
import { sumTotals, totalsFor } from "../lib/nutrition.js";
import { dateStr, per100gSchema } from "../lib/schemas.js";
import { requireAuth } from "../middleware/auth.js";
import { LogEntry } from "../models/LogEntry.js";

export const logsRouter = Router();
logsRouter.use(requireAuth);

const foodSchema = z.object({
  source: z.enum(SOURCES),
  externalId: z.string().max(100).optional(),
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().max(100).optional(),
  per100g: per100gSchema,
});

const createSchema = z.object({
  date: dateStr,
  meal: z.enum(MEALS),
  food: foodSchema,
  grams: z.number().positive().max(10000),
  servingLabel: z.string().max(60).optional(),
  servings: z.number().positive().max(1000).optional(),
});

const updateSchema = z
  .object({
    date: dateStr,
    meal: z.enum(MEALS),
    grams: z.number().positive().max(10000),
    servingLabel: z.string().max(60),
    servings: z.number().positive().max(1000),
  })
  .partial();

const listQuery = z
  .object({ date: dateStr.optional(), from: dateStr.optional(), to: dateStr.optional() })
  .refine((q) => q.date || (q.from && q.to), "Provide date, or both from and to");

const copySchema = z
  .object({ fromDate: dateStr, toDate: dateStr, meal: z.enum(MEALS).optional() })
  .refine((b) => b.fromDate !== b.toDate, "fromDate and toDate must differ");

// GET /api/logs?date=2026-10-10          -> one day
// GET /api/logs?from=...&to=...          -> a range (max 366 days)
// Returns entries plus totals and per-meal totals so the client does not have to add things up.
logsRouter.get("/", async (req, res) => {
  const q = listQuery.parse(req.query);
  const from = (q.date ?? q.from)!;
  const to = (q.date ?? q.to)!;
  if (from > to) throw new HttpError(400, "from must be on or before to");
  if (daysBetween(from, to) > 366) throw new HttpError(400, "Range too large (max 366 days)");

  const entries = await LogEntry.find({ user: req.userId, date: { $gte: from, $lte: to } })
    .sort({ date: 1, createdAt: 1 })
    .lean();

  const byMeal = Object.fromEntries(
    MEALS.map((m) => [m, sumTotals(entries.filter((e) => e.meal === m).map((e) => e.totals))]),
  );
  res.json({ entries, totals: sumTotals(entries.map((e) => e.totals)), byMeal });
});

logsRouter.post("/", async (req, res) => {
  const b = createSchema.parse(req.body);
  const entry = await LogEntry.create({
    user: req.userId,
    date: b.date,
    meal: b.meal,
    food: b.food,
    grams: b.grams,
    servingLabel: b.servingLabel,
    servings: b.servings,
    totals: totalsFor(b.food.per100g, b.grams),
  });
  res.status(201).json(entry);
});

// Copy a whole day (or one meal) onto another day, e.g. "copy yesterday".
logsRouter.post("/copy", async (req, res) => {
  const b = copySchema.parse(req.body);
  const source = await LogEntry.find({
    user: req.userId,
    date: b.fromDate,
    ...(b.meal ? { meal: b.meal } : {}),
  }).lean();
  if (source.length === 0) {
    res.json({ copied: 0 });
    return;
  }
  await LogEntry.insertMany(
    source.map((e) => ({
      user: e.user,
      date: b.toDate,
      meal: e.meal,
      food: e.food,
      grams: e.grams,
      servingLabel: e.servingLabel,
      servings: e.servings,
      totals: e.totals,
    })),
  );
  res.status(201).json({ copied: source.length });
});

logsRouter.patch("/:id", async (req, res) => {
  const id = objectId(req.params.id);
  const b = updateSchema.parse(req.body);
  const entry = await LogEntry.findOne({ _id: id, user: req.userId });
  if (!entry) throw new HttpError(404, "Entry not found");

  if (b.date !== undefined) entry.date = b.date;
  if (b.meal !== undefined) entry.meal = b.meal;
  if (b.servingLabel !== undefined) entry.servingLabel = b.servingLabel;
  if (b.servings !== undefined) entry.servings = b.servings;
  if (b.grams !== undefined) {
    if (!entry.food) throw new HttpError(500, "Entry has no food data");
    entry.grams = b.grams;
    entry.totals = totalsFor(entry.food.per100g, b.grams);
  }
  await entry.save();
  res.json(entry);
});

logsRouter.delete("/:id", async (req, res) => {
  const id = objectId(req.params.id);
  const result = await LogEntry.deleteOne({ _id: id, user: req.userId });
  if (result.deletedCount === 0) throw new HttpError(404, "Entry not found");
  res.status(204).end();
});
