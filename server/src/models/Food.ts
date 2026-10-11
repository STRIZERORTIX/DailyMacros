import { Schema, model } from "mongoose";
import { nutrientsSchema, servingSchema } from "./shared.js";

export type FoodRecord = {
  slug: string;
  name: string;
  aliases: string[];
  category?: string;
  searchText: string;
  per100g: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  servings: { label: string; grams: number }[];
};

// Curated Indian / South Indian foods (seeded from src/data). Per-100 g values for the food as eaten (cooked).
const foodSchema = new Schema<FoodRecord>(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    aliases: { type: [String], default: [] }, // local names / spellings: kadala, sundal, moru ...
    category: String,
    searchText: { type: String, required: true }, // lowercase name + aliases, searched with partial matching
    per100g: { type: nutrientsSchema, required: true },
    servings: { type: [servingSchema], default: [] },
  },
  { timestamps: true },
);

export const Food = model<FoodRecord>("Food", foodSchema);
