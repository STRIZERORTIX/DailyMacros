import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, errMsg } from "@/lib/api";
import { n0, n1 } from "@/lib/nutrition";
import type { CustomFoodRecord, SavedMeal } from "@/lib/types";

type FoodDraft = {
  name: string;
  servingLabel: string;
  servingGrams: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
};

type MealDraftItem = { customFoodId: string; grams: string };
type PendingDelete = { type: "food"; item: CustomFoodRecord } | { type: "meal"; item: SavedMeal };

const emptyFoodDraft: FoodDraft = {
  name: "", servingLabel: "1 serving", servingGrams: "100",
  kcal: "", protein: "", carbs: "", fat: "", fiber: "",
};

function displayPerServing(food: CustomFoodRecord) {
  const serving = food.servings[0] ?? { label: "100 g", grams: 100 };
  const factor = serving.grams / 100;
  return {
    serving,
    kcal: String(Math.round(food.per100g.kcal * factor)),
    protein: String(n1(food.per100g.protein * factor)),
    carbs: String(n1(food.per100g.carbs * factor)),
    fat: String(n1(food.per100g.fat * factor)),
    fiber: String(n1(food.per100g.fiber * factor)),
  };
}

function toFoodBody(draft: FoodDraft) {
  const grams = Number(draft.servingGrams);
  const per = (value: string) => Math.round((Number(value || 0) / grams) * 100 * 10) / 10;
  return {
    name: draft.name.trim(),
    per100g: {
      kcal: Math.round(per(draft.kcal)),
      protein: per(draft.protein),
      carbs: per(draft.carbs),
      fat: per(draft.fat),
      fiber: per(draft.fiber),
    },
    servings: [{ label: draft.servingLabel.trim() || "1 serving", grams }],
  };
}

