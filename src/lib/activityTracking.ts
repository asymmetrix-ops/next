export function normalizeEmail(email?: string | null): string {
  try {
    return String(email || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

function isDevelopDeployment(): boolean {
  return process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF === "develop";
}

/**
 * Global hard rule: do not track user-activity for these emails.
 * - exact match list (normalized to lowercase)
 */
export function isActivityTrackingBlockedEmail(email?: string | null): boolean {
  const e = normalizeEmail(email);
  if (!e) return false;
  // On the develop deployment, staff (asymmetrixintelligence.com) are tracked so the
  // Section Insights events can be tested. The dashboard filters them out of the numbers.
  if (isDevelopDeployment() && e.endsWith("@asymmetrixintelligence.com")) {
    return false;
  }
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


