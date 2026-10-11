export const MEALS = ["breakfast", "lunch", "snack", "dinner"] as const;
export type Meal = (typeof MEALS)[number];

// Where a food came from. "local" = curated Indian DB (Stage 3), "usda", "off" = Open Food Facts, "custom" = user-made.
export const SOURCES = ["local", "usda", "off", "custom"] as const;

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
