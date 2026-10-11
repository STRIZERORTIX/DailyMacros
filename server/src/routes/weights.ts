import { Router } from "express";
import { z } from "zod";
import { daysBetween, shiftDate, todayUtc } from "../lib/dates.js";
import { HttpError } from "../lib/http.js";
import { dateStr } from "../lib/schemas.js";
import { requireAuth } from "../middleware/auth.js";
import { WeightEntry } from "../models/WeightEntry.js";

export const weightsRouter = Router();
weightsRouter.use(requireAuth);

const rangeQuery = z.object({ from: dateStr.optional(), to: dateStr.optional() });
const bodySchema = z.object({ weightKg: z.number().min(20).max(400) });

// GET /api/weights            -> last 120 days
// GET /api/weights?from&to    -> a range (max 731 days)
weightsRouter.get("/", async (req, res) => {
  const q = rangeQuery.parse(req.query);
  const to = q.to ?? todayUtc();
  const from = q.from ?? shiftDate(to, -120);
  if (from > to) throw new HttpError(400, "from must be on or before to");
  if (daysBetween(from, to) > 731) throw new HttpError(400, "Range too large (max 731 days)");

  const entries = await WeightEntry.find({ user: req.userId, date: { $gte: from, $lte: to } })
    .sort({ date: 1 })
    .select("date weightKg -_id")
    .lean();
  res.json({ entries });
});

// PUT /api/weights/2026-10-10  { "weightKg": 96.4 }  -> create or replace that day's weigh-in
weightsRouter.put("/:date", async (req, res) => {
  const date = dateStr.parse(req.params.date);
  const { weightKg } = bodySchema.parse(req.body);
  const entry = await WeightEntry.findOneAndUpdate(
    { user: req.userId, date },
    { $set: { weightKg } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).select("date weightKg -_id");
  res.json(entry);
});

weightsRouter.delete("/:date", async (req, res) => {
  const date = dateStr.parse(req.params.date);
  const result = await WeightEntry.deleteOne({ user: req.userId, date });
  if (result.deletedCount === 0) throw new HttpError(404, "No weigh-in on that date");
  res.status(204).end();
});
