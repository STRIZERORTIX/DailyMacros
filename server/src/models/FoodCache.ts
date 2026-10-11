import { Schema, model } from "mongoose";

// Cache for USDA / Open Food Facts responses. Documents delete themselves after 7 days (TTL index).
// This keeps us inside the free API rate limits and makes repeat searches instant.
const cacheSchema = new Schema({
  key: { type: String, required: true, unique: true },
  data: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 },
});

export const FoodCache = model("FoodCache", cacheSchema);
