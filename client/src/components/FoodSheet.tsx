import { Camera, ChevronLeft, Minus, Plus, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CarbInfo } from "@/components/CarbInfo";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api, errMsg } from "@/lib/api";
import { n0, n1, netCarbs, portionText, round, totalsFor } from "@/lib/nutrition";
import {
  MEAL_LABEL,
  MEALS,
  SOURCE_LABEL,
  type FoodResult,
  type LogEntry,
  type Meal,
  type SavedMeal,
  type Serving,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Selected = { food: FoodResult; servings: Serving[]; unitKey: string; qty: number };
type PortionValue = { meal: Meal; grams: number; servingLabel?: string; servings?: number };
type SearchResp = { results: FoodResult[] };
type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
};
type BarcodeDetectorConstructor = {
  new (options: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats: () => Promise<string[]>;
};

/* ---------- helpers ---------- */

/** Starting portion for a food: what you last ate (if known), else its first serving, else 100 g. */
function initialFor(food: FoodResult): Selected {
  let servings = food.servings;
  if (food.lastGrams && food.lastServingLabel && food.lastServings && food.lastServings > 0) {
    const label = food.lastServingLabel;
    const idx = servings.findIndex((s) => s.label === label);
    if (idx >= 0) return { food, servings, unitKey: `s${idx}`, qty: food.lastServings };
    servings = [{ label, grams: round(food.lastGrams / food.lastServings, 2) }, ...servings];
    return { food, servings, unitKey: "s0", qty: food.lastServings };
  }
  if (food.lastGrams) return { food, servings, unitKey: "g", qty: round(food.lastGrams, 1) };
  if (servings.length > 0) return { food, servings, unitKey: "s0", qty: 1 };
  return { food, servings, unitKey: "g", qty: 100 };
}

/** Open an existing diary entry for editing. */
function fromEntry(e: LogEntry): Selected {
  const food: FoodResult = {
    id: `${e.food.source}:${e.food.externalId ?? e.food.name}`,
    source: e.food.source,
    externalId: e.food.externalId ?? e.food.name,
    name: e.food.name,
    brand: e.food.brand,
    per100g: e.food.per100g,
    servings: [],
  };
  if (e.servingLabel && e.servings && e.servings > 0) {
    return {
      food,
      servings: [{ label: e.servingLabel, grams: round(e.grams / e.servings, 2) }],
      unitKey: "s0",
      qty: e.servings,
    };
  }
  return { food, servings: [], unitKey: "g", qty: round(e.grams, 1) };
}

/* ---------- search step ---------- */

function FoodRow({ food, hint, onClick }: { food: FoodResult; hint?: string; onClick: () => void }) {
  const badge = SOURCE_LABEL[food.source];
  return (
    <CommandItem
      value={food.id}
      onSelect={() => onClick()}
      className="h-auto items-start justify-between gap-3 py-3"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{food.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {food.brand ? `${food.brand} · ` : ""}
          {hint ?? `${n0(food.per100g.kcal)} kcal · ${n1(food.per100g.protein)} g protein per 100 g`}
        </p>
      </div>
      {badge && (
        <Badge variant="secondary" className="shrink-0">
          {badge}
        </Badge>
      )}
    </CommandItem>
  );
}

function BarcodeScanner({ onBarcode }: { onBarcode: (code: string) => Promise<void> }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [barcode, setBarcode] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const lookupRef = useRef(false);
  const detectedRef = useRef<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stream: MediaStream | undefined;

    async function start() {
      const Detector = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
      if (!Detector) {
        setCameraError("Barcode scanning is not supported in this browser. Enter the barcode below.");
        return;
      }
      let supported: string[];
      try {
        supported = await Detector.getSupportedFormats();
      } catch {
        setCameraError("Could not check barcode support. Enter the barcode below.");
        return;
      }
      const formats = ["ean_13", "ean_8", "upc_a", "upc_e"].filter((format) => supported.includes(format));
      if (formats.length === 0) {
        setCameraError("This browser cannot read product barcodes. Enter the barcode below.");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera access is not available. Enter the barcode below.");
        return;
      }

      try {
        const detector = new Detector({ formats });
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        async function scan() {
          if (stopped || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            if (!stopped) timer = setTimeout(scan, 250);
            return;
          }
          try {
            const [result] = await detector.detect(video);
            if (result?.rawValue && result.rawValue !== detectedRef.current) {
              detectedRef.current = result.rawValue;
              setBarcode(result.rawValue);
              if (!lookupRef.current) {
                lookupRef.current = true;
                setLookingUp(true);
                await onBarcode(result.rawValue);
                lookupRef.current = false;
                setLookingUp(false);
              }
            }
          } catch {
            setCameraError("Could not read a barcode. Adjust the lighting or enter it below.");
          }
          if (!stopped) timer = setTimeout(scan, 250);
        }
        void scan();
      } catch (e) {
        if (!stopped) {
          setCameraError(e instanceof Error ? e.message : "Could not start the camera. Enter the barcode below.");
        }
      }
    }

    void start();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [onBarcode]);

  async function lookup() {
    const code = barcode.trim();
    if (!/^\d{8,14}$/.test(code)) {
      toast.error("Enter a barcode with 8 to 14 digits.");
      return;
    }
    setLookingUp(true);
    try {
      await onBarcode(code);
    } finally {
      setLookingUp(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3">
      <div className="relative overflow-hidden rounded-md bg-muted">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          aria-label="Camera barcode preview"
          className="aspect-video w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-16 -translate-y-1/2 rounded-md border-2 border-primary shadow-[0_0_0_999px_rgb(0_0_0/35%)]" />
      </div>
      <p className="text-xs text-muted-foreground">
        {cameraError ?? "Hold the product barcode inside the frame."}
      </p>
      <div className="flex gap-2">
        <InputGroup>
          <InputGroupInput
            aria-label="Barcode number"
            inputMode="numeric"
            maxLength={14}
            placeholder="Enter barcode number"
            value={barcode}
            onChange={(event) => setBarcode(event.target.value.replace(/\D/g, ""))}
            onKeyDown={(event) => {
              if (event.key === "Enter") void lookup();
            }}
          />
        </InputGroup>
        <Button type="button" onClick={() => void lookup()} disabled={lookingUp || !barcode.trim()}>
          {lookingUp ? "Looking…" : "Look up"}
        </Button>
      </div>
    </div>
  );
}

function SearchStep({
  meal,
  busy,
  onPick,
  onManageCustomFoods,
  onAddSavedMeal,
  onClose,
}: {
  meal: Meal;
  busy: boolean;
  onPick: (f: FoodResult) => void;
  onManageCustomFoods: (name: string) => void;
  onAddSavedMeal: (meal: SavedMeal) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [local, setLocal] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [online, setOnline] = useState<FoodResult[] | null>(null);
  const [onlineBusy, setOnlineBusy] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [recent, setRecent] = useState<FoodResult[]>([]);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [savedMealsError, setSavedMealsError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const term = q.trim();
  const termRef = useRef(term);

  useEffect(() => {
    api<{ foods: FoodResult[] }>("/foods/recent")
      .then((r) => setRecent(r.foods))
      .catch(() => {});
    api<{ meals: SavedMeal[] }>("/saved-meals")
      .then((r) => {
        setSavedMeals(r.meals);
        setSavedMealsError(null);
      })
      .catch((e) => setSavedMealsError(errMsg(e)));
  }, []);

  // Fast as-you-type search over your own foods and the curated Indian list (no online calls here).
  useEffect(() => {
    termRef.current = term;
    setLocal([]);
    setOnline(null);
    setOnlineBusy(false);
    setOnlineError(null);
    if (term.length < 2) {
      setSearching(false);
      return;
    }
    const ctl = new AbortController();
    setSearching(true);
    const timer = setTimeout(() => {
      api<SearchResp>(`/foods/search?q=${encodeURIComponent(term)}&sources=custom,local&limit=50`, { signal: ctl.signal })
        .then((r) => {
          if (ctl.signal.aborted) return;
          setLocal(r.results);
          void searchOnline(term, ctl.signal);
        })
        .catch(() => {
          if (!ctl.signal.aborted) void searchOnline(term, ctl.signal);
        })
        .finally(() => {
          if (!ctl.signal.aborted) setSearching(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
  }, [term]);

  async function searchOnline(forTerm: string, signal?: AbortSignal) {
    setOnlineBusy(true);
    setOnlineError(null);
    try {
      const r = await api<SearchResp>(`/foods/search?q=${encodeURIComponent(forTerm)}&sources=usda,off`, { signal });
      if (termRef.current !== forTerm) return;
      setOnline(r.results);
    } catch {
      if (!signal?.aborted && termRef.current === forTerm) setOnlineError("Online search is temporarily unavailable.");
    } finally {
      if (termRef.current === forTerm) setOnlineBusy(false);
    }
  }

  const lookupBarcode = useCallback(async (code: string) => {
    try {
      const response = await api<{ food: FoodResult }>(`/foods/barcode/${encodeURIComponent(code)}`);
      onPick(response.food);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }, [onPick]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between px-4 pb-2">
        <div>
          <h2 className="text-lg font-semibold">Add food</h2>
          <p className="text-xs text-muted-foreground">to {MEAL_LABEL[meal]}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Done">
          <X />
        </Button>
      </div>

      <Command shouldFilter={false} className="flex h-auto min-h-0 flex-1 flex-col overflow-hidden rounded-none bg-transparent">
        <div className="shrink-0 px-2 pb-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setScannerOpen((open) => !open)}
            aria-expanded={scannerOpen}
          >
            <Camera className="size-4" />
            {scannerOpen ? "Close barcode scanner" : "Scan a barcode"}
          </Button>
          {scannerOpen && <div className="pt-2"><BarcodeScanner onBarcode={lookupBarcode} /></div>}
        </div>
        <CommandInput
          value={q}
          onValueChange={setQ}
          placeholder="Search: idli, kadala, nendran, moru…"
        />
        <CommandList className="min-h-0 max-h-none flex-1 overscroll-y-contain overflow-y-auto px-1 pb-8" data-vaul-no-drag>
          {busy && <p className="px-2 py-2 text-xs text-muted-foreground">Loading…</p>}

          {term.length < 2 ? (
            <>
              {savedMealsError && (
                <Alert variant="destructive" className="mx-2 mb-2">
                  <AlertDescription>{savedMealsError}</AlertDescription>
                </Alert>
              )}
              {savedMeals.length > 0 && (
                <CommandGroup heading="Saved meals">
                  {savedMeals.map((savedMeal) => (
                    <CommandItem
                      key={savedMeal._id}
                      value={`saved-meal:${savedMeal._id}`}
                      disabled={busy}
                      onSelect={() => onAddSavedMeal(savedMeal)}
                      className="h-auto items-start justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{savedMeal.name}</p>
                        <p className="text-xs text-muted-foreground">{savedMeal.items.length} foods</p>
                      </div>
                      <span className="shrink-0 text-xs text-primary">Add to {MEAL_LABEL[meal]}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {recent.length > 0 ? (
                <CommandGroup heading="Recent">
                  {recent.map((f) => (
                    <FoodRow
                      key={f.id}
                      food={f}
                      hint={
                        f.lastGrams
                          ? portionText({
                              grams: f.lastGrams,
                              servingLabel: f.lastServingLabel,
                              servings: f.lastServings,
                            })
                          : undefined
                      }
                      onClick={() => onPick(f)}
                    />
                  ))}
                </CommandGroup>
              ) : (
                <Empty className="border-0 py-8">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Search />
                    </EmptyMedia>
                    <EmptyTitle>Find a food</EmptyTitle>
                    <EmptyDescription>
                      Start typing. Local names work: kadala, sundal, moru, nendran.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
              <CommandSeparator className="my-2" />
              <div className="px-2 pt-2">
                <Button variant="outline" className="w-full" onClick={() => onManageCustomFoods("")}>
                  <Plus className="size-4" /> Manage custom foods
                </Button>
              </div>
            </>
          ) : (
            <>
              {searching && local.length === 0 && (
                <p className="px-2 py-3 text-sm text-muted-foreground">Searching…</p>
              )}
              {!searching && local.length === 0 && !onlineBusy && online === null && (
                <Empty className="border-0 py-6">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Search />
                    </EmptyMedia>
                    <EmptyTitle>No food found</EmptyTitle>
                    <EmptyDescription>
                      Try another search, or add this as your own food.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
              {local.some((f) => f.source === "custom") && (
                <CommandGroup heading="Your foods">
                  {local.filter((f) => f.source === "custom").map((f) => (
                    <FoodRow key={f.id} food={f} onClick={() => onPick(f)} />
                  ))}
                </CommandGroup>
              )}
              {savedMealsError && (
                <Alert variant="destructive" className="mx-2 mb-2">
                  <AlertDescription>{savedMealsError}</AlertDescription>
                </Alert>
              )}
              {savedMeals.length > 0 && (
                <CommandGroup heading="Saved meals">
                  {savedMeals.map((savedMeal) => (
                    <CommandItem
                      key={savedMeal._id}
                      value={`saved-meal:${savedMeal._id}`}
                      disabled={busy}
                      onSelect={() => onAddSavedMeal(savedMeal)}
                      className="h-auto items-start justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{savedMeal.name}</p>
                        <p className="text-xs text-muted-foreground">{savedMeal.items.length} foods</p>
                      </div>
                      <span className="shrink-0 text-xs text-primary">Add to {MEAL_LABEL[meal]}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {local.some((f) => f.source === "local") && (
                <CommandGroup heading="Indian food list">
                  {local.filter((f) => f.source === "local").map((f) => (
                    <FoodRow key={f.id} food={f} onClick={() => onPick(f)} />
                  ))}
                </CommandGroup>
              )}

              <div className="space-y-2 px-2 pt-3">
                {onlineBusy && (
                  <p className="py-2 text-center text-sm text-muted-foreground">
                    Searching…
                  </p>
                )}
                {onlineError && (
                  <Alert variant="destructive">
                    <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                      <span>{onlineError}</span>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={onlineBusy}
                        onClick={() => void searchOnline(term)}
                      >
                        Try again
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                {online !== null && online.length === 0 && !onlineError ? (
                  <Empty className="border-0 py-4">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Search />
                      </EmptyMedia>
                      <EmptyTitle>No food found</EmptyTitle>
                      <EmptyDescription>
                        Try another search, or add this as your own food.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : null}
              </div>
              {online && online.length > 0 && (
                <CommandGroup heading="Online">
                  {online.map((f) => (
                    <FoodRow key={f.id} food={f} onClick={() => onPick(f)} />
                  ))}
                </CommandGroup>
              )}

              <div className="px-2 pt-4">
                <Button variant="outline" className="w-full" onClick={() => onManageCustomFoods(term)}>
                  <Plus className="size-4" /> Create or manage custom foods
                </Button>
              </div>
            </>
          )}
        </CommandList>
      </Command>
    </div>
  );
}

/* ---------- portion step ---------- */

function PortionStep({
  selected,
  meal: initialMeal,
  editing,
  onBack,
  onSubmit,
  onDelete,
}: {
  selected: Selected;
  meal: Meal;
  editing?: LogEntry;
  onBack: () => void;
  onSubmit: (v: PortionValue) => Promise<void>;
  onDelete?: () => void;
}) {
  const { food, servings } = selected;
  const [unitKey, setUnitKey] = useState(selected.unitKey);
  const [qty, setQty] = useState(String(selected.qty));
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [busy, setBusy] = useState(false);

  const serving = unitKey === "g" ? null : (servings[Number(unitKey.slice(1))] ?? null);
  const q = Number(qty);
  const valid = qty.trim() !== "" && Number.isFinite(q) && q > 0 && q <= 10000;
  const grams = valid ? (serving ? q * serving.grams : q) : 0;
  const totals = totalsFor(food.per100g, grams);

  // Switching units keeps the same amount of food.
  function changeUnit(next: string) {
    const nextServing = next === "g" ? null : (servings[Number(next.slice(1))] ?? null);
    if (valid) setQty(String(round(nextServing ? grams / nextServing.grams : grams, 2)));
    setUnitKey(next);
  }

  function bump(dir: 1 | -1) {
    const step = serving ? 0.5 : 10;
    setQty(String(Math.max(step, round((valid ? q : 0) + dir * step, 2))));
  }

  async function submit() {
    if (!valid) return;
    setBusy(true);
    try {
      await onSubmit({
        meal,
        grams: round(grams, 1),
        servingLabel: serving?.label,
        servings: serving ? q : undefined,
      });
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 px-2 pb-2">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
          <ChevronLeft />
        </Button>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{food.name}</h2>
          <p className="truncate text-xs text-muted-foreground">
            {food.brand ? `${food.brand} · ` : ""}
            {n0(food.per100g.kcal)} kcal per 100 g
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overscroll-y-contain overflow-y-auto px-4 pb-4" data-vaul-no-drag>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-4xl font-bold tabular-nums">{n0(totals.kcal)}</p>
          <p className="text-xs text-muted-foreground">kcal · {valid ? `${Math.round(grams)} g` : "enter an amount"}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm tabular-nums">
            <div className="rounded-lg bg-muted py-2">
              <p className="font-semibold text-chart-1">{n1(totals.protein)} g</p>
              <p className="text-xs text-muted-foreground">Protein</p>
            </div>
            <div className="rounded-lg bg-muted py-2">
              <p className="font-semibold text-chart-2">{n1(totals.carbs)} g</p>
              <p className="flex items-center justify-center text-xs text-muted-foreground">
                Total carbs <CarbInfo />
              </p>
              <p className="text-[11px] text-muted-foreground">
                Net {n1(netCarbs(totals.carbs, totals.fiber))} g
              </p>
            </div>
            <div className="rounded-lg bg-muted py-2">
              <p className="font-semibold text-chart-3">{n1(totals.fat)} g</p>
              <p className="text-xs text-muted-foreground">Fat</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit">Portion</Label>
          <Select value={unitKey} onValueChange={changeUnit}>
            <SelectTrigger id="unit" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {servings.map((s, i) => (
                <SelectItem key={`${s.label}-${i}`} value={`s${i}`}>
                  {s.label} ({round(s.grams, 1)} g)
                </SelectItem>
              ))}
              <SelectItem value="g">Grams (g)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label htmlFor="qty">{serving ? "How many?" : "How many grams?"}</Label>
          <InputGroup>
            <InputGroupAddon>
              <InputGroupButton size="icon-sm" variant="ghost" onClick={() => bump(-1)} aria-label="Less">
                <Minus />
              </InputGroupButton>
            </InputGroupAddon>
            <InputGroupInput
              id="qty"
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="text-center text-lg"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupText>{serving ? serving.label : "g"}</InputGroupText>
              <InputGroupButton size="icon-sm" variant="ghost" onClick={() => bump(1)} aria-label="More">
                <Plus />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <Slider
            min={serving ? 0.5 : 10}
            max={serving ? Math.max(8, valid ? q : 8) : Math.max(400, valid ? q : 400)}
            step={serving ? 0.5 : 5}
            value={[valid ? q : serving ? 1 : 100]}
            onValueChange={([v]) => setQty(String(v))}
            aria-label={serving ? "Servings" : "Grams"}
          />
        </div>

        <div className="space-y-2">
          <Label>Meal</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            value={meal}
            onValueChange={(v) => v && setMeal(v as Meal)}
            className="grid w-full grid-cols-4"
          >
            {MEALS.map((m) => (
              <ToggleGroupItem key={m} value={m} className="w-full px-1 text-xs">
                {MEAL_LABEL[m]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      <div className="flex shrink-0 gap-2 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {editing && onDelete && (
          <Button variant="outline" size="icon" className="shrink-0 text-destructive" onClick={onDelete} aria-label="Remove">
            <Trash2 />
          </Button>
        )}
        <Button className="flex-1" disabled={!valid || busy} onClick={submit}>
          {busy ? "Saving…" : editing ? "Save changes" : `Add to ${MEAL_LABEL[meal]}`}
        </Button>
      </div>
    </div>
  );
}

/* ---------- the sheet ---------- */

type BodyProps = {
  date: string;
  meal: Meal;
  entry?: LogEntry;
  onClose: () => void;
  onChanged: () => void;
  onDelete: (e: LogEntry) => void;
  onManageCustomFoods: (name: string) => void;
};

function SheetBody({ date, meal, entry, onClose, onChanged, onDelete, onManageCustomFoods }: BodyProps) {
  const [selected, setSelected] = useState<Selected | null>(() => (entry ? fromEntry(entry) : null));
  const [currentMeal, setCurrentMeal] = useState<Meal>(entry?.meal ?? meal);
  const [picking, setPicking] = useState(false);
  const [resetKey, setResetKey] = useState(0); // bump to clear the search box after adding something

  async function pick(food: FoodResult) {
    setPicking(true);
    let f = food;
    try {
      // USDA foods and recent items don't carry their serving sizes yet: fetch them.
      if (food.source === "usda" && food.servings.length === 0) {
        const r = await api<{ servings: Serving[] }>(`/foods/usda/${food.externalId}/servings`);
        f = { ...food, servings: r.servings };
      } else if ((food.source === "local" || food.source === "custom") && food.servings.length === 0) {
        const r = await api<SearchResp>(
          `/foods/search?q=${encodeURIComponent(food.name.slice(0, 80))}&sources=${food.source}`,
        );
        const match = r.results.find((x) => x.id === food.id);
        if (match) f = { ...food, servings: match.servings };
      }
    } catch {
      /* fall back to grams only */
    }
    setSelected(initialFor(f));
    setPicking(false);
  }

  async function submit(v: PortionValue) {
    if (!selected) return;
    if (entry) {
      await api(`/logs/${entry._id}`, {
        method: "PATCH",
        body: {
          meal: v.meal,
          grams: v.grams,
          ...(v.servingLabel ? { servingLabel: v.servingLabel, servings: v.servings } : {}),
        },
      });
      toast.success("Updated");
      onChanged();
      onClose();
      return;
    }
    const { food } = selected;
    await api("/logs", {
      method: "POST",
      body: {
        date,
        meal: v.meal,
        food: {
          source: food.source,
          externalId: food.externalId,
          name: food.name,
          brand: food.brand,
          per100g: food.per100g,
        },
        grams: v.grams,
        servingLabel: v.servingLabel,
        servings: v.servings,
      },
    });
    toast.success(`Added ${food.name} · ${totalsFor(food.per100g, v.grams).kcal} kcal`);
    setCurrentMeal(v.meal);
    setResetKey((k) => k + 1);
    setSelected(null);
    onChanged();
  }

  async function addSavedMeal(savedMeal: SavedMeal) {
    setPicking(true);
    let added = 0;
    try {
      for (const item of savedMeal.items) {
        await api("/logs", {
          method: "POST",
          body: {
            date,
            meal: currentMeal,
            food: item.food,
            grams: item.grams,
          },
        });
        added += 1;
      }
      toast.success(`Added ${savedMeal.name} to ${MEAL_LABEL[currentMeal]}`);
      setResetKey((key) => key + 1);
    } catch (e) {
      toast.error(
        added > 0
          ? `Added ${added} of ${savedMeal.items.length} foods. The rest could not be added: ${errMsg(e)}`
          : `Could not add saved meal: ${errMsg(e)}`,
      );
    } finally {
      setPicking(false);
      if (added > 0) onChanged();
    }
  }

  const onSearch = !selected;

  return (
    <>
      <DrawerTitle className="sr-only">{entry ? "Edit entry" : "Add food"}</DrawerTitle>
      <DrawerDescription className="sr-only">Search foods, choose a portion and add it to your diary.</DrawerDescription>

      {!entry && (
        <div className={cn("flex min-h-0 flex-1 flex-col", !onSearch && "hidden")}>
          <SearchStep
            key={resetKey}
            meal={currentMeal}
            busy={picking}
            onPick={pick}
            onManageCustomFoods={(name) => {
              onClose();
              onManageCustomFoods(name);
            }}
            onAddSavedMeal={(savedMeal) => void addSavedMeal(savedMeal)}
            onClose={onClose}
          />
        </div>
      )}

      {selected && (
        <PortionStep
          selected={selected}
          meal={currentMeal}
          editing={entry}
          onBack={() => (entry ? onClose() : setSelected(null))}
          onSubmit={submit}
          onDelete={entry ? () => onDelete(entry) : undefined}
        />
      )}

    </>
  );
}

export function FoodSheet({
  open,
  onOpenChange,
  ...body
}: { open: boolean; onOpenChange: (open: boolean) => void } & Omit<BodyProps, "onClose">) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto h-[92dvh] max-h-[calc(100dvh-env(safe-area-inset-top))] min-h-0 max-w-md overflow-hidden overscroll-contain data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[calc(100dvh-env(safe-area-inset-top))]">
        <div className="flex min-h-0 flex-1 flex-col">
          <SheetBody {...body} onClose={() => onOpenChange(false)} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
