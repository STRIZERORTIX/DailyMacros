import { Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DatePicker } from "@/components/DatePicker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { api, errMsg } from "@/lib/api";
import { parseDate, todayStr } from "@/lib/date";
import { round } from "@/lib/nutrition";
import { dayIndex, latestPoint, slopePerWeek, trendAdvice, weeklyAverages, type WeightPoint } from "@/lib/weight";
import { cn } from "@/lib/utils";

const shortDate = (d: string) => parseDate(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

function Sparkline({ points, goalKg }: { points: WeightPoint[]; goalKg?: number }) {
  if (points.length < 2) {
    return <p className="text-xs text-muted-foreground">Log at least two weigh-ins to see the chart.</p>;
  }
  const W = 300;
  const H = 96;
  const P = 8;
  const xs = points.map((p) => dayIndex(p.date));
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const ys = points.map((p) => p.weightKg);
  let lo = Math.min(...ys);
  let hi = Math.max(...ys);
  const goal = goalKg !== undefined && goalKg >= lo - 2 && goalKg <= hi + 2 ? goalKg : null;
  if (goal !== null) {
    lo = Math.min(lo, goal);
    hi = Math.max(hi, goal);
  }
  const pad = Math.max((hi - lo) * 0.12, 0.3);
  lo -= pad;
  hi += pad;
  const sx = (x: number) => P + ((x - x0) / Math.max(x1 - x0, 1)) * (W - 2 * P);
  const sy = (y: number) => H - P - ((y - lo) / (hi - lo)) * (H - 2 * P);
  const path = points
    .map((p, i) => `${i ? "L" : "M"}${sx(dayIndex(p.date)).toFixed(1)} ${sy(p.weightKg).toFixed(1)}`)
    .join(" ");
  const last = points[points.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full" role="img" aria-label="Weight over time">
        {goal !== null && (
          <line x1={P} x2={W - P} y1={sy(goal)} y2={sy(goal)} strokeDasharray="4 4" strokeWidth="1" stroke="var(--chart-3)" />
        )}
        <path d={path} fill="none" stroke="var(--chart-1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={sx(dayIndex(last.date))} cy={sy(last.weightKg)} r="3.5" fill="var(--chart-1)" />
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{shortDate(points[0].date)}</span>
        {goal !== null && <span className="text-chart-3">- - goal {goal} kg</span>}
        <span>{shortDate(last.date)}</span>
      </div>
    </div>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "warn" }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      {sub && <p className={cn("text-xs tabular-nums", tone === "good" ? "text-primary" : "text-muted-foreground")}>{sub}</p>}
    </div>
  );
}

export function WeightLog({
  entries,
  goalKg,
  goalMode = "lose",
  onChanged,
}: {
  entries: WeightPoint[];
  goalKg?: number;
  goalMode?: "lose" | "maintain" | "gain";
  onChanged: () => void;
}) {
  const today = todayStr();
  const latest = latestPoint(entries);
  const [date, setDate] = useState(today);
  const [kg, setKg] = useState(latest ? String(latest.weightKg) : "");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const avg = weeklyAverages(entries, today);
  const slope = slopePerWeek(entries, today);
  const advice = trendAdvice(slope, latest?.weightKg ?? null, goalMode);
  const first = entries[0];
  const q = Number(kg);
  const valid = kg.trim() !== "" && Number.isFinite(q) && q >= 20 && q <= 400;

  const progress =
    goalKg === undefined || !first || !latest || goalMode === "maintain"
      ? null
      : goalMode === "gain" && goalKg > first.weightKg
        ? Math.min(100, Math.max(0, ((latest.weightKg - first.weightKg) / (goalKg - first.weightKg)) * 100))
        : goalMode === "lose" && first.weightKg > goalKg
          ? Math.min(100, Math.max(0, ((first.weightKg - latest.weightKg) / (first.weightKg - goalKg)) * 100))
          : null;

  const recent = entries.filter((e) => dayIndex(e.date) >= dayIndex(today) - 60);

  function bump(dir: 1 | -1) {
    setKg(String(Math.max(20, round((valid ? q : (latest?.weightKg ?? 70)) + dir * 0.1, 1))));
  }

  async function save() {
    if (!valid) return;
    setBusy(true);
    try {
      await api(`/weights/${date}`, { method: "PUT", body: { weightKg: round(q, 1) } });
      toast.success(`Saved ${round(q, 1)} kg for ${shortDate(date)}`);
      onChanged();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(d: string) {
    try {
      await api(`/weights/${d}`, { method: "DELETE" });
      onChanged();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Track your weight</CardTitle>
          <CardDescription>For a consistent trend, follow these steps:</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
            <li>Weigh in each morning, after using the bathroom and before eating or drinking.</li>
            <li>Use the same scale and choose the date of your weigh-in.</li>
            <li>Enter your weight and tap “Save weight.”</li>
          </ol>
          <div className="space-y-2">
            <Label htmlFor="w-date">Date</Label>
            <DatePicker id="w-date" value={date} onChange={setDate} max={today} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="w-kg">Weight (kg)</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" onClick={() => bump(-1)} aria-label="Less">
                <Minus />
              </Button>
              <Input
                id="w-kg"
                inputMode="decimal"
                value={kg}
                onChange={(e) => setKg(e.target.value)}
                className="h-10 text-center text-lg"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => bump(1)} aria-label="More">
                <Plus />
              </Button>
            </div>
          </div>
          <Button disabled={!valid || busy} onClick={save}>
            {busy ? "Saving…" : "Save weight"}
          </Button>
        </CardContent>
      </Card>

      {latest && (
        <Card>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Tile label="Latest" value={`${latest.weightKg} kg`} sub={shortDate(latest.date)} />
              <Tile
                label="7-day average"
                value={avg.current !== null ? `${round(avg.current, 1)} kg` : "–"}
                sub={
                  avg.change !== null
                    ? `${avg.change > 0 ? "+" : ""}${round(avg.change, 1)} kg vs the week before`
                    : "needs 2 weeks of data"
                }
                tone={avg.change !== null && avg.change < 0 ? "good" : undefined}
              />
            </div>

            {progress !== null && goalKg !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{first.weightKg} kg start</span>
                  <span>
                    {Math.round(progress)}% to {goalKg} kg
                  </span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            <Sparkline points={recent} goalKg={goalKg} />

            <Alert className={cn(advice.tone === "good" && "border-primary/40", advice.tone === "warn" && "border-chart-3/40")}>
              <AlertDescription className={cn(advice.tone === "good" && "text-primary", advice.tone === "warn" && "text-chart-3")}>
                {advice.text}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {entries.length > 0 && (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="px-4 py-3">
            <CardTitle>History</CardTitle>
          </CardHeader>
          <Separator />
          <ul>
            {[...entries]
              .reverse()
              .slice(0, 14)
              .map((e, i) => (
                <li key={e.date}>
                  {i > 0 && <Separator />}
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-sm text-muted-foreground">{shortDate(e.date)}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-medium tabular-nums">{e.weightKg} kg</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPendingDelete(e.date)}
                        aria-label={`Delete ${shortDate(e.date)}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </span>
                  </div>
                </li>
              ))}
          </ul>
        </Card>
      )}

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this weigh-in?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? `${shortDate(pendingDelete)} will be removed from your history.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDelete) void remove(pendingDelete);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
