import { Schema } from "mongoose";

export const nutrientsSchema = new Schema(
  {
    kcal: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
    fiber: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

export const servingSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    grams: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);
