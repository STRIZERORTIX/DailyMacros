import webpush from "web-push";
import { env, pushConfigured } from "../config/env.js";
import { User } from "../models/User.js";

const MEALS = ["breakfast", "lunch", "dinner"] as const;
type ReminderMeal = (typeof MEALS)[number];

function localDateTime(timezone: string, now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minute: Number(values.hour) * 60 + Number(values.minute),
  };
}

async function sendDueReminders() {
  if (!pushConfigured) return;

  const users = await User.find({
    $or: MEALS.map((meal) => ({ [`reminders.meals.${meal}.enabled`]: true })),
    "reminders.subscriptions.0": { $exists: true },
  })
    .select("_id reminders")
    .lean();

  const now = new Date();
  for (const user of users) {
    const reminderSettings = user.reminders;
    const timezone = reminderSettings?.timezone;
    if (!timezone) continue;
    let current: ReturnType<typeof localDateTime>;
    try {
      current = localDateTime(timezone, now);
    } catch (error) {
      console.error("Meal reminder has an invalid time zone", { userId: String(user._id), timezone, error });
      continue;
    }

    for (const meal of MEALS) {
      const setting = reminderSettings.meals?.[meal];
      if (!setting?.enabled || !setting.time) continue;
      const [hour, minute] = setting.time.split(":").map(Number);
      const elapsed = current.minute - (hour * 60 + minute);
      if (elapsed < 0 || elapsed > 2) continue;

      const settingPath = `reminders.meals.${meal}`;
      const sentPath = `reminders.sent.${meal}`;
      const claimed = await User.findOneAndUpdate(
        {
          _id: user._id,
          [`${settingPath}.enabled`]: true,
          [`${settingPath}.time`]: setting.time,
          [sentPath]: { $ne: current.date },
        },
        { $set: { [sentPath]: current.date } },
      )
        .select("reminders.subscriptions")
        .lean();
      if (!claimed) continue;

      const payload = JSON.stringify({
        title: `Time for ${meal[0].toUpperCase()}${meal.slice(1)}`,
        body: "Take a moment to log your meal in Daily Macros.",
        url: "/",
        tag: `meal-reminder-${meal}`,
      });

      await Promise.all(
        (claimed.reminders?.subscriptions ?? []).map(async (subscription) => {
          if (!subscription.keys?.p256dh || !subscription.keys.auth) {
            console.error("Meal reminder subscription is missing encryption keys", {
              userId: String(user._id),
              meal,
            });
            return;
          }
          try {
            await webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
              },
              payload,
              { TTL: 300 },
            );
          } catch (error) {
            const statusCode = typeof error === "object" && error !== null && "statusCode" in error
              ? Number(error.statusCode)
              : undefined;
            if (statusCode === 404 || statusCode === 410) {
              await User.updateOne(
                { _id: user._id },
                { $pull: { "reminders.subscriptions": { endpoint: subscription.endpoint } } },
              );
              return;
            }
            console.error("Meal reminder delivery failed", { userId: String(user._id), meal, error });
          }
        }),
      );
    }
  }
}

export function startReminderScheduler() {
  if (!pushConfigured) {
    console.warn("Push reminders are disabled: configure VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.");
    return;
  }

  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  const timer = setInterval(() => {
    void sendDueReminders().catch((error: unknown) => {
      console.error("Meal reminder scheduler failed", error);
    });
  }, 30_000);
  timer.unref();
}
