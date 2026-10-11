import { Schema, model } from "mongoose";
import { nutrientsSchema, servingSchema } from "./shared.js";

// Foods the user creates themselves (e.g. "SuperYou protein, 1 scoop", "Amma's sambar").
const customFoodSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    aliases: { type: [String], default: [] },
    per100g: { type: nutrientsSchema, required: true },
    servings: { type: [servingSchema], default: [] },
  },
  { timestamps: true },
);

customFoodSchema.index({ user: 1, name: 1 });

export const CustomFood = model("CustomFood", customFoodSchema);
