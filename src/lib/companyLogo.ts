/** Resolve company logo values from Get_new_companies / FI APIs to a usable img src. */
function base64ImageMime(data: string): string {
  if (data.startsWith("iVBORw0KGgo")) return "image/png";
  if (data.startsWith("R0lGOD")) return "image/gif";
  if (data.startsWith("UklGR")) return "image/webp";
  return "image/jpeg";
}

export function resolveCompanyLogoSrc(
  logo: string | null | undefined
): string | null {
  if (!logo?.trim()) return null;
  let trimmed = logo.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:image")
  ) {
    return trimmed;
  }
  trimmed = trimmed.replace(/\s+/g, "");
  return `data:${base64ImageMime(trimmed)};base64,${trimmed}`;
}
