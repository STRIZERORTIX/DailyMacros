import { Leaf, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { renderGoogleButton } from "@/lib/google";

type AuthConfig = { googleClientId: string | null };

export function LoginScreen() {
  const { loginWithGoogle } = useAuth();
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const googleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingConfig(true);
    setConfigError(null);
    api<AuthConfig>("/auth/config")
      .then((result) => {
        if (!cancelled) setConfig(result);
      })
      .catch((error: unknown) => {
        if (!cancelled) setConfigError(errMsg(error));
      })
      .finally(() => {
        if (!cancelled) setLoadingConfig(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    const el = googleRef.current;
    if (!config?.googleClientId || !el) return;
    setGoogleError(null);
    renderGoogleButton(
      el,
      config.googleClientId,
      async (credential) => {
        setGoogleError(null);
        try {
          const isNewUser = await loginWithGoogle(credential);
          if (isNewUser) toast.success("Welcome to Daily Macros! Your account is ready.");
        } catch (error) {
          setGoogleError(errMsg(error));
        }
      },
      Math.min(340, el.clientWidth || 340),
    ).catch((error: unknown) => setGoogleError(errMsg(error)));
  }, [config, loginWithGoogle]);

  const googleReady = Boolean(config?.googleClientId);

  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-28 -top-24 size-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 size-96 rounded-full bg-chart-2/10 blur-3xl" />
      </div>

      <Card className="w-full max-w-md gap-0 overflow-hidden border-white/10 bg-card/90 py-0 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="h-1 w-full bg-gradient-to-r from-primary/40 via-primary to-chart-2/70" />
        <CardContent className="space-y-8 px-6 py-10 sm:px-10 sm:py-12">
          <div className="space-y-5 text-center">
            <img
              src="/Logo.png"
              alt="Daily Macros — Fuel by Frame"
              className="mx-auto block h-auto w-full max-w-[18rem] object-contain"
            />
            <div className="space-y-2">
              {/* <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Daily Macros</p> */}
              <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">Feel good about your progress.</h1>
              <p className="mx-auto max-w-xs text-pretty text-sm leading-6 text-muted-foreground">
                Daily Macros — a simple, thoughtful place to track meals, nutrition and the habits that move you forward.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {loadingConfig ? (
              <Skeleton className="mx-auto h-10 w-full max-w-[340px] rounded-full" />
            ) : googleReady ? (
              <div
                ref={googleRef}
                className="mx-auto flex h-10 w-full max-w-[340px] justify-center overflow-hidden rounded-full"
              />
            ) : (
              <Alert variant="destructive">
                <AlertDescription>
                  {configError
                    ? `Could not connect to sign-in: ${configError}`
                    : "Google sign-in is not configured yet. Please try again later."}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="ml-3"
                    onClick={() => setAttempt((value) => value + 1)}
                  >
                    Try again
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {googleError && (
              <Alert variant="destructive">
                <AlertDescription>{googleError}</AlertDescription>
              </Alert>
            )}

            <p className="text-center text-sm text-muted-foreground">
              One secure step. No separate account or password to create.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-border/70 pt-5">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Leaf className="size-4 text-primary" />
              Made for everyday meals
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" />
              Your account, securely
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
