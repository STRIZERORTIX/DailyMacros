// Pure functions, no imports, so they are easy to test and reuse.

export type Per100g = { kcal: number; protein: number; carbs: number; fat: number; fiber?: number };
export type Totals = { kcal: number; protein: number; carbs: number; fat: number; fiber: number };

const r1 = (n: number) => Math.round(n * 10) / 10;

export const emptyTotals = (): Totals => ({ kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

/** Nutrients for `grams` of a food, given its per-100 g values. */
export function totalsFor(per100g: Per100g, grams: number): Totals {
  const f = grams / 100;
  return {
    kcal: Math.round(per100g.kcal * f),
    protein: r1(per100g.protein * f),
    carbs: r1(per100g.carbs * f),
    fat: r1(per100g.fat * f),
    fiber: r1((per100g.fiber ?? 0) * f),
  };
}

/** Sum a list of totals (e.g. a day, or one meal). */
export function sumTotals(list: ReadonlyArray<Partial<Totals> | null | undefined>): Totals {
  const t = emptyTotals();
  for (const x of list) {
    if (!x) continue;
    t.kcal += x.kcal ?? 0;
    t.protein += x.protein ?? 0;
    t.carbs += x.carbs ?? 0;
    t.fat += x.fat ?? 0;
    t.fiber += x.fiber ?? 0;
  }
  return { kcal: Math.round(t.kcal), protein: r1(t.protein), carbs: r1(t.carbs), fat: r1(t.fat), fiber: r1(t.fiber) };
}
