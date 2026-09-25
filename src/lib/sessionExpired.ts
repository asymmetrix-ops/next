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

      if (wasAuthenticatedRequest && !AUTH_ENDPOINT_PATTERN.test(url)) {
        notifySessionExpired();
      }
    }

    return response;
  };
}
