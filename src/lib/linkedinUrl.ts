/** Returns a safe https LinkedIn profile/company URL, or undefined if invalid. */
export function normalizeLinkedInProfileUrl(
  candidate: unknown
): string | undefined {
  if (typeof candidate !== "string") return undefined;
  const raw = candidate.trim();
  if (!raw) return undefined;
  try {
    const url = raw.startsWith("http") ? new URL(raw) : new URL(`https://${raw}`);
    const host = url.hostname.toLowerCase();
    if (!host.endsWith("linkedin.com")) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}
