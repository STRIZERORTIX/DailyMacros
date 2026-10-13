import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setToken, getToken } from "./api";
import { isProfileComplete } from "./calc";
import type { User } from "./types";

const NEW_USER_SETUP_KEY = "kcal-new-user-setup";

type AuthState = {
  user: User | null;
  loading: boolean;
  isNewUser: boolean;
  loginWithGoogle: (credential: string) => Promise<boolean>;
  logout: () => void;
  setUser: (u: User) => void;
};

const AuthCtx = createContext<AuthState | null>(null);

type AuthResponse = { token: string; user: User; isNewUser?: boolean };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userState, setUserState] = useState<User | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(() => !!getToken());

  const setUser = useCallback((nextUser: User) => {
    setUserState(nextUser);
    if (isProfileComplete(nextUser.profile)) {
      localStorage.removeItem(NEW_USER_SETUP_KEY);
      setIsNewUser(false);
    }
  }, []);

  // Restore the session if a token is stored.
  useEffect(() => {
    if (!getToken()) return;
    api<{ user: User }>("/auth/me")
      .then((r) => {
        setUserState(r.user);
        setIsNewUser(
          localStorage.getItem(NEW_USER_SETUP_KEY) === r.user.id && !isProfileComplete(r.user.profile),
        );
      })
      .catch(() => {
        /* 401 is handled by the unauthorized event below; network errors keep the token */
      })
      .finally(() => setLoading(false));
  }, []);

  // Any 401 from the API logs you out.
  useEffect(() => {
    const onUnauthorized = () => {
      setToken(null);
      setUserState(null);
    };
    window.addEventListener("kcal:unauthorized", onUnauthorized);
    return () => window.removeEventListener("kcal:unauthorized", onUnauthorized);
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const r = await api<AuthResponse>("/auth/google", { method: "POST", body: { credential } });
    setToken(r.token);
    const created = r.isNewUser ?? false;
    if (created) localStorage.setItem(NEW_USER_SETUP_KEY, r.user.id);
    setUserState(r.user);
    const onboardingPending =
      localStorage.getItem(NEW_USER_SETUP_KEY) === r.user.id && !isProfileComplete(r.user.profile);
    const shouldOnboard = created || onboardingPending;
    setIsNewUser(shouldOnboard);
    return shouldOnboard;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUserState(null);
    setIsNewUser(false);
  }, []);

  const value = useMemo(
    () => ({ user: userState, loading, isNewUser, loginWithGoogle, logout, setUser }),
    [userState, loading, isNewUser, loginWithGoogle, logout, setUser],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
