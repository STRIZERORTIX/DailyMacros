// Tiny fetch wrapper. In dev, /api is proxied to the Express server by Vite.
// For a deployed build, set VITE_API_URL (e.g. https://my-api.onrender.com) at build time.
const BASE = `${import.meta.env.VITE_API_URL ?? ""}/api`;
const TOKEN_KEY = "kcal.token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode etc.: the session just won't persist */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Opts = { method?: string; body?: unknown; signal?: AbortSignal };

export async function api<T>(path: string, opts: Opts = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    signal: opts.signal,
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event("kcal:unauthorized"));
    const first = Array.isArray(data.issues) ? data.issues[0] : null;
    const issue = first ? `${first.path ? `${first.path}: ` : ""}${first.message}` : null;
    throw new ApiError(res.status, issue ?? data.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
