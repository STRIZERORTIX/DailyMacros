import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CarbInfo } from "@/components/CarbInfo";
import type { DayTargets } from "@/lib/calc";
import { n0, netCarbs } from "@/lib/nutrition";
import type { Nutrients } from "@/lib/types";

function CalorieRing({ eaten, target }: { eaten: number; target: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(eaten / target, 1) : 0;
  const left = target - eaten;
  const over = left < 0;

  return (
    <div className="relative size-36 shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className={over ? "stroke-destructive" : "stroke-primary"}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold tabular-nums">{n0(Math.abs(left))}</span>
        <span className="text-xs text-muted-foreground">{over ? "kcal over" : "kcal left"}</span>
      </div>
    </div>
  );
}

function MacroBar({
  label,
  value,
  target,
  indicatorClass,
  detail,
}: {
  label: React.ReactNode;
  value: number;
  target: number;
  indicatorClass: string;
  detail?: string;
}) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="flex items-center gap-1 font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {n0(value)} / {n0(target)} g
        </span>
      </div>
      {detail && <p className="text-right text-[11px] tabular-nums text-muted-foreground">{detail}</p>}
      <Progress value={pct} className={indicatorClass} />
    </div>
  );
}

export function DaySummary({ totals, targets }: { totals: Nutrients; targets: DayTargets }) {
  return (
    <Card className="py-4">
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4">
          <CalorieRing eaten={totals.kcal} target={targets.kcal} />
          <div className="flex-1 space-y-3">
            <MacroBar
              label="Protein"
              value={totals.protein}
              target={targets.protein}
              indicatorClass="[&>[data-slot=progress-indicator]]:bg-chart-1"
            />
            <MacroBar
              label={<>Total carbs <CarbInfo /></>}
              value={totals.carbs}
              target={targets.carbs}
              detail={`Net ${n0(netCarbs(totals.carbs, totals.fiber))} g · fibre goal ${n0(targets.fiber)} g`}
              indicatorClass="[&>[data-slot=progress-indicator]]:bg-chart-2"
            />
            <MacroBar
              label="Fat"
              value={totals.fat}
              target={targets.fat}
              indicatorClass="[&>[data-slot=progress-indicator]]:bg-chart-3"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {n0(totals.kcal)} eaten · target {n0(targets.kcal)} kcal
          </span>
          {targets.maintenanceDay && <Badge variant="secondary">Maintenance day</Badge>}
          {targets.isDefault && <Badge variant="outline">Default target</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}
