export const SESSION_EXPIRED_EVENT = "auth:session-expired";

let notified = false;
let guardInstalled = false;

/** Dispatched once per expired session, until `resetSessionExpiredFlag` runs (e.g. on next login). */
export function notifySessionExpired(): void {
  if (typeof window === "undefined" || notified) return;
  notified = true;
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

export function resetSessionExpiredFlag(): void {
  notified = false;
}

function getAuthorizationHeader(
  input: RequestInfo | URL,
  init?: RequestInit
): string | null {
  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.headers.get("Authorization");
  }
  const headers = init?.headers;
  if (!headers) return null;
  if (headers instanceof Headers) return headers.get("Authorization");
  if (Array.isArray(headers)) {
    const entry = headers.find(([key]) => key.toLowerCase() === "authorization");
    return entry ? entry[1] : null;
  }
  const record = headers as Record<string, string>;
  const key = Object.keys(record).find((k) => k.toLowerCase() === "authorization");
  return key ? record[key] : null;
}

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof Request !== "undefined" && input instanceof Request) return input.url;
  if (input instanceof URL) return input.toString();
  return input as string;
}

// Endpoints where a 401 means "bad credentials", not "session expired" — never react to those.
const AUTH_ENDPOINT_PATTERN =
  /\/auth\/(login|signup)|\/request_password_reset|\/update_password/i;

/**
 * Patches the global fetch (once) so a 401 returned for any request that carried a
 * Bearer token triggers a single app-wide "session expired" notification, no matter
 * which of the many scattered service files made the call.
 */
export function installFetchAuthGuard(): void {
  if (guardInstalled || typeof window === "undefined") return;
  guardInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init);

    if (response.status === 401) {
      const authHeader = getAuthorizationHeader(input, init);
      const url = getRequestUrl(input);
      const wasAuthenticatedRequest =
        !!authHeader && authHeader.toLowerCase().startsWith("bearer ");
      // Same-origin /api proxies authenticate via the cookie/server-side token, so no header is visible here.
      const isOwnApiCall = isSameOriginApi(url) && hasStoredToken();

      if ((wasAuthenticatedRequest || isOwnApiCall) && !AUTH_ENDPOINT_PATTERN.test(url)) {
        notifySessionExpired();
      }
    }

    return response;
  };
}

const TOKEN_KEY = "asymmetrix_auth_token";

function hasStoredToken(): boolean {
  try {
    return !!localStorage.getItem(TOKEN_KEY);
  } catch {
    return false;
  }
}

function isSameOriginApi(url: string): boolean {
  try {
    const u = new URL(url, window.location.origin);
    return u.origin === window.location.origin && u.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

/** Token expiry in ms if the token is a readable JWT with `exp`; otherwise null. */
function getTokenExpiryMs(token: string): number | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = JSON.parse(json)?.exp;
    if (typeof exp !== "number") return null;
    return exp > 1e12 ? exp : exp * 1000;
  } catch {
    return null;
  }
}

const API_BASE =
  process.env.NEXT_PUBLIC_XANO_API_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6:develop";

let lastProbe = 0;
let lastActive = Date.now();
let watcherInstalled = false;

/** Checks the stored session: reads JWT `exp` when possible, otherwise asks /auth/me. */
export async function verifySession(force = false): Promise<void> {
  if (typeof window === "undefined") return;
  let token: string | null = null;
  try {
    token = localStorage.getItem(TOKEN_KEY);
  } catch {
    return;
  }
  if (!token) return;

  const exp = getTokenExpiryMs(token);
  if (exp !== null) {
    if (exp <= Date.now()) notifySessionExpired();
    return;
  }

  // Opaque token: probe the backend (throttled). The patched fetch turns a 401 into the global event.
  const now = Date.now();
  if (!force && now - lastProbe < 60_000) return;
  lastProbe = now;
  try {
    await window.fetch(`${API_BASE}/auth/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      cache: "no-store",
    });
  } catch {
    // Network problems are not an expired session.
  }
}

/** Re-validates the session when the tab is shown again, regains focus, is restored from bfcache, and periodically. */
export function installSessionWatcher(): void {
  if (watcherInstalled || typeof window === "undefined") return;
  watcherInstalled = true;

  const onReturn = () => {
    const idleMs = Date.now() - lastActive;
    lastActive = Date.now();
    void verifySession(idleMs > 60_000);
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") onReturn();
    else lastActive = Date.now();
  });
  window.addEventListener("focus", onReturn);
  window.addEventListener("pageshow", onReturn);
  window.setInterval(() => {
    if (document.visibilityState === "visible") void verifySession();
  }, 60_000);
  void verifySession(true);
}

// Install at module load so requests fired by page effects on first render are covered too.
if (typeof window !== "undefined") {
  installFetchAuthGuard();
}
