import { normalizeExternalProfileUrl } from "./linkedinUrl";

/** Returns a safe http(s) website URL, or undefined if invalid. */
export function normalizeWebsiteUrl(candidate: unknown): string | undefined {
  return normalizeExternalProfileUrl(candidate);
}

/** Human-readable website label without protocol (e.g. "iqvia.com/path"). */
export function formatWebsiteLabel(href: string): string {
  try {
    const url = new URL(href);
    let host = url.hostname;
    if (host.toLowerCase().startsWith("www.")) {
      host = host.slice(4);
    }
    const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
    const suffix = `${url.search}${url.hash}`;
    return `${host}${path}${suffix}` || host;
  } catch {
    return href
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .replace(/\/$/, "");
  }
}
