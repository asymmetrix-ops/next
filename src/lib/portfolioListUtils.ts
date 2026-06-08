/** Unwrap get_users_lists payloads (array or nested lists). */
export function extractPortfolioList(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const key of [
      "user_lists",
      "lists",
      "items",
      "data",
      "portfolios",
      "result",
    ]) {
      const v = o[key];
      if (Array.isArray(v)) return v;
    }
  }
  return null;
}

export function parseUserId(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === "string") {
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}
