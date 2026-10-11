import { cached, clamp, fetchJson, round1 } from "./http.js";
import type { FoodResult } from "./types.js";

// Open Food Facts: free, no key. Packaged products, with strong Indian coverage when filtered by country.
// Their rules: send a descriptive User-Agent, and keep search traffic low (cache everything, no per-keystroke calls).
const HEADERS = { "User-Agent": "KCalTracker/0.3 (personal calorie tracker)" };
const FIELDS = "code,product_name,brands,nutriments,serving_size,serving_quantity";

type OffProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  nutriments?: Record<string, unknown>;
  serving_size?: string;
  serving_quantity?: number | string;
};

function num(v: unknown): number | undefined {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

function toFood(p: OffProduct): FoodResult | null {
  const n = p.nutriments ?? {};
  let kcal = num(n["energy-kcal_100g"]);
  if (kcal === undefined) {
    const kj = num(n["energy_100g"]);
    if (kj !== undefined) kcal = kj / 4.184;
  }
  const name = p.product_name?.trim();
  if (!name || !p.code || kcal === undefined) return null;

  const grams = num(p.serving_quantity);
  const brand = p.brands?.split(",")[0]?.trim();
  return {
    id: `off:${p.code}`,
    source: "off",
    externalId: p.code,
    name,
    brand: brand || undefined,
    per100g: {
      kcal: Math.round(clamp(kcal, 1000)),
      protein: round1(clamp(num(n["proteins_100g"]) ?? 0, 100)),
      carbs: round1(clamp(num(n["carbohydrates_100g"]) ?? 0, 100)),
      fat: round1(clamp(num(n["fat_100g"]) ?? 0, 100)),
      fiber: round1(clamp(num(n["fiber_100g"]) ?? 0, 100)),
    },
    servings: grams && grams > 0 ? [{ label: `1 serving (${p.serving_size?.trim() || `${grams} g`})`, grams }] : [],
  };
}

export async function searchOff(q: string): Promise<FoodResult[]> {
  const query = q.toLowerCase().trim();
  return cached(`off:search:in:${query}`, async () => {
    const url =
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
      `&search_simple=1&action=process&json=1&page_size=12&fields=${FIELDS}` +
      `&tagtype_0=countries&tag_contains_0=contains&tag_0=india`;
    const data = await fetchJson<{ products?: OffProduct[] }>(url, HEADERS, 9000);
    return (data.products ?? []).map(toFood).filter((x): x is FoodResult => x !== null);
  });
}

/** Look up one packaged product by its barcode (EAN-13 etc.). Returns null if unknown or has no calorie data. */
export async function getOffBarcode(code: string): Promise<FoodResult | null> {
  return cached(`off:barcode:${code}`, async () => {
    const data = await fetchJson<{ status?: number; product?: OffProduct }>(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`,
      HEADERS,
      9000,
    );
    if (data.status !== 1 || !data.product) return null;
    return toFood({ ...data.product, code: data.product.code ?? code });
  });
}
