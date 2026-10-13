import { BarChart3, CircleHelp, Search, Target, UtensilsCrossed, Weight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const HOWTO_KEY = "kcal-howto-v1";

const STEPS = [
  {
    icon: UtensilsCrossed,
    title: "Your diary is Today",
    body: "Log breakfast, lunch, snacks and dinner. The ring shows calories left against your target, and the bars show protein, carbs and fat.",
  },
  {
    icon: Search,
    title: "Find a food, then set the portion",
    body: "Search with names you actually use — idli, kadala, moru, nendran. If it is missing, search online or create your own food from a pack label.",
  },
  {
    icon: Target,
    title: "Set targets once",
    body: "Open Profile → Goals to enter your details and customize your plan. Your saved calorie and nutrition targets appear under Profile → Targets and in Tracker.",
  },
  {
    icon: Weight,
    title: "Weigh in most mornings",
    body: "Profile → Weight Tracker. Same time each day, after the toilet and before eating. See your weigh-in history in Insights, and trust the 7-day average, not a single morning.",
  },
  {
    icon: BarChart3,
    title: "Check the week on Insights",
    body: "Open Insights for the day, week, or month. Calories vs target, meal split, streak, and weight trend all come from the diary you are filling in.",
  },
  {
    icon: CircleHelp,
    title: "You are set",
    body: "Tap the book icon in the header to see this again. If a food is missing, create it once and it will show up in search afterwards.",
  },
];

export function HowToUseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  function close() {
    localStorage.setItem(HOWTO_KEY, "1");
    onOpenChange(false);
    setStep(0);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="max-w-sm" showCloseButton={false}>
        <DialogHeader className="items-center text-center sm:items-center sm:text-center">
          <div className="mb-1 grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Icon className="size-6" />
          </div>
          <DialogTitle>{current.title}</DialogTitle>
          <DialogDescription className="text-pretty">{current.body}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={i === step ? "h-1.5 w-5 rounded-full bg-primary" : "size-1.5 rounded-full bg-muted-foreground/40"}
            />
          ))}
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button type="button" variant="ghost" className="mr-auto" onClick={close}>
            Skip
          </Button>
          {step > 0 && (
            <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          <Button type="button" onClick={() => (last ? close() : setStep((s) => s + 1))}>
            {last ? "Got it" : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
