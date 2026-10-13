import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DatePicker } from "@/components/DatePicker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CarbInfo } from "@/components/CarbInfo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WeightHistory } from "@/components/WeightHistory";
import { api, errMsg } from "@/lib/api";
import { addDays, formatDayMonthYear, parseDate, todayStr } from "@/lib/date";
import { n0, n1, netCarbs } from "@/lib/nutrition";
import { MEAL_LABEL, MEALS, type Insights } from "@/lib/types";
import { cn } from "@/lib/utils";

type Range = "week" | "month";

const RANGE_DAYS: Record<Range, number> = { week: 7, month: 30 };

const RANGE_LABEL: Record<Range, string> = {
  week: "Week",
  month: "Month",
};

const kcalChartConfig = {
  kcal: { label: "Eaten", color: "var(--chart-1)" },
  target: { label: "Target", color: "var(--chart-3)" },
} satisfies ChartConfig;

const weightChartConfig = {
  weight: { label: "Weight", color: "var(--chart-2)" },
} satisfies ChartConfig;

function shortDate(d: string) {
  return parseDate(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function weekday(d: string) {
  return parseDate(d).toLocaleDateString("en-IN", { weekday: "short" });
}

function windowLabel(from: string, to: string) {
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
  const today = todayStr();
  const [range, setRange] = useState<Range>("week");
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

  const weightRows = useMemo(() => {
    if (!data) return [];
    return data.weight.entries.map((entry) => ({
      date: entry.date,
      label: range === "month"
        ? String(parseDate(entry.date).getDate())
        : range === "week"
          ? weekday(entry.date)
          : shortDate(entry.date),
      weight: entry.weightKg,
    }));
  }, [data, range]);

  const weightChange = weightRows.length > 1
    ? weightRows[weightRows.length - 1].weight - weightRows[0].weight
    : null;

  const mealTotal = data ? MEALS.reduce((s, m) => s + data.mealSplit[m], 0) : 0;
  return (
    <div className="space-y-4 pt-4">
      <ToggleGroup
        type="single"
        variant="outline"
        value={range}
        onValueChange={(v) => v && setRange(v as Range)}
        className="grid w-full grid-cols-2"
      >
        {(["week", "month"] as const).map((r) => (
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
              {data ? windowLabel(data.from, data.to) : RANGE_LABEL[range]}
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
          <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Calories vs target</CardTitle>
                <CardDescription>
                  Average {n0(data.averages.kcal)} kcal on logged days · {n1(data.averages.protein)} g protein
                </CardDescription>
              </CardHeader>
              <CardContent>
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

        </>
      )}

      {data && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Weight insights</CardTitle>
            <CardDescription>{windowLabel(data.from, data.to)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {weightRows.length ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Tile
                    label="First weigh-in"
                    value={`${n1(weightRows[0].weight)} kg`}
                    sub={formatDayMonthYear(weightRows[0].date)}
                  />
                  <Tile
                    label="Latest weigh-in"
                    value={`${n1(weightRows[weightRows.length - 1].weight)} kg`}
                    sub={formatDayMonthYear(weightRows[weightRows.length - 1].date)}
                  />
                </div>
                {weightChange !== null && (
                  <p className="text-sm tabular-nums text-muted-foreground">
                    Change from first to latest weigh-in: {signedKg(weightChange)}
                  </p>
                )}
                {weightRows.length > 1 && (
                  <ChartContainer config={weightChartConfig} className="aspect-auto h-44 w-full">
                    <ComposedChart data={weightRows} accessibilityLayer margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} interval={range === "month" ? 4 : 0} />
                      <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(_, payload) => {
                              const date = payload?.[0]?.payload?.date as string | undefined;
                              return date ? formatDayMonthYear(date) : "";
                            }}
                          />
                        }
                      />
                      <Line
                        dataKey="weight"
                        type="monotone"
                        stroke="var(--color-weight)"
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        strokeWidth={2}
                      />
                    </ComposedChart>
                  </ChartContainer>
                )}
                {weightRows.length === 1 && (
                  <p className="text-sm text-muted-foreground">Log another weigh-in in this period to see your weight trend.</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No weigh-ins in this {range}. Log one in Profile → Weight Tracker.</p>
            )}
          </CardContent>
        </Card>
      )}
      <WeightHistory />
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
