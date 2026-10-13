import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api, errMsg } from "@/lib/api";
import { addDays, formatDayMonthYear, todayStr } from "@/lib/date";
import type { WeightPoint } from "@/lib/weight";

export function WeightHistory() {
  const [entries, setEntries] = useState<WeightPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const to = todayStr();
    api<{ entries: WeightPoint[] }>(`/weights?from=${addDays(to, -730)}&to=${to}`)
      .then((result) => {
        if (!cancelled) {
          setEntries(result.entries);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errMsg(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="px-4 py-3">
          <CardTitle>Weight history</CardTitle>
          {!loading && !error && entries.length > 0 && (
            <CardDescription>{entries.length} weigh-ins · newest first</CardDescription>
          )}
        </CardHeader>
        <Separator />
        {error ? (
          <CardContent className="py-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        ) : loading ? (
          <CardContent className="py-4 text-sm text-muted-foreground">Loading weight history…</CardContent>
        ) : entries.length === 0 ? (
          <CardContent className="py-4 text-sm text-muted-foreground">No weigh-ins logged yet.</CardContent>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {[...entries].reverse().map((entry, index) => (
              <li key={entry.date}>
                {index > 0 && <Separator />}
                <div className="flex items-center justify-between gap-3 px-4 py-2">
                  <span className="text-sm text-muted-foreground">{formatDayMonthYear(entry.date)}</span>
                  <span className="font-medium tabular-nums">{entry.weightKg} kg</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
  );
}
