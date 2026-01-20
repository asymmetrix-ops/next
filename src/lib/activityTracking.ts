export function normalizeEmail(email?: string | null): string {
  try {
    return String(email || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Global hard rule: do not track user-activity for these emails.
 * - exact match: a.boden@gmail.com
 * - contains: asymmetrixintelligence.com
 */
export function isActivityTrackingBlockedEmail(email?: string | null): boolean {
  const e = normalizeEmail(email);
  if (!e) return false;
  return e === "a.boden@gmail.com" || e.includes("asymmetrixintelligence.com");
}

export function shouldTrackActivityForEmail(email?: string | null): boolean {
  return !isActivityTrackingBlockedEmail(email);
}


