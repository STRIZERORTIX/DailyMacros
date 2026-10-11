import { Flame } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LoginScreen } from "@/components/LoginScreen";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";

export default function App() {
  const { user, loading } = useAuth();

  return (
    <TooltipProvider>
      {loading ? (
        <div className="grid min-h-dvh place-items-center">
          <Flame className="size-8 animate-pulse text-primary" />
        </div>
      ) : user ? (
        <AppShell />
      ) : (
        <LoginScreen />
      )}
      <Toaster theme="dark" position="top-center" />
    </TooltipProvider>
  );
}
