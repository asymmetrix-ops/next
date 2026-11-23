export type DataTypeDefensibility = "High" | "Medium" | "Low";

export type DataTypeCard = {
  id: number;
  name: string;
  description: string | null;
  defensibility: DataTypeDefensibility;
  color: string | null;
  summary: string | null;
} | null;

const DEFENSIBILITY_LEVELS: DataTypeDefensibility[] = ["High", "Medium", "Low"];

function normalizeDefensibility(
  value: unknown
): DataTypeDefensibility | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const hit = DEFENSIBILITY_LEVELS.find(
    (d) => d.toLowerCase() === trimmed.toLowerCase()
  );
  return hit ?? null;
}

function optionalString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

/** Parse `data_type` from Get_new_company (null when unset or id is 0). */
export function parseCompanyDataType(raw: unknown): DataTypeCard {
  if (raw == null) return null;
  if (typeof raw !== "object") return null;

  const o = raw as Record<string, unknown>;
  const id = o.id;
  if (typeof id !== "number" || !Number.isFinite(id) || id <= 0) return null;

  const name = optionalString(o.name);
  const defensibility = normalizeDefensibility(o.defensibility);
  if (!name || !defensibility) return null;

  return {
    id,
    name,
    description: optionalString(o.description),
    defensibility,
    color: optionalString(o.color),
    summary: optionalString(o.summary),
  };
}

export const DATA_TYPE_BADGE_FALLBACK_COLOR = "#9CA3AF";

/** Light badge background from a hex color; falls back to inset gray. */
export function dataTypeBadgeBackground(color: string | null): string {
  const hex = (color?.trim() || DATA_TYPE_BADGE_FALLBACK_COLOR).replace(
    /^#/,
    ""
  );
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return `#${hex}22`;
  }
  return "#EFF2F8";
}