import { authService } from "@/lib/auth";

export const DEFAULT_EXPORT_ROW_LIMIT = 100;
export const MAX_EXPORT_ROW_LIMIT = 10000;

const CACHE_TTL_MS = 60_000;
let cached: { token: string; limit: number; at: number } | null = null;

/** Falls back to the default when the value is missing, 0 or not a whole number. */
export function normalizeExportLimit(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return DEFAULT_EXPORT_ROW_LIMIT;
  return Math.min(n, MAX_EXPORT_ROW_LIMIT);
}

/** Max rows per export for the logged-in user (`export_limits` on /auth/me). */
export async function getExportRowLimit(): Promise<number> {
  const token = authService.getToken();
  if (!token) return DEFAULT_EXPORT_ROW_LIMIT;
  if (cached && cached.token === token && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.limit;
  }

  let limit = DEFAULT_EXPORT_ROW_LIMIT;
  try {
    const response = await fetch("/api/auth-me", {
      method: "GET",
      headers: { "Content-Type": "application/json", "x-asym-token": token },
      credentials: "include",
      cache: "no-store",
    });
    if (response.ok) {
      const data = (await response.json()) as Record<string, unknown>;
      limit = normalizeExportLimit(data.export_limits ?? data.export_limit);
    }
  } catch (error) {
    console.error("Failed to load export limit:", error);
  }

  cached = { token, limit, at: Date.now() };
  return limit;
}

/**
 * Rows to fetch for a full-list export: one more than the limit, so the export
 * step can tell that the list was longer and show the limit message.
 */
export async function getExportFetchCap(): Promise<number> {
  return (await getExportRowLimit()) + 1;
}

export function exportLimitMessage(limit: number): string {
  return `Your export is limited to ${limit} rows. Contact us if you need more.`;
}
