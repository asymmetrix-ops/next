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

export function isLinkedInHost(href: string): boolean {
  try {
    return new URL(href).hostname.toLowerCase().endsWith("linkedin.com");
  } catch {
    return false;
  }
}

/** Any safe http(s) profile or employer page URL. */
export function normalizeExternalProfileUrl(
  candidate: unknown
): string | undefined {
  if (typeof candidate !== "string") return undefined;
  const raw = candidate.trim();
  if (!raw) return undefined;
  try {
    const url = raw.startsWith("http") ? new URL(raw) : new URL(`https://${raw}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}
