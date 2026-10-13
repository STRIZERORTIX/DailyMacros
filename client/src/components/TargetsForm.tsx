import { Minus, Plus } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CarbInfo } from "@/components/CarbInfo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  ACTIVITY,
  bmr,
  isFlooredAtBmr,
  isProfileComplete,
  plannedTargets,
  projection,
  tdee,
  type DayTargets,
} from "@/lib/calc";
import { parseDate } from "@/lib/date";
import { n0, netCarbs, round } from "@/lib/nutrition";
import type { Profile, User } from "@/lib/types";

type GoalMode = "lose" | "maintain" | "gain";

const GOALS: { value: GoalMode; label: string; description: string }[] = [
  { value: "lose", label: "Lose weight", description: "A steady calorie deficit" },
  { value: "maintain", label: "Maintain", description: "Eat around maintenance" },
  { value: "gain", label: "Lean bulk", description: "A modest calorie surplus" },
];

const RECOMMENDED_ADJUSTMENT: Record<GoalMode, number> = { lose: 500, maintain: 0, gain: 250 };
const num = (s: string): number | undefined => {
  const n = Number(s);
  return s.trim() !== "" && Number.isFinite(n) && n > 0 ? n : undefined;
};
const calorieInput = (s: string): number | undefined => {
  const n = Number(s);
  return s.trim() !== "" && Number.isInteger(n) && n >= 500 && n <= 10000 ? n : undefined;
};
const roundedMaintenance = (profile: Profile) => Math.round(tdee(profile) / 10) * 10;

