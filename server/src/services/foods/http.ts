import { FoodCache } from "../../models/FoodCache.js";

export async function fetchJson<T>(url: string, headers: Record<string, string> = {}, timeoutMs = 7000): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", ...headers },
    signal: AbortSignal.timeout(timeoutMs),
  });
  // Only the host goes in the message so API keys in the URL never reach logs or responses.
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return (await res.json()) as T;
}

/** Return the cached value for `key`, or compute it with `load` and cache it (7-day TTL). */
export async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = await FoodCache.findOne({ key }).lean();
  if (hit) return hit.data as T;
  const data = await load();
  await FoodCache.updateOne({ key }, { $set: { data, createdAt: new Date() } }, { upsert: true }).catch(() => {});
  return data;
}

export const round1 = (n: number) => Math.round(n * 10) / 10;
export const clamp = (n: number, max: number) => Math.min(Math.max(n, 0), max);
