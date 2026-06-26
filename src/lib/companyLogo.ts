/** Resolve company logo values from Get_new_companies / FI APIs to a usable img src. */
export function resolveCompanyLogoSrc(
  logo: string | null | undefined
): string | null {
  if (!logo?.trim()) return null;
  const trimmed = logo.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:image")
  ) {
    return trimmed;
  }
  return `data:image/jpeg;base64,${trimmed}`;
}
