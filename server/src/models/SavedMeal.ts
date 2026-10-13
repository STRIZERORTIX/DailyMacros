import { Schema, model } from "mongoose";
import { nutrientsSchema } from "./shared.js";

const savedMealItemSchema = new Schema(
  {
    food: {
      source: { type: String, enum: ["custom"], required: true },
      externalId: { type: String, required: true },
      name: { type: String, required: true },
      per100g: { type: nutrientsSchema, required: true },
    },
    grams: { type: Number, required: true, min: 1, max: 10000 },
  },
  { _id: false },
);

const savedMealSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    items: { type: [savedMealItemSchema], required: true },
  },
  { timestamps: true },
);

savedMealSchema.index({ user: 1, name: 1 });

export const SavedMeal = model("SavedMeal", savedMealSchema);
