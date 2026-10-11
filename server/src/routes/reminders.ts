import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { env, pushConfigured } from "../config/env.js";
import { HttpError } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";

export const remindersRouter = Router();
const limiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false });
const mealReminderSchema = z.object({
  enabled: z.boolean(),
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
});
const configSchema = z.object({
  timezone: z.string().min(1).max(100).refine((timezone) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }, "Choose a valid time zone"),
  meals: z.object({
    breakfast: mealReminderSchema,
    lunch: mealReminderSchema,
    dinner: mealReminderSchema,
  }),
});
const subscriptionSchema = z.object({
  endpoint: z.url().refine((endpoint) => {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase();
    const knownPushService =
      host === "fcm.googleapis.com" ||
      host === "push.services.mozilla.com" ||
      host.endsWith(".push.services.mozilla.com") ||
      host.endsWith(".notify.windows.com") ||
      host.endsWith(".push.apple.com");
    return url.protocol === "https:" && knownPushService;
  }, "Push endpoint must use HTTPS and belong to a supported browser push service"),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

type ReminderConfigLike = {
  reminders?: {
    timezone?: string | null;
    meals?: {
      breakfast?: { enabled?: boolean | null; time?: string | null } | null;
      lunch?: { enabled?: boolean | null; time?: string | null } | null;
      dinner?: { enabled?: boolean | null; time?: string | null } | null;
    } | null;
    subscriptions?: unknown[] | null;
  } | null;
};

function configResponse(user: ReminderConfigLike) {
  const reminders = user.reminders;
  const meals = reminders?.meals;
  return {
    pushConfigured,
    subscribed: (reminders?.subscriptions?.length ?? 0) > 0,
    timezone: reminders?.timezone ?? "",
    meals: {
      breakfast: { enabled: meals?.breakfast?.enabled ?? false, time: meals?.breakfast?.time ?? "08:00" },
      lunch: { enabled: meals?.lunch?.enabled ?? false, time: meals?.lunch?.time ?? "13:00" },
      dinner: { enabled: meals?.dinner?.enabled ?? false, time: meals?.dinner?.time ?? "19:00" },
    },
  };
}

remindersRouter.use(requireAuth, limiter);

remindersRouter.get("/public-key", (_req, res) => {
  res.json({ ready: pushConfigured, publicKey: pushConfigured ? env.VAPID_PUBLIC_KEY : null });
});

remindersRouter.get("/", async (req, res) => {
  const user = await User.findById(req.userId).select("reminders");
  if (!user) throw new HttpError(401, "User no longer exists");
  res.json(configResponse(user));
});

remindersRouter.put("/", async (req, res) => {
  const body = configSchema.parse(req.body);
  const user = await User.findByIdAndUpdate(
    req.userId,
    {
      $set: {
        "reminders.timezone": body.timezone,
        "reminders.meals.breakfast": body.meals.breakfast,
        "reminders.meals.lunch": body.meals.lunch,
        "reminders.meals.dinner": body.meals.dinner,
      },
    },
    { new: true, runValidators: true },
  ).select("reminders");
  if (!user) throw new HttpError(401, "User no longer exists");
  res.json(configResponse(user));
});

remindersRouter.put("/subscription", async (req, res) => {
  const subscription = subscriptionSchema.parse(req.body);
  const userId = req.userId;
  const userExists = await User.exists({ _id: userId });
  if (!userExists) throw new HttpError(401, "User no longer exists");

  await User.updateMany(
    { _id: { $ne: userId }, "reminders.subscriptions.endpoint": subscription.endpoint },
    { $pull: { "reminders.subscriptions": { endpoint: subscription.endpoint } } },
  );
  await User.updateOne(
    { _id: userId },
    { $pull: { "reminders.subscriptions": { endpoint: subscription.endpoint } } },
  );
  const result = await User.updateOne(
    { _id: userId },
    { $push: { "reminders.subscriptions": subscription } },
  );
  if (result.matchedCount === 0) throw new HttpError(401, "User no longer exists");
  res.json({ subscribed: true });
});

remindersRouter.delete("/subscription", async (req, res) => {
  const body = z.object({ endpoint: z.url() }).parse(req.body);
  const result = await User.updateOne(
    { _id: req.userId },
    { $pull: { "reminders.subscriptions": { endpoint: body.endpoint } } },
  );
  if (result.matchedCount === 0) throw new HttpError(401, "User no longer exists");
  res.json({ subscribed: false });
});
