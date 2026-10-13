import { BarChart3, BookOpen, LogOut, UserRound, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { ProfileView } from "@/components/ProfileView";
import { HowToUseDialog } from "@/components/HowToUse";
import { InsightsView } from "@/components/InsightsView";
import { TodayView } from "@/components/TodayView";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Tab = "today" | "insights" | "profile";
type ProfileSection = "targets" | "weight-tracker" | "reminders" | "custom-foods";

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "today", label: "Tracker", icon: UtensilsCrossed },
  { id: "insights", label: "Insights", icon: BarChart3 },
  { id: "profile", label: "Profile", icon: UserRound },
];

export function AppShell() {
  const { isNewUser, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("today");
  const [profileSection, setProfileSection] = useState<ProfileSection>("targets");
  const [customFoodName, setCustomFoodName] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);

  const manageCustomFoods = (name: string) => {
    setCustomFoodName(name);
    setProfileSection("custom-foods");
    setTab("profile");
  };

  useEffect(() => {
    if (isNewUser) setHelpOpen(true);
  }, [isNewUser]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-2 border-b bg-background/90 px-5 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur sm:px-6">
        <div className="flex min-w-0 flex-1 items-center">
          <img
            src="/Logo.png"
            alt="Daily Macros"
            className="h-12 w-full max-w-[18rem] rounded-md object-contain object-left sm:h-[4.5rem]"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setHelpOpen(true)} aria-label="How to use">
            <BookOpen className="size-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out">
            <LogOut className="size-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28">
        {tab === "today" && <TodayView onManageCustomFoods={manageCustomFoods} />}
        {tab === "insights" && <InsightsView />}
        {tab === "profile" && (
          <ProfileView
            key={profileSection}
            initialSection={profileSection}
            initialCustomFoodName={customFoodName}
            onSetupComplete={() => setTab("today")}
          />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-3 pb-[env(safe-area-inset-bottom)]">
          {TABS.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              type="button"
              variant="ghost"
              onClick={() => setTab(id)}
              className={cn(
                "h-auto flex-col gap-1 rounded-none py-3 text-xs",
                tab === id ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Button>
          ))}
        </div>
      </nav>

      <HowToUseDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
