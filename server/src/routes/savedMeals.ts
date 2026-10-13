import { Router } from "express";
import { z } from "zod";
import { HttpError, objectId } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";
import { CustomFood } from "../models/CustomFood.js";
import { SavedMeal } from "../models/SavedMeal.js";

export const savedMealsRouter = Router();
savedMealsRouter.use(requireAuth);

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  items: z.array(z.object({
    customFoodId: z.string().regex(/^[a-f\d]{24}$/i),
    grams: z.number().min(1).max(10000),
  })).min(1).max(30),
});
const updateSchema = createSchema;

async function resolveItems(
  userId: string,
  items: z.infer<typeof createSchema>["items"],
) {
  const ids = [...new Set(items.map((item) => item.customFoodId))];
  const foods = await CustomFood.find({ _id: { $in: ids }, user: userId }).lean();
  if (foods.length !== ids.length) throw new HttpError(400, "One or more selected foods are unavailable");
  const byId = new Map(foods.map((food) => [String(food._id), food]));
  return items.map((item) => {
    const food = byId.get(item.customFoodId);
    if (!food) throw new HttpError(400, "One or more selected foods are unavailable");
    return {
      food: {
        source: "custom" as const,
        externalId: String(food._id),
        name: food.name,
        per100g: food.per100g,
      },
      grams: item.grams,
    };
  });
}

savedMealsRouter.get("/", async (req, res) => {
  const meals = await SavedMeal.find({ user: req.userId }).sort({ name: 1 }).lean();
  res.json({ meals });
});

savedMealsRouter.post("/", async (req, res) => {
  const userId = req.userId;
  if (!userId) throw new HttpError(401, "Authentication required");
  const body = createSchema.parse(req.body);
  const meal = await SavedMeal.create({
    user: userId,
    name: body.name,
    items: await resolveItems(userId, body.items),
  });
  res.status(201).json(meal);
});

savedMealsRouter.patch("/:id", async (req, res) => {
  const userId = req.userId;
  if (!userId) throw new HttpError(401, "Authentication required");
  const id = objectId(req.params.id);
  const body = updateSchema.parse(req.body);
  const items = await resolveItems(userId, body.items);
  const meal = await SavedMeal.findOneAndUpdate(
    { _id: id, user: userId },
    { $set: { name: body.name, items } },
    { new: true, runValidators: true },
  );
  if (!meal) throw new HttpError(404, "Saved meal not found");
  res.json(meal);
});

savedMealsRouter.delete("/:id", async (req, res) => {
  const id = objectId(req.params.id);
  const result = await SavedMeal.deleteOne({ _id: id, user: req.userId });
  if (result.deletedCount === 0) throw new HttpError(404, "Saved meal not found");
  res.status(204).end();
});
