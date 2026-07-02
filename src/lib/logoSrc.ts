/** Normalize raw logo values (base64, data URI, or URL) into a browser-ready src. */
export function buildLogoSrc(raw?: string | null): string | undefined {
  if (!raw) return undefined;

  const value = String(raw).trim();
  if (!value) return undefined;

  if (/^data:/i.test(value)) return value;

  if (/^https?:\/\//i.test(value)) {
    try {
      const host = new URL(value).hostname.toLowerCase();
      if (host.endsWith("licdn.com") || host.endsWith("linkedin.com")) {
        return undefined;
      }
      return value;
    } catch {
      return undefined;
    }
  }

  const compact = value
    .replace(/\\r\\n|\\n|\\r/g, "")
    .replace(/\s+/g, "");
  if (!compact || !/^[A-Za-z0-9+/=]+$/.test(compact)) return undefined;

  const mime = compact.startsWith("iVBOR") ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${compact}`;
}
