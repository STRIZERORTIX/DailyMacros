export type WeightPoint = { date: string; weightKg: number };

const dayIndex = (s: string): number => {
  const [y, m, d] = s.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};

function avgIn(pts: readonly WeightPoint[], fromIdx: number, toIdx: number): number | null {
  const xs = pts.filter((p) => {
    const i = dayIndex(p.date);
    return i >= fromIdx && i <= toIdx;
  });
  return xs.length ? xs.reduce((s, p) => s + p.weightKg, 0) / xs.length : null;
}

export function weeklyAverages(pts: readonly WeightPoint[], today: string) {
  const t = dayIndex(today);
  const current = avgIn(pts, t - 6, t);
  const previous = avgIn(pts, t - 13, t - 7);
  return { current, previous, change: current !== null && previous !== null ? current - previous : null };
}

export function slopePerWeek(pts: readonly WeightPoint[], today: string, windowDays = 28): number | null {
  const t = dayIndex(today);
  const xs = pts
    .map((p) => ({ x: dayIndex(p.date), y: p.weightKg }))
    .filter((p) => p.x >= t - windowDays && p.x <= t);
  if (xs.length < 3) return null;
  const minX = Math.min(...xs.map((p) => p.x));
  const maxX = Math.max(...xs.map((p) => p.x));
  if (maxX - minX < 7) return null;
  const mx = xs.reduce((s, p) => s + p.x, 0) / xs.length;
  const my = xs.reduce((s, p) => s + p.y, 0) / xs.length;
  let num = 0;
  let den = 0;
  for (const p of xs) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  return den === 0 ? null : (num / den) * 7;
}
