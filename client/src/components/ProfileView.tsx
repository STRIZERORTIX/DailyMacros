import { useCallback, useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { RemindersSettings } from "@/components/RemindersSettings";
import { ProfileDetailsSheet } from "@/components/ProfileDetailsSheet";
import { InstallAppButton } from "@/components/InstallAppButton";
import { TargetsForm } from "@/components/TargetsForm";
import { WeightLog } from "@/components/WeightLog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isProfileComplete } from "@/lib/calc";
import { addDays, todayStr } from "@/lib/date";
import type { Profile } from "@/lib/types";
import { latestPoint, type WeightPoint } from "@/lib/weight";

type Section = "targets" | "weight" | "reminders";

export function ProfileView({
  onSetupComplete,
  onOpenHelp,
}: {
  onSetupComplete?: () => void;
  onOpenHelp: () => void;
}) {
  const { user } = useAuth();
  const profile: Profile = user?.profile ?? {};
  const displayName = user?.name?.trim() || user?.email.split("@")[0] || "there";
  // First visit goes straight to setting targets; after that the weight log opens first.
  const [section, setSection] = useState<Section>(() => (isProfileComplete(profile) ? "weight" : "targets"));
  const [entries, setEntries] = useState<WeightPoint[]>([]);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    const to = todayStr();
    api<{ entries: WeightPoint[] }>(`/weights?from=${addDays(to, -365)}&to=${to}`)
      .then((r) => {
        if (!cancelled) setEntries(r.entries);
      })
      .catch(() => {
        /* the weight tab simply shows no data if this fails */
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="break-words text-xl font-semibold">{displayName}</h1>
        </div>
        <div className="flex w-full flex-nowrap items-center gap-2">
          <ProfileDetailsSheet />
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onOpenHelp}>
            <BookOpen className="size-4" />
            <span className="whitespace-nowrap">How to use</span>
          </Button>
          <InstallAppButton />
        </div>
      </div>

      <Tabs value={section} onValueChange={(v) => setSection(v as Section)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="targets">Targets</TabsTrigger>
          <TabsTrigger value="weight">Weight</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
        </TabsList>
      </Tabs>

      {section === "reminders" ? (
        <RemindersSettings />
      ) : section === "targets" ? (
        <TargetsForm latestWeight={latestPoint(entries)?.weightKg ?? null} onSetupComplete={onSetupComplete} />
      ) : (
        <WeightLog
          entries={entries}
          goalKg={profile.goalWeightKg}
          goalMode={profile.goalMode ?? "lose"}
          onChanged={reload}
        />
      )}
    </div>
  );
}
