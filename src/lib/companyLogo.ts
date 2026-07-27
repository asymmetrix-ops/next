/** Resolve company logo values from Get_new_companies / FI APIs to a usable img src. */

const PLACEHOLDER_LOGOS = new Set(["-", "null", "undefined", "n/a", "none"]);

/** Canonical API field paths for entity logos (first match wins). */
export const LOGO_FIELD_ALIASES = [
  "company_logo",
  "Company_logo",
  "linkedin_logo",
  "Linkedin_Logo",
  "logo_url",
  "logo",
  "logo_data_uri",
  "linkedin.logo_data_uri",
  "linkedin.logo_base64_jpeg",
  "_linkedin_data_of_new_company.linkedin_logo",
  "linkedin_data.linkedin_logo",
  "linkedin_data.Linkedin_Logo",
  "_new_company.linkedin_logo",
  "_new_company._linkedin_data_of_new_company.linkedin_logo",
  "company._linkedin_data_of_new_company.linkedin_logo",
  "Company._linkedin_data_of_new_company.linkedin_logo",
] as const;

function isPlaceholderLogo(value: string): boolean {
  return PLACEHOLDER_LOGOS.has(value.trim().toLowerCase());
}

function stripBase64Noise(value: string): string {
  return value
    .replace(/\\r\\n/g, "")
    .replace(/\\n/g, "")
    .replace(/\\r/g, "")
    .replace(/\r\n/g, "")
    .replace(/\n/g, "")
    .replace(/\r/g, "")
    .replace(/\s+/g, "");
}

function base64ImageMime(data: string): string {
  if (data.startsWith("iVBORw0KGgo")) return "image/png";
  if (data.startsWith("R0lGOD")) return "image/gif";
  if (data.startsWith("UklGR")) return "image/webp";
  return "image/jpeg";
}

function hasImageMagicBytes(payload: string): boolean {
  if (!payload || payload.length < 16) return false;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(payload)) return false;

  try {
    const padded =
      payload.length % 4 === 0
        ? payload
        : payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");
    const binary = atob(padded);
    const b0 = binary.charCodeAt(0);
    const b1 = binary.charCodeAt(1);
    if (b0 === 0xff && b1 === 0xd8) return true;
    if (b0 === 0x89 && b1 === 0x50) return true;
    if (b0 === 0x47 && b1 === 0x49) return true;
    return binary.startsWith("RIFF") && binary.slice(8, 12) === "WEBP";
  } catch {
    return false;
  }
}

function extractBase64Payload(logo: string): string | null {
  let trimmed = logo.trim();

  while (trimmed.startsWith("data:image")) {
    const commaIdx = trimmed.indexOf(",");
    if (commaIdx === -1) return null;
    trimmed = trimmed.slice(commaIdx + 1);
  }

  const payload = stripBase64Noise(trimmed);
  return payload || null;
}

function isBlockedLinkedInUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host.endsWith("licdn.com") || host.endsWith("linkedin.com");
  } catch {
    return true;
  }
}

export function resolveCompanyLogoSrc(
  logo: string | null | undefined
): string | null {
  if (typeof logo !== "string") return null;

  const trimmed = logo.trim();
  if (!trimmed || isPlaceholderLogo(trimmed)) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const payload = extractBase64Payload(trimmed);
  if (!payload || !hasImageMagicBytes(payload)) return null;

  return `data:${base64ImageMime(payload)};base64,${payload}`;
}

/** Like resolveCompanyLogoSrc, but drops LinkedIn CDN URLs (often blocked in-browser). */
export function resolveCompanyLogoSrcBlockingLinkedIn(
  logo: string | null | undefined
): string | null {
  if (typeof logo !== "string") return null;
  const trimmed = logo.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return isBlockedLinkedInUrl(trimmed) ? null : trimmed;
  }

  return resolveCompanyLogoSrc(logo);
}

/** Read and normalize a logo from list/detail API records. */
export function readLogoFromRecord(
  record: unknown,
  aliases: readonly string[] = LOGO_FIELD_ALIASES
): string | null {
  if (!record || typeof record !== "object") return null;

  const rec = record as Record<string, unknown>;
  for (const alias of aliases) {
    const parts = alias.split(".");
    let current: unknown = rec;
    for (const part of parts) {
      if (!current || typeof current !== "object") {
        current = undefined;
        break;
      }
      current = (current as Record<string, unknown>)[part];
    }
    if (typeof current === "string" && current.trim()) {
      const resolved = resolveCompanyLogoSrc(current);
      if (resolved) return resolved;
    }
  }

  return null;
}

/** Shorthand for readLogoFromRecord with canonical aliases. */
export function readEntityLogo(record: unknown): string | null {
  return readLogoFromRecord(record, LOGO_FIELD_ALIASES);
}
