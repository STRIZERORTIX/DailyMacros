import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api, errMsg } from "@/lib/api";
import type { MealReminder, ReminderMeal, ReminderSettings } from "@/lib/types";

const MEALS: { key: ReminderMeal; title: string; defaultTime: string }[] = [
  { key: "breakfast", title: "Breakfast", defaultTime: "08:00" },
  { key: "lunch", title: "Lunch", defaultTime: "13:00" },
  { key: "dinner", title: "Dinner", defaultTime: "19:00" },
];

function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function defaultSettings(): ReminderSettings {
  return {
    pushConfigured: false,
    subscribed: false,
    timezone: browserTimezone(),
    meals: {
      breakfast: { enabled: false, time: "08:00" },
      lunch: { enabled: false, time: "13:00" },
      dinner: { enabled: false, time: "19:00" },
    },
  };
}

function decodeApplicationServerKey(value: string) {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function RemindersSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await api<ReminderSettings>("/reminders");
      setSettings({
        ...response,
        timezone: response.timezone || browserTimezone(),
      });
    } catch (error) {
      setLoadError(errMsg(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  function updateMeal(meal: ReminderMeal, update: Partial<MealReminder>) {
    setSettings((current) => ({
      ...current,
      meals: { ...current.meals, [meal]: { ...current.meals[meal], ...update } },
    }));
  }

  async function subscribeToPush() {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      throw new Error("Push notifications are not supported by this browser. Try installing the app or use a supported browser.");
    }
    if (!settings.pushConfigured) {
      throw new Error("Push notifications are not configured on the server yet.");
    }

    let permission = Notification.permission;
    if (permission === "default") permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Allow notifications in your browser settings to receive meal reminders.");
    }

    const { publicKey } = await api<{ publicKey: string | null; ready: boolean }>("/reminders/public-key");
    if (!publicKey) throw new Error("Push notifications are not configured on the server yet.");
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeApplicationServerKey(publicKey),
      });
    }

    const serialized = subscription.toJSON();
    if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth) {
      throw new Error("This browser returned an incomplete push subscription. Try again or use a different browser.");
    }
    await api("/reminders/subscription", {
      method: "PUT",
      body: { endpoint: serialized.endpoint, keys: serialized.keys },
    });
  }

  async function save() {
    setSaving(true);
    try {
      const hasEnabledReminder = Object.values(settings.meals).some((meal) => meal.enabled);
      if (hasEnabledReminder) await subscribeToPush();

      const saved = await api<ReminderSettings>("/reminders", {
        method: "PUT",
        body: {
          timezone: browserTimezone(),
          meals: settings.meals,
        },
      });
      setSettings({ ...saved, timezone: saved.timezone || browserTimezone() });
      toast.success("Meal reminders saved");
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setSaving(false);
    }
  }

  const pushUnavailable =
    typeof window !== "undefined" &&
    (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meal reminders</CardTitle>
        <CardDescription>Choose daily reminder times for your main meals. Snacks can be logged anytime.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadError ? (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-col items-start gap-3">
              <span>Could not load your reminder settings: {loadError}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => void loadSettings()}>
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {!settings.pushConfigured && (
              <Alert>
                <AlertDescription>
                  Push reminders are not configured on the server yet. A server administrator must add VAPID push-notification keys.
                </AlertDescription>
              </Alert>
            )}
            {pushUnavailable && (
              <Alert>
                <AlertDescription>
                  This browser does not support push notifications. Try installing the app or opening it in a supported browser.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              {MEALS.map(({ key, title, defaultTime }) => (
                <div key={key} className="flex items-center gap-3 rounded-lg border p-3">
                  <Switch
                    id={`reminder-${key}`}
                    checked={settings.meals[key].enabled}
                    onCheckedChange={(enabled) => updateMeal(key, { enabled })}
                    disabled={loading || saving || pushUnavailable}
                  />
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={`reminder-${key}`} className="cursor-pointer font-medium">{title}</Label>
                  </div>
                  <Input
                    aria-label={`${title} reminder time`}
                    type="time"
                    value={settings.meals[key].time || defaultTime}
                    onChange={(event) => updateMeal(key, { time: event.target.value })}
                    className="w-32"
                    disabled={loading || saving || !settings.meals[key].enabled}
                  />
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Reminders repeat every day using your device’s time zone ({browserTimezone()}). Your browser must allow notifications. Snacks are not scheduled.
            </p>
            <Button type="button" className="w-full" onClick={() => void save()} disabled={loading || saving || !!loadError}>
              {saving ? "Saving…" : "Save reminder schedule"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
