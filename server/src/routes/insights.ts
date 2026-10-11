import { Router } from "express";
import { z } from "zod";
import { rangeWindow, shiftDate, todayUtc } from "../lib/dates.js";
import { HttpError } from "../lib/http.js";
import { buildInsights } from "../lib/insights.js";
import { dateStr } from "../lib/schemas.js";
import { requireAuth } from "../middleware/auth.js";
import { LogEntry } from "../models/LogEntry.js";
import { User } from "../models/User.js";
import { WeightEntry } from "../models/WeightEntry.js";

export const insightsRouter = Router();
insightsRouter.use(requireAuth);

const query = z.object({
  range: z.enum(["day", "week", "month"]),
  end: dateStr.optional(),
});

insightsRouter.get("/", async (req, res) => {
  const q = query.parse(req.query);
  const to = q.end ?? todayUtc();
  const { from } = rangeWindow(q.range, to);

  const user = await User.findById(req.userId).lean();
  if (!user) throw new HttpError(401, "User not found");
  const p = user.profile;

  const streakFrom = shiftDate(to, -400);
  const weightFrom = shiftDate(to, -60);

  const [entries, loggedDates, weights] = await Promise.all([
    LogEntry.find({ user: req.userId, date: { $gte: from, $lte: to } })
      .select("date meal totals")
      .lean(),
    LogEntry.distinct("date", { user: req.userId, date: { $gte: streakFrom, $lte: to } }),
    WeightEntry.find({ user: req.userId, date: { $gte: weightFrom, $lte: to } })
      .sort({ date: 1 })
      .select("date weightKg")
      .lean(),
  ]);

  res.json(
    buildInsights({
      range: q.range,
      from,
      to,
      profile: {
        sex: p?.sex === "male" || p?.sex === "female" ? p.sex : undefined,
        goalMode: p?.goalMode === "lose" || p?.goalMode === "maintain" || p?.goalMode === "gain" ? p.goalMode : undefined,
        age: p?.age ?? undefined,
        heightCm: p?.heightCm ?? undefined,
        weightKg: p?.weightKg ?? undefined,
        goalWeightKg: p?.goalWeightKg ?? undefined,
        activityFactor: p?.activityFactor ?? undefined,
        deficitKcal: p?.deficitKcal ?? undefined,
        calorieAdjustment: p?.calorieAdjustment ?? undefined,
        sundayMaintenance: p?.sundayMaintenance ?? undefined,
        proteinPerKg: p?.proteinPerKg ?? undefined,
      },
      entries: entries.map((e) => ({ date: e.date, meal: e.meal, totals: e.totals })),
      loggedDates,
      weights: weights.map((w) => ({ date: w.date, weightKg: w.weightKg })),
    }),
  );
});
