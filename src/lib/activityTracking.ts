export function normalizeEmail(email?: string | null): string {
  try {
    return String(email || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Global hard rule: do not track user-activity for these emails.
 * - exact match list (normalized to lowercase)
 */
export function isActivityTrackingBlockedEmail(email?: string | null): boolean {
  const e = normalizeEmail(email);
  if (!e) return false;
  return (
    e === "a.boden@asymmetrixintelligence.com" ||
    e === "j.bochner@asymmetrixintelligence.com" ||
    e === "d.dinsey@asymmetrixintelligence.com" ||
    e === "a.grishko@asymmetrixintelligence.com" ||
    e === "h.crean@asymmetrixintelligence.com" ||
    e === "tucha.dev@gmail.com"
  );
}

export function shouldTrackActivityForEmail(email?: string | null): boolean {
  return !isActivityTrackingBlockedEmail(email);
}