function Stepper({
  label,
  hint,
  value,
  display,
  step,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  display: string;
  step: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, round(v, 2))));
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled || value <= min}
          onClick={() => set(value - step)}
          aria-label={`Less ${label}`}
        >
          <Minus />
        </Button>
        <div className="flex-1 rounded-md border bg-background py-2 text-center text-lg font-semibold tabular-nums">
          {display}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled || value >= max}
          onClick={() => set(value + step)}
          aria-label={`More ${label}`}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  className,
}: {
  label: ReactNode;
  value: string;
  unit?: string;
  className?: string;
}) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${className ?? ""}`}>
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
}

function MacroTargets({ targets }: { targets: DayTargets }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Daily nutrition targets</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Protein" value={n0(targets.protein)} unit="g" className="text-chart-1" />
        <Stat
          label={<>Total carbs <CarbInfo /></>}
          value={n0(targets.carbs)}
          unit="g"
          className="text-chart-2"
        />
        <Stat
          label={<>Net carbs <CarbInfo /></>}
          value={n0(netCarbs(targets.carbs, targets.fiber))}
          unit="g"
          className="text-chart-4"
        />
        <Stat label="Fat" value={n0(targets.fat)} unit="g" className="text-chart-3" />
        <Stat label="Fibre goal" value={n0(targets.fiber)} unit="g" className="text-chart-5" />
      </div>
      <p className="text-xs text-muted-foreground">
        Fat is estimated at 25% of calories; remaining calories are assigned to total carbs. Fibre goal uses 14 g per
        1,000 kcal; net carbs are total carbs minus that fibre goal.
      </p>
    </div>
  );
}

export function TargetsForm({
  latestWeight,
  onSetupComplete,
}: {
  latestWeight: number | null;
  onSetupComplete?: () => void;
}) {
  const { user, setUser } = useAuth();
  const p: Profile = user?.profile ?? {};
  const [isOnboarding] = useState(() => !isProfileComplete(p));
  const [step, setStep] = useState(1);
  const [opinion, setOpinion] = useState<"good" | "adjust" | null>(null);
  const [sex, setSex] = useState<"male" | "female" | "">(p.sex ?? "");
  const [age, setAge] = useState(p.age ? String(p.age) : "");
  const [height, setHeight] = useState(p.heightCm ? String(p.heightCm) : "");
  const [weight, setWeight] = useState(p.weightKg ? String(p.weightKg) : "");
  const [goal, setGoal] = useState(p.goalWeightKg ? String(p.goalWeightKg) : "");
  const [goalMode, setGoalMode] = useState<GoalMode>(p.goalMode ?? "lose");
  const [activity, setActivity] = useState(() => {
    if (p.activityFactor === 1.465) return 1.55;
    return p.activityFactor ?? 1.2;
  });
  const [maintenanceInput, setMaintenanceInput] = useState(p.maintenanceKcal ? String(p.maintenanceKcal) : "");
  const [cutTargetInput, setCutTargetInput] = useState(p.cutTargetKcal ? String(p.cutTargetKcal) : "");
  const [adjustment, setAdjustment] = useState(
    Math.abs(p.calorieAdjustment ?? (p.goalMode === "maintain" ? 0 : p.goalMode === "gain" ? 250 : -(p.deficitKcal ?? 500))),
  );
  const [proteinPerKg, setProteinPerKg] = useState(p.proteinPerKg ?? 1.6);
  const [sunday, setSunday] = useState(p.sundayMaintenance ?? true);
  const [busy, setBusy] = useState(false);

  function changeGoalMode(next: GoalMode) {
    setGoalMode(next);
    setAdjustment(RECOMMENDED_ADJUSTMENT[next]);
    setCutTargetInput("");
    setOpinion(null);
    const currentWeight = num(weight);
    if (!currentWeight) return;
    if (next === "maintain") setGoal(String(currentWeight));
    else if (next === "lose" && (!num(goal) || num(goal)! >= currentWeight)) setGoal(String(Math.max(30, currentWeight - 5)));
    else if (next === "gain" && (!num(goal) || num(goal)! <= currentWeight)) setGoal(String(Math.min(300, currentWeight + 3)));
  }

  const draft: Profile = useMemo(() => {
    const base: Profile = {
      sex: sex || undefined,
      goalMode,
      age: num(age),
      heightCm: num(height),
      weightKg: num(weight),
      goalWeightKg: num(goal) ?? num(weight),
      activityFactor: activity,
      maintenanceKcal: calorieInput(maintenanceInput),
      cutTargetKcal: goalMode === "lose" ? calorieInput(cutTargetInput) : undefined,
      proteinPerKg,
      sundayMaintenance: sunday,
    };
    const customCutTarget = calorieInput(cutTargetInput);
    const customDeficit =
      goalMode === "lose" && customCutTarget !== undefined
        ? roundedMaintenance(base) - customCutTarget
        : adjustment;
    return {
      ...base,
      deficitKcal: goalMode === "lose" ? Math.max(0, customDeficit) : 0,
      calorieAdjustment: goalMode === "lose" ? -customDeficit : goalMode === "gain" ? adjustment : 0,
    };
  }, [
    sex,
    goalMode,
    age,
    height,
    weight,
    goal,
    activity,
    maintenanceInput,
    cutTargetInput,
    adjustment,
    proteinPerKg,
    sunday,
  ]);

  const baseProblems: string[] = [];
  if (draft.age !== undefined && (draft.age < 10 || draft.age > 100 || !Number.isInteger(draft.age))) {
    baseProblems.push("Age must be a whole number between 10 and 100.");
  }
  if (draft.heightCm !== undefined && (draft.heightCm < 100 || draft.heightCm > 250)) {
    baseProblems.push("Height must be 100 to 250 cm.");
  }
  if (draft.weightKg !== undefined && (draft.weightKg < 30 || draft.weightKg > 300)) {
    baseProblems.push("Weight must be 30 to 300 kg.");
  }
  const basicsReady =
    !!draft.sex &&
    draft.age !== undefined &&
    draft.heightCm !== undefined &&
    draft.weightKg !== undefined &&
    baseProblems.length === 0;

  const goalProblems = [...baseProblems];
  if (draft.goalWeightKg !== undefined && (draft.goalWeightKg < 30 || draft.goalWeightKg > 300)) {
    goalProblems.push("Target weight must be 30 to 300 kg.");
  }
  if (basicsReady && draft.goalWeightKg !== undefined && draft.weightKg !== undefined) {
    if (goalMode === "lose" && draft.goalWeightKg >= draft.weightKg) {
      goalProblems.push("For a weight-loss goal, target weight must be below your current weight.");
    }
    if (goalMode === "gain" && draft.goalWeightKg <= draft.weightKg) {
      goalProblems.push("For a lean-bulk goal, target weight must be above your current weight.");
    }
  }
  for (const [label, value] of [
    ["Estimated maintenance", maintenanceInput],
    ["Cut target", cutTargetInput],
  ] as const) {
    if (value.trim() !== "" && calorieInput(value) === undefined) {
      goalProblems.push(`${label} must be a whole number between 500 and 10,000 kcal.`);
    }
  }
  const customCutTarget = calorieInput(cutTargetInput);
  if (goalMode === "lose" && customCutTarget !== undefined) {
    const customDeficit = roundedMaintenance(draft) - customCutTarget;
    if (customDeficit <= 0) goalProblems.push("Cut target must be lower than estimated maintenance.");
    if (customDeficit > 1000) goalProblems.push("Cut target cannot be more than 1,000 kcal below estimated maintenance.");
  }
  const hasGoalWeight = draft.goalWeightKg !== undefined;
  const ready = basicsReady && hasGoalWeight && goalProblems.length === 0;
  const targets = basicsReady && hasGoalWeight ? plannedTargets(draft) : null;
  const proj = ready ? projection(draft) : null;
  const warnings: string[] = [];
  if (targets && isFlooredAtBmr(draft)) {
    warnings.push(
      `This deficit would put your target below your estimated resting energy (${n0(bmr(draft))} kcal), so the target is raised to that level.`,
    );
  }
  if (proj && draft.weightKg && proj.direction === "lose" && proj.kgPerWeek > 0.01 * draft.weightKg) {
    warnings.push("This is a fast rate of weight loss. Consider choosing a smaller deficit for a more gradual cut.");
  }
  if (proj && draft.weightKg && proj.direction === "gain" && proj.kgPerWeek > 0.005 * draft.weightKg) {
    warnings.push("This may be faster than a gradual lean bulk. Consider choosing a smaller surplus.");
  }

  async function save() {
    if (!ready) return;
    setBusy(true);
    try {
      const profile: Profile = {
        sex: sex || undefined,
        goalMode,
        age: draft.age,
        heightCm: draft.heightCm,
        weightKg: draft.weightKg,
        goalWeightKg: draft.goalWeightKg,
        activityFactor: activity,
        maintenanceKcal: calorieInput(maintenanceInput) ?? null,
        cutTargetKcal: goalMode === "lose" ? calorieInput(cutTargetInput) ?? null : null,
        deficitKcal: draft.deficitKcal,
        calorieAdjustment: draft.calorieAdjustment,
        proteinPerKg,
        sundayMaintenance: sunday,
      };
      const result = await api<{ user: User }>("/auth/me", { method: "PATCH", body: { profile } });
      setUser(result.user);
      toast.success("Your nutrition targets are saved");
      if (isOnboarding) onSetupComplete?.();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setBusy(false);
    }
  }

  const goalDate = proj
    ? parseDate(proj.goalDate).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : null;
  const canContinueBasics = basicsReady;
  const adjustmentLabel = goalMode === "lose" ? "Daily calorie deficit" : "Daily calorie surplus";
  const adjustmentHint =
    goalMode === "lose" ? "below maintenance" : goalMode === "gain" ? "above maintenance" : "no adjustment";
  const displayedAdjustment =
    goalMode === "lose" && customCutTarget !== undefined
      ? roundedMaintenance(draft) - customCutTarget
      : adjustment;

  function changeCutTarget(value: string) {
    setCutTargetInput(value);
    setOpinion(null);
    const target = calorieInput(value);
    if (goalMode === "lose" && target !== undefined) {
      setAdjustment(Math.max(0, roundedMaintenance(draft) - target));
    }
  }

  function changeAdjustment(value: number) {
    setAdjustment(value);
    if (goalMode === "lose") {
      const target = roundedMaintenance(draft) - value;
      setCutTargetInput(target >= 500 && target <= 10000 ? String(target) : "");
    }
    setOpinion(null);
  }

  return (
    <div className="space-y-4">
      {isOnboarding && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Personalise your targets</span>
            <span>Step {step} of 3</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(step / 3) * 100}%` }} />
          </div>
        </div>
      )}

      {isOnboarding && step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{isOnboarding ? "Start with your details" : "Your details"}</CardTitle>
            {isOnboarding && (
              <p className="text-sm text-muted-foreground">
                We use these to estimate your daily energy needs. You can change them later.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <ToggleGroup
                type="single"
                variant="outline"
                value={sex}
                onValueChange={(value) => value && setSex(value as "male" | "female")}
                className="grid w-full grid-cols-2"
              >
                <ToggleGroupItem value="male" className="w-full">Male</ToggleGroupItem>
                <ToggleGroupItem value="female" className="w-full">Female</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input id="age" inputMode="numeric" value={age} onChange={(event) => setAge(event.target.value)} placeholder="years" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input id="height" inputMode="decimal" value={height} onChange={(event) => setHeight(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Current weight (kg)</Label>
                <Input id="weight" inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} />
              </div>
              {!isOnboarding && (
                <div className="space-y-2">
                  <Label htmlFor="goal">Target weight (kg)</Label>
                  <Input id="goal" inputMode="decimal" value={goal} onChange={(event) => setGoal(event.target.value)} />
                </div>
              )}
            </div>

            {latestWeight !== null && latestWeight !== Number(weight) && (
              <Button type="button" variant="secondary" size="sm" onClick={() => setWeight(String(latestWeight))}>
                Use my latest weigh-in ({latestWeight} kg)
              </Button>
            )}

            <div className="space-y-2">
              <Label htmlFor="activity">Activity level</Label>
              <Select value={String(activity)} onValueChange={(value) => setActivity(Number(value))}>
                <SelectTrigger id="activity" className="w-full">
                  <SelectValue placeholder="Choose an activity level">
                    {ACTIVITY.find((item) => item.value === activity)?.title}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY.map((item) => (
                    <SelectItem key={item.value} value={String(item.value)} textValue={item.title}>
                      <span className="flex flex-col gap-1 py-1">
                        <span className="font-medium">{item.title}</span>
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose based on your usual week, combining work and exercise. Don’t count ordinary chores separately. If unsure, choose one level lower; activity multipliers are estimates, and you can adjust after tracking your weight trend for a few weeks.
              </p>
            </div>
            {baseProblems.map((message) => (
              <Alert key={message} variant="destructive"><AlertDescription>{message}</AlertDescription></Alert>
            ))}
            {!basicsReady && baseProblems.length === 0 && (
              <p className="text-xs text-muted-foreground">Choose the calorie-estimate option and enter your age, height, and current weight to continue.</p>
            )}
            {isOnboarding && (
              <Button
                className="w-full"
                disabled={!canContinueBasics}
                onClick={() => {
                  const currentWeight = num(weight);
                  if (currentWeight && !num(goal)) {
                    const initialGoal =
                      goalMode === "maintain"
                        ? currentWeight
                        : goalMode === "gain"
                          ? Math.min(300, currentWeight + 3)
                          : Math.max(30, currentWeight - 5);
                    setGoal(String(initialGoal));
                  }
                  setStep(2);
                }}
              >
                Choose my goal
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {(!isOnboarding || step === 2) && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{isOnboarding ? "What would you like to work toward?" : "Your goal and adjustments"}</CardTitle>
              {isOnboarding && (
                <p className="text-sm text-muted-foreground">We’ll suggest a starting plan. You stay in control of every number.</p>
              )}
            </CardHeader>
            <CardContent className="space-y-5">
              <ToggleGroup
                type="single"
                variant="outline"
                value={goalMode}
                onValueChange={(value) => value && changeGoalMode(value as GoalMode)}
                spacing={2}
                className="flex w-full flex-col gap-2 sm:flex-row"
              >
                {GOALS.map((item) => (
                  <ToggleGroupItem key={item.value} value={item.value} className="h-auto min-h-14 w-full min-w-0 flex-1 shrink flex-col items-start gap-1 whitespace-normal py-2 text-left">
                    <span className="w-full whitespace-normal font-semibold">{item.label}</span>
                    <span className="w-full whitespace-normal text-xs font-normal text-muted-foreground">{item.description}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              <div className="space-y-2">
                <Label htmlFor="goal">Target weight (kg)</Label>
                <Input id="goal" inputMode="decimal" value={goal} onChange={(event) => setGoal(event.target.value)} placeholder={weight || "kg"} />
                <p className="text-xs text-muted-foreground">
                  {goalMode === "maintain"
                    ? "Your current weight is prefilled as the weight you want to maintain."
                    : goalMode === "lose"
                      ? "Choose a realistic weight below your current weight."
                      : "Choose a gradual target above your current weight for a lean bulk."}{" "}
                  {goalMode === "lose"
                    ? "Your target weight sets the progress estimate; daily calories are controlled by the deficit below."
                    : goalMode === "gain"
                      ? "Your target weight sets the progress estimate; daily calories are controlled by the surplus below."
                      : "Your target weight sets the progress estimate; daily calories are based on maintenance."}
                </p>
              </div>

              {goalMode !== "maintain" && (
                <Stepper
                  label={adjustmentLabel}
                  hint={adjustmentHint}
                  value={displayedAdjustment}
                  display={`${displayedAdjustment} kcal`}
                  step={50}
                  min={0}
                  max={goalMode === "lose" ? 1000 : 500}
                  onChange={changeAdjustment}
                />
              )}
              <Stepper
                label="Protein"
                hint="grams per kg of body weight"
                value={proteinPerKg}
                display={`${proteinPerKg.toFixed(1)} g/kg`}
                step={0.1}
                min={0.8}
                max={3}
                onChange={setProteinPerKg}
              />

              {goalMode === "lose" && (
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="sunday">One maintenance day each week</Label>
                    <p className="text-xs text-muted-foreground">Sunday is set to estimated maintenance.</p>
                  </div>
                  <Switch id="sunday" checked={sunday} onCheckedChange={setSunday} />
                </div>
              )}

              {goalProblems.map((message) => (
                <Alert key={message} variant="destructive"><AlertDescription>{message}</AlertDescription></Alert>
              ))}
              {!ready && goalProblems.length === 0 && (
                <p className="text-sm text-muted-foreground">Add a valid target weight to preview your plan.</p>
              )}
              {isOnboarding && (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                  <Button type="button" className="flex-1" disabled={!ready} onClick={() => { setOpinion(null); setStep(3); }}>
                    See my plan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {!isOnboarding && targets && (
            <PlanPreview
              draft={draft}
              weekday={targets.weekday}
              sundayTarget={targets.sunday}
              projectionText={projectionText(proj, goalDate)}
              warnings={warnings}
              maintenanceInput={maintenanceInput}
              cutTargetInput={cutTargetInput}
              onMaintenanceChange={(value) => {
                setMaintenanceInput(value);
                setOpinion(null);
              }}
              onCutTargetChange={changeCutTarget}
            />
          )}
        </>
      )}

      {isOnboarding && step === 3 && ready && targets && (
        <PlanPreview
          draft={draft}
          weekday={targets.weekday}
          sundayTarget={targets.sunday}
          projectionText={projectionText(proj, goalDate)}
          warnings={warnings}
          maintenanceInput={maintenanceInput}
          cutTargetInput={cutTargetInput}
          onMaintenanceChange={(value) => {
            setMaintenanceInput(value);
            setOpinion(null);
          }}
          onCutTargetChange={changeCutTarget}
        >
          <Card>
            <CardContent className="space-y-3 py-5">
              <div>
                <h3 className="font-semibold">Does this plan feel manageable?</h3>
                <p className="mt-1 text-sm text-muted-foreground">It’s a starting estimate, not a rule. You can edit it any time.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={opinion === "good" ? "default" : "outline"}
                  onClick={() => setOpinion("good")}
                >
                  Looks good
                </Button>
                <Button
                  type="button"
                  variant={opinion === "adjust" ? "secondary" : "outline"}
                  onClick={() => { setOpinion("adjust"); setStep(2); }}
                >
                  I’d like to adjust
                </Button>
              </div>
            </CardContent>
          </Card>
          <Button className="w-full" disabled={opinion !== "good" || busy} onClick={() => void save()}>
            {busy ? "Saving…" : "Save targets and start tracking"}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setStep(2)}>Back to edit targets</Button>
        </PlanPreview>
      )}

      {!isOnboarding && ready && (
        <Button className="w-full" disabled={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save my targets"}
        </Button>
      )}
    </div>
  );
}

function projectionText(proj: ReturnType<typeof projection>, goalDate: string | null) {
  if (!proj) return null;
  const direction = proj.direction === "lose" ? "toward your goal" : "toward your lean-bulk target";
  return `Estimated ${round(proj.kgPerWeek, 2)} kg/week ${direction}; about ${Math.round(proj.weeks)} weeks${goalDate ? ` (around ${goalDate})` : ""}. This is a rough estimate; your real weight trend matters more.`;
}

function PlanPreview({
  draft,
  weekday,
  sundayTarget,
  projectionText: forecast,
  warnings,
  maintenanceInput,
  cutTargetInput,
  onMaintenanceChange,
  onCutTargetChange,
  children,
}: {
  draft: Profile;
  weekday: DayTargets;
  sundayTarget: DayTargets;
  projectionText: string | null;
  warnings: string[];
  maintenanceInput: string;
  cutTargetInput: string;
  onMaintenanceChange: (value: string) => void;
  onCutTargetChange: (value: string) => void;
  children?: ReactNode;
}) {
  const maintenance = Math.round(tdee(draft) / 10) * 10;
  const targetLabel = draft.goalMode === "lose" ? "Cut target" : draft.goalMode === "gain" ? "Lean-bulk target" : "Maintenance target";
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Your recommended plan</CardTitle>
          <p className="text-sm text-muted-foreground">
            {draft.goalMode === "lose" ? "A steady cut" : draft.goalMode === "gain" ? "A gradual lean bulk" : "Weight maintenance"} based on your details and activity.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0 rounded-lg bg-muted p-3">
              <Label htmlFor="estimated-maintenance" className="text-xs font-normal text-muted-foreground">
                Estimated maintenance
              </Label>
              <div className="mt-1 flex min-w-0 items-center gap-1">
                <Input
                  id="estimated-maintenance"
                  type="number"
                  inputMode="numeric"
                  min={500}
                  max={10000}
                  step={10}
                  value={maintenanceInput}
                  placeholder={n0(maintenance)}
                  onChange={(event) => onMaintenanceChange(event.target.value)}
                  className="h-8 min-w-0 px-2 text-lg font-bold tabular-nums"
                />
                <span className="shrink-0 text-[10px] text-muted-foreground">kcal/day</span>
              </div>
            </div>
            {draft.goalMode === "lose" ? (
              <div className="min-w-0 rounded-lg bg-muted p-3">
                <Label htmlFor="cut-target" className="text-xs font-normal text-muted-foreground">
                  {targetLabel}
                </Label>
                <div className="mt-1 flex min-w-0 items-center gap-1">
                  <Input
                    id="cut-target"
                    type="number"
                    inputMode="numeric"
                    min={500}
                    max={10000}
                    step={10}
                    value={cutTargetInput}
                    placeholder={n0(weekday.kcal)}
                    onChange={(event) => onCutTargetChange(event.target.value)}
                    className="h-8 min-w-0 px-2 text-lg font-bold tabular-nums text-primary"
                  />
                  <span className="shrink-0 text-[10px] text-muted-foreground">kcal/day</span>
                </div>
              </div>
            ) : (
              <Stat label={targetLabel} value={n0(weekday.kcal)} unit="kcal/day" className="text-primary" />
            )}
          </div>
          {weekday.kcal !== sundayTarget.kcal && (
            <p className="text-xs text-muted-foreground">
              Sunday maintenance target: {n0(sundayTarget.kcal)} kcal.
            </p>
          )}
          <MacroTargets targets={weekday} />
          {forecast && <Alert><AlertDescription>{forecast}</AlertDescription></Alert>}
          {warnings.map((message) => (
            <Alert key={message}><AlertDescription>{message}</AlertDescription></Alert>
          ))}
          <p className="text-xs text-muted-foreground">
            These calorie and macro estimates are for general planning, not medical advice. Adjust based on how you feel and your progress.
          </p>
        </CardContent>
      </Card>
      {children}
    </>
  );
}
