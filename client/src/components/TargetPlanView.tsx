import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { isProfileComplete, plannedTargets, tdee } from "@/lib/calc";
import { n0 } from "@/lib/nutrition";
import type { Profile } from "@/lib/types";

function TargetStat({
  label,
  value,
  unit,
  className,
}: {
  label: React.ReactNode;
  value: number;
  unit: string;
  className?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${className ?? ""}`}>
        {n0(value)} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}

export function TargetPlanView() {
  const { user } = useAuth();
  const profile: Profile = user?.profile ?? {};

  if (!isProfileComplete(profile)) {
    return null;
  }

  const { weekday, sunday } = plannedTargets(profile);
  const targetLabel =
    profile.goalMode === "lose" ? "Cut target" : profile.goalMode === "gain" ? "Lean-bulk target" : "Maintenance target";
  const maintenance = Math.round(tdee(profile) / 10) * 10;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Target plan</CardTitle>
          <p className="text-sm text-muted-foreground">Your current daily calorie and nutrition targets.</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
            <TargetStat label="Estimated maintenance" value={maintenance} unit="kcal/day" />
            <TargetStat label={targetLabel} value={weekday.kcal} unit="kcal/day" className="text-primary" />
          </div>
          {weekday.kcal !== sunday.kcal && (
            <p className="text-xs text-muted-foreground">Sunday maintenance target: {n0(sunday.kcal)} kcal.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
