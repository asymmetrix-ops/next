export function normalizeEmail(email?: string | null): string {
  try {
    return String(email || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Global hard rule: do not track user-activity for staff.
 * - every @asymmetrixintelligence.com address
 * - plus exact-match extras (normalized to lowercase)
 */
export function isActivityTrackingBlockedEmail(email?: string | null): boolean {
  const e = normalizeEmail(email);
  if (!e) return false;
  return e.endsWith("@asymmetrixintelligence.com") || e === "tucha.dev@gmail.com";
}

export function shouldTrackActivityForEmail(email?: string | null): boolean {
  // User activity tracking is fully disabled on the develop deployment.
  void email;
  return false;
}


