import { Schema, model } from "mongoose";
import { MEALS, SOURCES } from "../lib/constants.js";
import { nutrientsSchema } from "./shared.js";

// One food eaten in one meal on one day.
// The food's per-100 g values are snapshotted here so old days never change if a food is edited later.
const logSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    meal: { type: String, enum: [...MEALS], required: true },
    food: {
      source: { type: String, enum: [...SOURCES], required: true },
      externalId: String,
      name: { type: String, required: true, trim: true },
      brand: String,
      per100g: { type: nutrientsSchema, required: true },
    },
    grams: { type: Number, required: true, min: 0 },
    servingLabel: String, // e.g. "idli"
    servings: Number, // e.g. 3
    totals: { type: nutrientsSchema, required: true }, // computed server-side from per100g * grams / 100
  },
  { timestamps: true },
);

logSchema.index({ user: 1, date: 1 });

export const LogEntry = model("LogEntry", logSchema);
