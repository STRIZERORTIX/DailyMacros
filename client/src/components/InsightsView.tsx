import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DatePicker } from "@/components/DatePicker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CarbInfo } from "@/components/CarbInfo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { addDays, parseDate, todayStr } from "@/lib/date";
import { n0, n1, netCarbs } from "@/lib/nutrition";
import { MEAL_LABEL, MEALS, type InsightRange, type Insights } from "@/lib/types";
import { trendAdvice } from "@/lib/weight";
import { cn } from "@/lib/utils";

const RANGE_DAYS: Record<InsightRange, number> = { day: 1, week: 7, month: 30 };

const RANGE_LABEL: Record<InsightRange, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
};

const kcalChartConfig = {
  kcal: { label: "Eaten", color: "var(--chart-1)" },
  target: { label: "Target", color: "var(--chart-3)" },
} satisfies ChartConfig;

function shortDate(d: string) {
  return parseDate(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function weekday(d: string) {
  return parseDate(d).toLocaleDateString("en-IN", { weekday: "short" });
}

function windowLabel(range: InsightRange, from: string, to: string) {
  if (range === "day") return parseDate(to).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  return `${shortDate(from)} – ${shortDate(to)}`;
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs tabular-nums text-muted-foreground">{sub}</p>}
    </div>
  );
}

function signedKg(n: number) {
  const abs = Math.round(Math.abs(n) * 100) / 100;
  if (n > 0) return `+${abs} kg`;
  if (n < 0) return `−${abs} kg`;
  return "0 kg";
}

export function InsightsView() {
  const { user } = useAuth();
  const today = todayStr();
  const [range, setRange] = useState<InsightRange>("week");
  const [end, setEnd] = useState(today);
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const step = RANGE_DAYS[range];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<Insights>(`/insights?range=${range}&end=${end}`)
      .then((r) => {
        if (cancelled) return;
        setData(r);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) {
          setData(null);
          setError(errMsg(e));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, end, version]);

  function changeEnd(next: string) {
    setEnd(next > today ? today : next);
  }

  const chartRows = useMemo(() => {
    if (!data) return [];
    return data.days.map((d) => ({
      date: d.date,
      label: data.range === "month" ? String(parseDate(d.date).getDate()) : weekday(d.date),
      kcal: d.logged ? d.totals.kcal : 0,
      target: d.target.kcal,
      logged: d.logged,
    }));
  }, [data]);

  const mealTotal = data ? MEALS.reduce((s, m) => s + data.mealSplit[m], 0) : 0;
  const advice = trendAdvice(
    data?.weight.slopePerWeek ?? null,
    data?.weight.latestKg ?? null,
    user?.profile.goalMode ?? "lose",
  );

  return (
    <div className="space-y-4 pt-4">
      <ToggleGroup
        type="single"
        variant="outline"
        value={range}
        onValueChange={(v) => v && setRange(v as InsightRange)}
        className="grid w-full grid-cols-3"
      >
        {(["day", "week", "month"] as const).map((r) => (
          <ToggleGroupItem key={r} value={r} className="w-full">
            {RANGE_LABEL[r]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="flex items-center justify-between gap-1">
        <Button variant="ghost" size="icon" onClick={() => changeEnd(addDays(end, -step))} aria-label="Previous period">
          <ChevronLeft />
        </Button>
        <DatePicker value={end} onChange={changeEnd} max={today}>
          <Button type="button" variant="ghost" className="h-auto flex-col gap-0 px-3 py-1">
            <span className="text-sm font-semibold">Ending {shortDate(end)}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {data ? windowLabel(range, data.from, data.to) : RANGE_LABEL[range]}
            </span>
          </Button>
        </DatePicker>
        <Button
          variant="ghost"
          size="icon"
          disabled={end >= today}
          onClick={() => changeEnd(addDays(end, step))}
          aria-label="Next period"
        >
          <ChevronRight />
        </Button>
      </div>

      {end !== today && (
        <div className="text-center">
          <Button type="button" variant="link" size="sm" onClick={() => changeEnd(today)}>
            Jump to today
          </Button>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Could not load insights</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button variant="secondary" size="sm" onClick={() => setVersion((v) => v + 1)}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading && !data && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {data && data.adherence.loggedDays === 0 && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BarChart3 />
            </EmptyMedia>
            <EmptyTitle>Nothing logged in this {range}</EmptyTitle>
            <EmptyDescription>
              Log meals on Today and they will show up here as calories vs target, meal split, and a streak.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {data && data.adherence.loggedDays > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Tile
              label="Streak"
              value={`${data.adherence.streak}d`}
              sub={data.adherence.streak === 1 ? "consecutive day" : "consecutive days"}
            />
            <Tile
              label="Logged"
              value={`${data.adherence.loggedDays}/${data.adherence.totalDays}`}
              sub="days in this window"
            />
            <Tile
              label="Calories"
              value={`${data.adherence.hitCaloriesDays}`}
              sub="days within 10% of target"
            />
            <Tile
              label="Protein"
              value={`${data.adherence.hitProteinDays}`}
              sub="days at 90% of target"
            />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Calories vs target</CardTitle>
              <CardDescription>
                Average {n0(data.averages.kcal)} kcal on logged days
                {range !== "day" ? ` · ${n1(data.averages.protein)} g protein` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {range === "day" ? (
                <DayBreakdown data={data} />
              ) : (
                <ChartContainer config={kcalChartConfig} className="aspect-auto h-44 w-full">
                  <ComposedChart data={chartRows} accessibilityLayer margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} interval={range === "month" ? 4 : 0} />
                    <YAxis hide domain={[0, "auto"]} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(_, payload) => {
                            const date = payload?.[0]?.payload?.date as string | undefined;
                            return date ? shortDate(date) : "";
                          }}
                        />
                      }
                    />
                    <Bar dataKey="kcal" fill="var(--color-kcal)" radius={3} maxBarSize={range === "week" ? 28 : 10} />
                    <Line
                      dataKey="target"
                      type="monotone"
                      stroke="var(--color-target)"
                      strokeDasharray="4 4"
                      dot={false}
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Macros (logged-day average)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MacroRow label="Protein" value={data.averages.protein} unit="g" swatch="bg-chart-1" />
              <MacroRow
                label={<>Total carbs <CarbInfo /></>}
                value={data.averages.carbs}
                unit="g"
                swatch="bg-chart-2"
              />
              <MacroRow
                label={<>Net carbs <CarbInfo /></>}
                value={netCarbs(data.averages.carbs, data.averages.fiber)}
                unit="g"
                swatch="bg-chart-4"
              />
              <MacroRow label="Fat" value={data.averages.fat} unit="g" swatch="bg-chart-3" />
              <MacroRow label="Fibre" value={data.averages.fiber} unit="g" swatch="bg-chart-5" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Meal split</CardTitle>
              <CardDescription>Share of calories in this window</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {mealTotal === 0 ? (
                <p className="text-sm text-muted-foreground">No calories in this window.</p>
              ) : (
                <>
                  <div className="flex h-2.5 overflow-hidden rounded-full">
                    {MEALS.map((m, i) => {
                      const pct = (data.mealSplit[m] / mealTotal) * 100;
                      if (pct <= 0) return null;
                      return (
                        <div
                          key={m}
                          className={cn(
                            i === 0 && "rounded-l-full",
                            i === 3 && "rounded-r-full",
                            ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4"][i],
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      );
                    })}
                  </div>
                  <ul className="space-y-2">
                    {MEALS.map((m, i) => {
                      const kcal = data.mealSplit[m];
                      const pct = Math.round((kcal / mealTotal) * 100);
                      return (
                        <li key={m} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className={cn("size-2 rounded-full", ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4"][i])} />
                            {MEAL_LABEL[m]}
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {n0(kcal)} kcal · {pct}%
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <Card className="gap-2 py-4">
              <CardHeader className="px-4 pb-0">
                <CardTitle className="text-sm text-muted-foreground">Closest to target</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                {data.bestDay ? (
                  <>
                    <p className="font-semibold">{shortDate(data.bestDay.date)}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {n0(data.bestDay.kcal)} / {n0(data.bestDay.targetKcal)} kcal
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </CardContent>
            </Card>
            <Card className="gap-2 py-4">
              <CardHeader className="px-4 pb-0">
                <CardTitle className="text-sm text-muted-foreground">Biggest overshoot</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                {data.worstDay ? (
                  <>
                    <p className="font-semibold">{shortDate(data.worstDay.date)}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {n0(data.worstDay.kcal)} / {n0(data.worstDay.targetKcal)} kcal
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Weight</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Tile
                  label="Latest"
                  value={data.weight.latestKg != null ? `${n1(data.weight.latestKg)} kg` : "—"}
                  sub={data.weight.latestDate ? shortDate(data.weight.latestDate) : "log in Goals"}
                />
                <Tile
                  label="7-day avg"
                  value={data.weight.avg7d != null ? `${n1(data.weight.avg7d)} kg` : "—"}
                  sub={
                    data.weight.avg7dChange != null
                      ? `${signedKg(data.weight.avg7dChange)} vs last week`
                      : "need two weeks of weigh-ins"
                  }
                />
              </div>
              {data.weight.slopePerWeek != null && (
                <p className="text-xs tabular-nums text-muted-foreground">
                  Trend {signedKg(data.weight.slopePerWeek)} / week
                </p>
              )}
              <Alert>
                <AlertDescription className={advice.tone === "good" ? "text-primary" : undefined}>
                  {advice.text}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function DayBreakdown({ data }: { data: Insights }) {
  const day = data.days[0];
  if (!day) return null;
  const left = day.target.kcal - day.totals.kcal;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-2xl font-bold tabular-nums">{n0(day.totals.kcal)}</p>
        <span className="text-sm text-muted-foreground">/ {n0(day.target.kcal)} kcal</span>
        {day.target.maintenanceDay && <Badge variant="secondary">Maintenance</Badge>}
        {day.hitCalories && <Badge>On target</Badge>}
        {day.hitProtein && <Badge variant="outline">Protein hit</Badge>}
      </div>
      <p className="text-sm tabular-nums text-muted-foreground">
        {left >= 0 ? `${n0(left)} kcal left` : `${n0(Math.abs(left))} kcal over`} · {n1(day.totals.protein)} /{" "}
        {n1(day.target.protein)} g protein
      </p>
      <Progress value={Math.min(100, (day.totals.kcal / Math.max(day.target.kcal, 1)) * 100)} />
    </div>
  );
}

function MacroRow({
  label,
  value,
  unit,
  swatch,
}: {
  label: React.ReactNode;
  value: number;
  unit: string;
  swatch: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2">
        <span className={cn("size-2 rounded-full", swatch)} />
        <span className="flex items-center gap-1">{label}</span>
      </span>
      <span className="tabular-nums text-muted-foreground">
        {n1(value)} {unit}
      </span>
    </div>
  );
}
