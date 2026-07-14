/** Derive up to two initials from a person or entity display name. */
export function getEntityInitials(name: string, max = 2): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";

  const parts = trimmed.split(/\s+/).filter(Boolean);
  const firstPart = parts[0] ?? "";

  if (firstPart.includes(".")) {
    const dotted = firstPart
      .split(".")
      .map((segment) => segment.replace(/[^A-Za-z]/g, "").trim())
      .filter(Boolean)
      .map((segment) => segment[0]?.toUpperCase() ?? "")
      .join("");
    if (dotted) return dotted.slice(0, max);
  }

  const compactInitials = firstPart.match(/^([A-Z]{2,})/);
  if (compactInitials) return compactInitials[1].slice(0, max);

  if (parts.length >= 2) {
    const first =
      parts[0].replace(/[^A-Za-z]/g, "")[0]?.toUpperCase() ?? "";
    const last =
      parts[parts.length - 1].replace(/[^A-Za-z]/g, "")[0]?.toUpperCase() ?? "";
    const combined = `${first}${last}`;
    if (combined) return combined.slice(0, max);
  }

  const single = firstPart.replace(/[^A-Za-z]/g, "")[0]?.toUpperCase() ?? "?";
  return single.slice(0, max);
}
