import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setToken, getToken } from "./api";
import type { User } from "./types";

type AuthState = {
  user: User | null;
  loading: boolean;
  loginWithGoogle: (credential: string) => Promise<boolean>;
  logout: () => void;
  setUser: (u: User) => void;
};

const AuthCtx = createContext<AuthState | null>(null);

type AuthResponse = { token: string; user: User; isNewUser?: boolean };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => !!getToken());

  // Restore the session if a token is stored.
  useEffect(() => {
    if (!getToken()) return;
    api<{ user: User }>("/auth/me")
      .then((r) => setUser(r.user))
      .catch(() => {
        /* 401 is handled by the unauthorized event below; network errors keep the token */
      })
      .finally(() => setLoading(false));
  }, []);

  // Any 401 from the API logs you out.
  useEffect(() => {
    const onUnauthorized = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener("kcal:unauthorized", onUnauthorized);
    return () => window.removeEventListener("kcal:unauthorized", onUnauthorized);
  }, []);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const r = await api<AuthResponse>("/auth/google", { method: "POST", body: { credential } });
    setToken(r.token);
    setUser(r.user);
    return r.isNewUser ?? false;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, loginWithGoogle, logout, setUser }),
    [user, loading, loginWithGoogle, logout],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
