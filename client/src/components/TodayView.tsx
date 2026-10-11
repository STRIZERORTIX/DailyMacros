import { ChevronLeft, ChevronRight, Copy, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DatePicker } from "@/components/DatePicker";
import { DaySummary } from "@/components/DaySummary";
import { FoodSheet } from "@/components/FoodSheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dayTargets } from "@/lib/calc";
import { addDays, dayLabel, longDate, suggestedMeal, todayStr } from "@/lib/date";
import { n0, n1, portionText } from "@/lib/nutrition";
import { MEAL_LABEL, MEALS, type DayLog, type LogEntry, type Meal, type Nutrients } from "@/lib/types";

type SheetState = { open: boolean; meal: Meal; entry?: LogEntry };

function MealCard({
  meal,
  entries,
  totals,
  suggested,
  onAdd,
  onEdit,
}: {
  meal: Meal;
  entries: LogEntry[];
  totals: Nutrients;
  suggested: boolean;
  onAdd: () => void;
  onEdit: (e: LogEntry) => void;
}) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="flex-row items-center justify-between px-4 py-3">
        <div>
          <CardTitle className="text-base">{MEAL_LABEL[meal]}</CardTitle>
          <p className="text-xs tabular-nums text-muted-foreground">
            {n0(totals.kcal)} kcal · {n1(totals.protein)} g protein
          </p>
        </div>
        <Button size="sm" variant={suggested ? "default" : "secondary"} onClick={onAdd}>
          <Plus className="size-4" /> Add
        </Button>
      </CardHeader>
      {entries.length > 0 && (
        <>
          <Separator />
          <ul>
            {entries.map((e, i) => (
              <li key={e._id}>
                {i > 0 && <Separator />}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onEdit(e)}
                  className="h-auto w-full justify-between gap-3 rounded-none px-4 py-3"
                >
                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm font-medium">{e.food.name}</p>
                    <p className="truncate text-xs font-normal text-muted-foreground">{portionText(e)}</p>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <p className="text-sm font-medium">{n0(e.totals.kcal)}</p>
                    <p className="text-xs font-normal text-muted-foreground">P {n1(e.totals.protein)}</p>
                  </div>
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

export function TodayView() {
  const { user } = useAuth();
  const [date, setDate] = useState(todayStr);
  const [day, setDay] = useState<DayLog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [sheet, setSheet] = useState<SheetState>({ open: false, meal: "breakfast" });

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    api<DayLog>(`/logs?date=${date}`)
      .then((d) => {
        if (cancelled) return;
        setDay(d);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(errMsg(e));
      });
    return () => {
      cancelled = true;
    };
  }, [date, version]);

  const targets = useMemo(() => dayTargets(user?.profile ?? {}, date), [user, date]);
  const nowMeal = suggestedMeal();
  const today = todayStr();

  function changeDate(next: string) {
    setDay(null);
    setError(null);
    setDate(next);
  }

  async function copyYesterday() {
    try {
      const r = await api<{ copied: number }>("/logs/copy", {
        method: "POST",
        body: { fromDate: addDays(date, -1), toDate: date },
      });
      if (r.copied === 0) toast("Nothing was logged on the previous day");
      else toast.success(`Copied ${r.copied} items`);
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function removeEntry(entry: LogEntry) {
    try {
      await api(`/logs/${entry._id}`, { method: "DELETE" });
    } catch (e) {
      toast.error(errMsg(e));
      return;
    }
    setSheet((s) => ({ ...s, open: false }));
    reload();
    toast(`Removed ${entry.food.name}`, {
      action: {
        label: "Undo",
        onClick: async () => {
          try {
            await api("/logs", {
              method: "POST",
              body: {
                date: entry.date,
                meal: entry.meal,
                food: entry.food,
                grams: entry.grams,
                servingLabel: entry.servingLabel,
                servings: entry.servings,
              },
            });
            reload();
          } catch (e) {
            toast.error(errMsg(e));
          }
        },
      },
    });
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between gap-1">
        <Button variant="ghost" size="icon" onClick={() => changeDate(addDays(date, -1))} aria-label="Previous day">
          <ChevronLeft />
        </Button>
        <DatePicker value={date} onChange={changeDate} max={today}>
          <Button type="button" variant="ghost" className="h-auto flex-col gap-0 px-3 py-1">
            <span className="text-lg font-semibold">{dayLabel(date)}</span>
            <span className="text-xs font-normal text-muted-foreground">{longDate(date)}</span>
          </Button>
        </DatePicker>
        <Button
          variant="ghost"
          size="icon"
          disabled={date >= today}
          onClick={() => changeDate(addDays(date, 1))}
          aria-label="Next day"
        >
          <ChevronRight />
        </Button>
      </div>

      {date !== today && (
        <div className="text-center">
          <Button type="button" variant="link" size="sm" onClick={() => changeDate(today)}>
            Jump to today
          </Button>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Could not load this day</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button variant="secondary" size="sm" onClick={reload}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!day && !error && (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}

      {day && (
        <>
          <DaySummary totals={day.totals} targets={targets} />

          {day.entries.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-2 text-center">
                <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
                <Button variant="outline" size="sm" onClick={copyYesterday}>
                  <Copy className="size-4" /> Copy previous day
                </Button>
              </CardContent>
            </Card>
          )}

          {MEALS.map((m) => (
            <MealCard
              key={m}
              meal={m}
              entries={day.entries.filter((e) => e.meal === m)}
              totals={day.byMeal[m]}
              suggested={m === nowMeal && date === today}
              onAdd={() => setSheet({ open: true, meal: m })}
              onEdit={(entry) => setSheet({ open: true, meal: entry.meal, entry })}
            />
          ))}
        </>
      )}

      <FoodSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        date={date}
        meal={sheet.meal}
        entry={sheet.entry}
        onChanged={reload}
        onDelete={removeEntry}
      />
    </div>
  );
}
