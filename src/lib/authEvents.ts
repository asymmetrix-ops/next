/**
 * Centralised auth event helpers.
 *
 * Any code that detects an expired / invalid token should call
 * `dispatchUnauthorized()`.  AuthProvider listens for the resulting DOM event
 * and shows the login modal without redirecting away from the current page.
 */

export const UNAUTHORIZED_EVENT = "auth:unauthorized" as const;

/**
 * Fire the global "session expired" signal.  Safe to call from anywhere
 * (service files, fetch interceptors, etc.).  No-ops on the server.
 */
export function dispatchUnauthorized(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
  }
}

/**
 * Xano domain used to scope the global fetch interceptor so we only
 * inspect responses from our own backend.
 */
export const XANO_DOMAIN = "xdil-abvj-o7rq.e2.xano.io";

/**
 * Auth-related endpoint path fragments that should never trigger the modal
 * (e.g. wrong password on the login form returns 401 too).
 */
export const AUTH_PATH_EXCLUSIONS = ["/auth/login"];
