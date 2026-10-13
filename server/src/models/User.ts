import { Schema, model } from "mongoose";

// Used by the calculator (Stage 5). All optional until the user fills them in.
const profileSchema = new Schema(
  {
    sex: { type: String, enum: ["male", "female"] },
    goalMode: { type: String, enum: ["lose", "maintain", "gain"] },
    age: Number,
    heightCm: Number,
    weightKg: Number,
    goalWeightKg: Number,
    activityFactor: { type: Number, default: 1.2 },
    maintenanceKcal: Number,
    cutTargetKcal: Number,
    deficitKcal: { type: Number, default: 500 },
    calorieAdjustment: Number,
    sundayMaintenance: { type: Boolean, default: true },
    proteinPerKg: { type: Number, default: 1.6 },
  },
  { _id: false },
);

const mealReminderSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    time: { type: String, default: "08:00" },
  },
  { _id: false },
);

const remindersSchema = new Schema(
  {
    timezone: { type: String, default: "" },
    meals: {
      breakfast: { type: mealReminderSchema, default: () => ({ time: "08:00" }) },
      lunch: { type: mealReminderSchema, default: () => ({ time: "13:00" }) },
      dinner: { type: mealReminderSchema, default: () => ({ time: "19:00" }) },
    },
    sent: {
      breakfast: String,
      lunch: String,
      dinner: String,
    },
    subscriptions: [
      {
        endpoint: { type: String, required: true },
        keys: {
          p256dh: { type: String, required: true },
          auth: { type: String, required: true },
        },
      },
    ],
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: String, // absent for accounts that only use Google sign-in
    googleId: { type: String, unique: true, sparse: true },
    name: { type: String, trim: true, default: "" },
    profile: { type: profileSchema, default: () => ({}) },
    reminders: { type: remindersSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export const User = model("User", userSchema);
