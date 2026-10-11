import type { LogEntry, Nutrients } from "./types";

export const round = (n: number, d = 1) => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

export function netCarbs(carbs: number, fiber: number): number {
  return round(Math.max(0, carbs - fiber));
}

/** Same maths and rounding as the server, used for live previews. */
export function totalsFor(per100g: Nutrients, grams: number): Nutrients {
  const f = grams / 100;
  return {
    kcal: Math.round(per100g.kcal * f),
    protein: round(per100g.protein * f),
    carbs: round(per100g.carbs * f),
    fat: round(per100g.fat * f),
    fiber: round((per100g.fiber ?? 0) * f),
  };
}

export const n0 = (n: number) => Math.round(n).toLocaleString("en-IN");
export const n1 = (n: number) => String(round(n, 1));

/** "3 idli · 117 g", "2 × 3 idli · 234 g" or "150 g" */
export function portionText(e: Pick<LogEntry, "grams" | "servingLabel" | "servings">): string {
  const g = Math.round(e.grams);
  if (e.servingLabel && e.servings) {
    const q = round(e.servings, 2);
    const l = e.servingLabel;
    return `${l.startsWith("1 ") ? `${q} ${l.slice(2)}` : `${q} × ${l}`} · ${g} g`;
  }
  return `${g} g`;
}