export function CustomFoodsView({ initialName = "" }: { initialName?: string }) {
  const [foods, setFoods] = useState<CustomFoodRecord[]>([]);
  const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [foodDialogOpen, setFoodDialogOpen] = useState(Boolean(initialName.trim()));
  const [foodDraft, setFoodDraft] = useState<FoodDraft>({ ...emptyFoodDraft, name: initialName });
  const [savingFood, setSavingFood] = useState(false);
  const [mealDialogOpen, setMealDialogOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<string | null>(null);
  const [mealName, setMealName] = useState("");
  const [mealDraft, setMealDraft] = useState<MealDraftItem[]>([{ customFoodId: "", grams: "100" }]);
  const [savingMeal, setSavingMeal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [foodResult, mealResult] = await Promise.all([
        api<{ foods: CustomFoodRecord[] }>("/custom-foods"),
        api<{ meals: SavedMeal[] }>("/saved-meals"),
      ]);
      setFoods(foodResult.foods);
      setMeals(mealResult.meals);
      setError(null);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startEdit(food: CustomFoodRecord) {
    const serving = displayPerServing(food);
    setEditing(food._id);
    setFoodDraft({
      name: food.name,
      servingLabel: serving.serving.label,
      servingGrams: String(serving.serving.grams),
      kcal: serving.kcal,
      protein: serving.protein,
      carbs: serving.carbs,
      fat: serving.fat,
      fiber: serving.fiber,
    });
    setFoodDialogOpen(true);
  }

  function startCreate() {
    setEditing(null);
    setFoodDraft({ ...emptyFoodDraft, name: initialName });
    setFoodDialogOpen(true);
  }

  function resetFoodForm() {
    setEditing(null);
    setFoodDraft({ ...emptyFoodDraft });
    setFoodDialogOpen(false);
  }

  async function saveFood(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const grams = Number(foodDraft.servingGrams);
    if (!foodDraft.name.trim() || !(grams > 0 && grams <= 5000)) {
      toast.error("Enter a food name and a serving size between 1 and 5000 g.");
      return;
    }
    const body = toFoodBody(foodDraft);
    if (Object.values(body.per100g).some((value) => value < 0 || !Number.isFinite(value)) ||
        body.per100g.kcal > 1000 || body.per100g.protein > 100 || body.per100g.carbs > 100 ||
        body.per100g.fat > 100 || body.per100g.fiber > 100) {
      toast.error("Check the nutrition values and serving size.");
      return;
    }

    setSavingFood(true);
    try {
      await api<CustomFoodRecord>(editing ? `/custom-foods/${editing}` : "/custom-foods", {
        method: editing ? "PATCH" : "POST",
        body,
      });
      toast.success(editing ? "Custom food updated" : "Custom food saved");
      resetFoodForm();
      await load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSavingFood(false);
    }
  }

  async function confirmDelete(target: PendingDelete) {
    try {
      if (target.type === "food") {
        await api(`/custom-foods/${target.item._id}`, { method: "DELETE" });
        setFoods((current) => current.filter((item) => item._id !== target.item._id));
        toast.success("Custom food deleted");
      } else {
        await api(`/saved-meals/${target.item._id}`, { method: "DELETE" });
        setMeals((current) => current.filter((item) => item._id !== target.item._id));
        toast.success("Saved meal deleted");
      }
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  function updateMealItem(index: number, patch: Partial<MealDraftItem>) {
    setMealDraft((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  }

  function startCreateMeal() {
    setEditingMeal(null);
    setMealName("");
    setMealDraft([{ customFoodId: "", grams: "100" }]);
    setMealDialogOpen(true);
  }

  function startEditMeal(meal: SavedMeal) {
    setEditingMeal(meal._id);
    setMealName(meal.name);
    setMealDraft(meal.items.map((item) => ({
      customFoodId: item.food.externalId,
      grams: String(item.grams),
    })));
    setMealDialogOpen(true);
  }

  function resetMealForm() {
    setEditingMeal(null);
    setMealName("");
    setMealDraft([{ customFoodId: "", grams: "100" }]);
    setMealDialogOpen(false);
  }

  async function saveMeal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mealName.trim() || mealName.trim().length > 100 ||
        mealDraft.some((item) => !item.customFoodId || !(Number(item.grams) >= 1 && Number(item.grams) <= 10000))) {
      toast.error("Give the saved meal a name and choose a food and portion for every item.");
      return;
    }
    setSavingMeal(true);
    try {
      const result = await api<SavedMeal>(editingMeal ? `/saved-meals/${editingMeal}` : "/saved-meals", {
        method: editingMeal ? "PATCH" : "POST",
        body: {
          name: mealName.trim(),
          items: mealDraft.map((item) => ({ customFoodId: item.customFoodId, grams: Number(item.grams) })),
        },
      });
      setMeals((current) => [
        ...current.filter((meal) => meal._id !== result._id),
        result,
      ].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success(editingMeal ? "Saved meal updated" : "Saved meal created");
      resetMealForm();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSavingMeal(false);
    }
  }

  const foodField = (
    key: keyof FoodDraft,
    label: string,
    type: "text" | "number" = "number",
    unit?: string,
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`custom-${key}`}>{label}{unit ? ` (${unit})` : ""}</Label>
      <Input
        id={`custom-${key}`}
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
        required={key === "name" || key === "servingGrams" || key === "kcal"}
        value={foodDraft[key]}
        onChange={(event) => setFoodDraft((current) => ({ ...current, [key]: event.target.value }))}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {pendingDelete?.type === "food" ? "custom food" : "saved meal"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.type === "food"
                ? `Delete ${pendingDelete.item.name}? Saved meals keep their saved nutrition values.`
                : pendingDelete?.type === "meal"
                  ? `Delete saved meal ${pendingDelete.item.name}?`
                  : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDelete) void confirmDelete(pendingDelete);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={mealDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetMealForm();
          else setMealDialogOpen(true);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMeal ? "Edit saved meal" : "Save a meal"}</DialogTitle>
            <DialogDescription>Combine your custom foods and portions. Tracker adds each item separately.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => void saveMeal(event)}>
            <div className="space-y-1.5">
              <Label htmlFor="saved-meal-name">Meal name</Label>
              <Input
                id="saved-meal-name"
                maxLength={100}
                value={mealName}
                onChange={(event) => setMealName(event.target.value)}
                placeholder="e.g. Breakfast bowl"
                required
              />
            </div>
            {mealDraft.map((item, index) => (
              <div key={index} className="grid grid-cols-[minmax(0,1fr)_5rem_auto] items-end gap-2">
                <div className="min-w-0 space-y-1.5">
                  <Label htmlFor={`saved-food-${index}`}>Food</Label>
                  <Select value={item.customFoodId} onValueChange={(customFoodId) => updateMealItem(index, { customFoodId })}>
                    <SelectTrigger id={`saved-food-${index}`} className="w-full"><SelectValue placeholder="Choose food" /></SelectTrigger>
                    <SelectContent>
                      {foods.map((food) => <SelectItem key={food._id} value={food._id}>{food.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`saved-grams-${index}`}>Grams</Label>
                  <Input
                    id={`saved-grams-${index}`}
                    type="number"
                    min={1}
                    max={10000}
                    step="any"
                    inputMode="decimal"
                    value={item.grams}
                    onChange={(event) => updateMealItem(index, { grams: event.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Remove meal item"
                  disabled={mealDraft.length === 1}
                  onClick={() => setMealDraft((current) => current.filter((_, i) => i !== index))}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" className="w-full" onClick={() => setMealDraft((current) => [...current, { customFoodId: "", grams: "100" }])}>
              <Plus className="size-4" /> Add another food
            </Button>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={resetMealForm} disabled={savingMeal}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={savingMeal}>
                {savingMeal ? "Saving…" : editingMeal ? "Save changes" : "Save meal"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={foodDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetFoodForm();
          else setFoodDialogOpen(true);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit custom food" : "Add a custom food"}</DialogTitle>
            <DialogDescription>Only you can see and manage foods you create.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => void saveFood(event)}>
            {foodField("name", "Food name", "text")}
            <div className="grid grid-cols-2 gap-3">
              {foodField("servingLabel", "Serving name", "text")}
              {foodField("servingGrams", "Serving size", "number", "g")}
            </div>
            <p className="text-sm font-medium">Nutrition per serving</p>
            <div className="grid grid-cols-2 gap-3">
              {foodField("kcal", "Calories", "number", "kcal")}
              {foodField("protein", "Protein", "number", "g")}
              {foodField("carbs", "Total carbs", "number", "g")}
              {foodField("fat", "Fat", "number", "g")}
              {foodField("fiber", "Fibre", "number", "g")}
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={resetFoodForm} disabled={savingFood}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={savingFood}>
                {savingFood ? "Saving…" : editing ? "Save changes" : "Save custom food"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button type="button" size="sm" variant="secondary" onClick={() => void load()}>Retry</Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>Your custom foods</CardTitle>
              <CardDescription>{foods.length} saved {foods.length === 1 ? "food" : "foods"}</CardDescription>
            </div>
            <Button type="button" size="sm" className="shrink-0" onClick={startCreate}>
              <Plus className="size-4" /> Add food
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading your foods…</p>
          ) : foods.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your saved foods will appear here.</p>
          ) : foods.map((food) => (
            <div key={food._id} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{food.name}</p>
                <p className="text-xs text-muted-foreground">
                  {n0(food.per100g.kcal)} kcal · {n1(food.per100g.protein)} g protein per 100 g
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" size="sm" variant="outline" onClick={() => startEdit(food)}>Edit</Button>
                <Button type="button" size="icon" variant="ghost" aria-label={`Delete ${food.name}`} onClick={() => setPendingDelete({ type: "food", item: food })}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>Your saved meals</CardTitle>
              <CardDescription>Choose one from a Tracker meal’s Add button to log all its foods.</CardDescription>
            </div>
            <Button type="button" size="sm" className="shrink-0" onClick={startCreateMeal} disabled={foods.length === 0}>
              <Plus className="size-4" /> Add meal
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading saved meals…</p>
          ) : meals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved meals yet.</p>
          ) : meals.map((meal) => (
            <div key={meal._id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{meal.name}</p>
                <p className="text-xs text-muted-foreground">{meal.items.length} {meal.items.length === 1 ? "food" : "foods"}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" size="sm" variant="outline" onClick={() => startEditMeal(meal)}>Edit</Button>
                <Button type="button" size="icon" variant="ghost" aria-label={`Delete saved meal ${meal.name}`} onClick={() => setPendingDelete({ type: "meal", item: meal })}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
