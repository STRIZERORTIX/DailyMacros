// Run: npm run seed        (from the project root or the server folder)
// Safe to run repeatedly: foods are upserted by slug, so edits to the data files update existing rows.
import mongoose from "mongoose";
import { z } from "zod";
import { ALL_FOODS } from "../data/index.js";
import { per100gSchema, servingSchema } from "../lib/schemas.js";
import { connectDb } from "../db.js";
import { Food } from "../models/Food.js";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function parseServings(s: string) {
  if (!s) return [];
  return s.split("|").map((part) => {
    const i = part.lastIndexOf(":");
    return { label: part.slice(0, i).trim(), grams: Number(part.slice(i + 1)) };
  });
}

async function main() {
  const seen = new Set<string>();
  const docs = ALL_FOODS.map(([name, aliasStr, category, kcal, protein, carbs, fat, fiber, servingStr]) => {
    const slug = slugify(name);
    if (seen.has(slug)) throw new Error(`Duplicate food slug: ${slug}`);
    seen.add(slug);

    const aliases = aliasStr
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
    const per100g = per100gSchema.parse({ kcal, protein, carbs, fat, fiber });
    const servings = z.array(servingSchema).parse(parseServings(servingStr));

    // Sanity check: calories should roughly match 4*protein + 4*carbs + 9*fat. Warn so typos get noticed.
    const est = 4 * protein + 4 * carbs + 9 * fat;
    if (Math.abs(est - kcal) > Math.max(25, 0.15 * kcal)) {
      console.warn(`  check "${name}": ${kcal} kcal listed, macros add up to ~${Math.round(est)}`);
    }

    return {
      slug,
      name,
      aliases,
      category,
      searchText: [name, ...aliases].join(" | ").toLowerCase(),
      per100g,
      servings,
    };
  });

  await connectDb();
  const result = await Food.bulkWrite(
    docs.map((d) => ({ updateOne: { filter: { slug: d.slug }, update: { $set: d }, upsert: true } })),
  );
  console.log(`Foods in file: ${docs.length}. Inserted: ${result.upsertedCount}, updated: ${result.modifiedCount}.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
