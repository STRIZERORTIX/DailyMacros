import { z } from "zod";
import { DATE_RE } from "./constants.js";

export const dateStr = z
  .string()
  .regex(DATE_RE, "Use YYYY-MM-DD")
  .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date");

/** Nutrients per 100 g (or 100 ml for drinks, treated as 100 g). */
export const per100gSchema = z.object({
  kcal: z.number().min(0).max(1000),
  protein: z.number().min(0).max(100),
  carbs: z.number().min(0).max(100),
  fat: z.number().min(0).max(100),
  fiber: z.number().min(0).max(100).default(0),
});

/** A named portion, e.g. { label: "1 idli", grams: 39 }. */
export const servingSchema = z.object({
  label: z.string().trim().min(1).max(60),
  grams: z.number().positive().max(5000),
});
