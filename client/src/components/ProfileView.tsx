import { useCallback, useEffect, useState } from "react";
import { CustomFoodsView } from "@/components/CustomFoodsView";
import { RemindersSettings } from "@/components/RemindersSettings";
import { ProfileDetailsSheet } from "@/components/ProfileDetailsSheet";
import { InstallAppButton } from "@/components/InstallAppButton";
import { TargetsForm } from "@/components/TargetsForm";
import { TargetPlanView } from "@/components/TargetPlanView";
import { WeightLog } from "@/components/WeightLog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { addDays, todayStr } from "@/lib/date";
import type { Profile } from "@/lib/types";
import { latestPoint, type WeightPoint } from "@/lib/weight";

type Section = "targets" | "weight-tracker" | "reminders" | "custom-foods";

export function ProfileView({
  initialSection,
  initialCustomFoodName,
  onSetupComplete,
}: {
  initialSection: Section;
  initialCustomFoodName?: string;
  onSetupComplete?: () => void;
}) {
  const { user } = useAuth();
  const profile: Profile = user?.profile ?? {};
  const displayName = user?.name?.trim() || user?.email.split("@")[0] || "there";
  const [section, setSection] = useState<Section>(initialSection);
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
        <div className="flex w-full flex-wrap items-center gap-2 [&>button]:flex-1 [&>button]:justify-center">
          <ProfileDetailsSheet />
          <InstallAppButton />
        </div>
      </div>

      <Tabs value={section} onValueChange={(v) => setSection(v as Section)}>
        <TabsList className="grid h-11 w-full grid-cols-4 items-center">
          <TabsTrigger value="targets" className="h-8 min-w-0 whitespace-normal px-1 text-center text-[11px] leading-tight">Targets</TabsTrigger>
          <TabsTrigger value="weight-tracker" className="h-8 min-w-0 whitespace-normal px-1 text-center text-[11px] leading-tight">Weight Tracker</TabsTrigger>
          <TabsTrigger value="reminders" className="h-8 min-w-0 whitespace-normal px-1 text-center text-[11px] leading-tight">Reminders</TabsTrigger>
          <TabsTrigger value="custom-foods" className="h-8 min-w-0 whitespace-normal px-1 text-center text-[11px] leading-tight">Custom Foods</TabsTrigger>
        </TabsList>
      </Tabs>

      {section === "custom-foods" ? (
        <CustomFoodsView initialName={initialCustomFoodName} />
      ) : section === "targets" ? (
        <>
          <TargetPlanView />
          <TargetsForm latestWeight={latestPoint(entries)?.weightKg ?? null} onSetupComplete={onSetupComplete} />
        </>
      ) : section === "weight-tracker" ? (
        <WeightLog
          entries={entries}
          goalKg={profile.goalWeightKg}
          goalMode={profile.goalMode ?? "lose"}
          onChanged={reload}
        />
      ) : (
        <RemindersSettings />
      )}
    </div>
  );
}
