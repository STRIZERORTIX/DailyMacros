import { BarChart3, LogOut, UserRound, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { ProfileView } from "@/components/ProfileView";
import { HOWTO_KEY, HowToUseDialog } from "@/components/HowToUse";
import { InsightsView } from "@/components/InsightsView";
import { TodayView } from "@/components/TodayView";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { isProfileComplete } from "@/lib/calc";
import { cn } from "@/lib/utils";

type Tab = "today" | "insights" | "profile";

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "today", label: "Today", icon: UtensilsCrossed },
  { id: "insights", label: "Insights", icon: BarChart3 },
  { id: "profile", label: "Profile", icon: UserRound },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const profileComplete = isProfileComplete(user?.profile ?? {});
  const [tab, setTab] = useState<Tab>(() => (profileComplete ? "today" : "profile"));
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(HOWTO_KEY) !== "1") setHelpOpen(true);
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between border-b bg-background/90 px-5 py-3 backdrop-blur sm:px-6">
        <div className="flex min-w-0 shrink-0 items-center">
          <img
            src="/Logo.png"
            alt="Daily Macros"
            className="h-16 rounded-md object-cover object-center sm:h-[4.5rem] sm:w-72"
          />
        </div>
        <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out">
          <LogOut className="size-5" />
        </Button>
      </header>

      <main className="flex-1 px-4 pb-28">
        {tab === "today" && <TodayView />}
        {tab === "insights" && <InsightsView />}
        {tab === "profile" && <ProfileView onSetupComplete={() => setTab("today")} onOpenHelp={() => setHelpOpen(true)} />}
      </main>

      {profileComplete && (
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
      )}

      <HowToUseDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
