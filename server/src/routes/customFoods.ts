import { Router } from "express";
import { z } from "zod";
import { HttpError, objectId } from "../lib/http.js";
import { per100gSchema, servingSchema } from "../lib/schemas.js";
import { requireAuth } from "../middleware/auth.js";
import { CustomFood } from "../models/CustomFood.js";

export const customFoodsRouter = Router();
customFoodsRouter.use(requireAuth);

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  aliases: z.array(z.string().trim().max(60)).max(20).optional(),
  per100g: per100gSchema,
  servings: z.array(servingSchema).max(20).optional(),
});
const updateSchema = createSchema.partial();

customFoodsRouter.get("/", async (req, res) => {
  const foods = await CustomFood.find({ user: req.userId }).sort({ name: 1 }).lean();
  res.json({ foods });
});

customFoodsRouter.post("/", async (req, res) => {
  const b = createSchema.parse(req.body);
  const food = await CustomFood.create({
    user: req.userId,
    name: b.name,
    aliases: b.aliases ?? [],
    per100g: b.per100g,
    servings: b.servings ?? [],
  });
  res.status(201).json(food);
});

customFoodsRouter.patch("/:id", async (req, res) => {
  const id = objectId(req.params.id);
  const b = updateSchema.parse(req.body);
  const food = await CustomFood.findOneAndUpdate({ _id: id, user: req.userId }, { $set: b }, { new: true });
  if (!food) throw new HttpError(404, "Food not found");
  res.json(food);
});

customFoodsRouter.delete("/:id", async (req, res) => {
  const id = objectId(req.params.id);
  const result = await CustomFood.deleteOne({ _id: id, user: req.userId });
  if (result.deletedCount === 0) throw new HttpError(404, "Food not found");
  res.status(204).end();
});
