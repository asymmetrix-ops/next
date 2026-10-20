/**
 * Single source of truth for the backend host.
 *
 * Set NEXT_PUBLIC_API_BASE_URL (e.g. http://localhost:8000 or the Azure
 * Container Apps URL) to point the app at the FastAPI backend. When unset it
 * falls back to the legacy Xano host, so reverting = unsetting the env var.
 */
const LEGACY_XANO_HOST = "https://xdil-abvj-o7rq.e2.xano.io";

export const XANO_HOST: string = (
  process.env.NEXT_PUBLIC_API_BASE_URL || LEGACY_XANO_HOST
).replace(/\/+$/, "");

/** True when NEXT_PUBLIC_API_BASE_URL points somewhere other than legacy Xano. */
export const USING_CUSTOM_API_BASE: boolean = XANO_HOST !== LEGACY_XANO_HOST;

/**
 * Resolve a group base URL (e.g. `${XANO_HOST}/api:vnXelut6`).
 * The legacy NEXT_PUBLIC_XANO_API_URL override is honoured only when no
 * NEXT_PUBLIC_API_BASE_URL is set, so the new base always wins.
 */
export function xanoApiUrlOr(fallback: string): string {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) return fallback;
  return process.env.NEXT_PUBLIC_XANO_API_URL || fallback;
}
