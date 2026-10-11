import { Schema, model } from "mongoose";

const weightSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    weightKg: { type: Number, required: true, min: 20, max: 400 },
  },
  { timestamps: true },
);

// One weigh-in per user per day.
weightSchema.index({ user: 1, date: 1 }, { unique: true });

export const WeightEntry = model("WeightEntry", weightSchema);
