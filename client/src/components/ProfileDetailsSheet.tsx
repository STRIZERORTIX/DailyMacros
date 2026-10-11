import { Check, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ACTIVITY } from "@/lib/calc";
import type { User } from "@/lib/types";

export function ProfileDetailsSheet() {
  const { user, setUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [sex, setSex] = useState<"male" | "female" | "">("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState(1.2);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const profile = user?.profile;
    setSex(profile?.sex ?? "");
    setAge(profile?.age ? String(profile.age) : "");
    setHeight(profile?.heightCm ? String(profile.heightCm) : "");
    setWeight(profile?.weightKg ? String(profile.weightKg) : "");
    setActivity(profile?.activityFactor ?? 1.2);
  }, [open, user]);

  const ageValue = Number(age);
  const heightValue = Number(height);
  const weightValue = Number(weight);
  const detailsValid =
    !!sex &&
    Number.isInteger(ageValue) &&
    ageValue >= 10 &&
    ageValue <= 100 &&
    Number.isFinite(heightValue) &&
    heightValue >= 100 &&
    heightValue <= 250 &&
    Number.isFinite(weightValue) &&
    weightValue >= 30 &&
    weightValue <= 300;

  async function save() {
    if (!detailsValid) return;
    setBusy(true);
    try {
      const result = await api<{ user: User }>("/auth/me", {
        method: "PATCH",
        body: {
          profile: {
            sex,
            age: ageValue,
            heightCm: heightValue,
            weightKg: weightValue,
            activityFactor: activity,
          },
        },
      });
      setUser(result.user);
      toast.success("Your details are saved");
      setOpen(false);
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setOpen(true)}>
        <UserRound className="size-4" />
        <span className="whitespace-nowrap">Your details</span>
      </Button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mx-auto max-h-[95dvh] max-w-md overflow-hidden">
          <DrawerHeader className="py-3 text-left">
            <DrawerTitle>Your details</DrawerTitle>
            <DrawerDescription className="text-xs">Update details used to estimate your daily energy needs.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3 px-4 pb-2">
            <div className="space-y-1.5">
              <Label>Sex used for calorie estimate</Label>
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
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="profile-age">Age</Label>
                <Input id="profile-age" inputMode="numeric" value={age} onChange={(event) => setAge(event.target.value)} placeholder="years" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-height">Height (cm)</Label>
                <Input id="profile-height" inputMode="decimal" value={height} onChange={(event) => setHeight(event.target.value)} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="profile-weight">Current weight (kg)</Label>
                <Input id="profile-weight" inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-activity">Activity level</Label>
              <Select value={String(activity)} onValueChange={(value) => setActivity(Number(value))}>
                <SelectTrigger id="profile-activity" className="w-full">
                  <SelectValue>{ACTIVITY.find((item) => item.value === activity)?.title}</SelectValue>
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
                Choose based on your usual week, combining work and exercise. If unsure, choose one level lower.
              </p>
            </div>
          </div>
          <DrawerFooter className="mt-0 flex-row gap-2 pt-2">
            <Button type="button" className="flex-1" onClick={() => void save()} disabled={!detailsValid || busy}>
              <Check className="size-4" />
              {busy ? "Saving…" : "Save details"}
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={busy}>
              <X className="size-4" />
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
