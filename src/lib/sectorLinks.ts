import { normalizeSectorName } from "@/components/corporate-events/corporateEventsTableUtils";

export type SectorLinkEntry = {
  name: string;
  id?: number;
  importance?: string;
};

export type SectorNameLookup = Record<
  string,
  { id: number; importance: string }
>;

export function extractSectorId(sector: unknown): number | undefined {
  if (!sector || typeof sector !== "object") return undefined;
  const s = sector as Record<string, unknown>;
  const candidate = s.sector_id ?? s.id ?? s.Sector_id;
  if (typeof candidate === "number" && candidate > 0) return candidate;
  if (typeof candidate === "string") {
    const parsed = parseInt(candidate, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
  return undefined;
}

export function getSectorHref(entry: SectorLinkEntry): string | undefined {
  const id = entry.id;
  if (typeof id !== "number" || id <= 0) return undefined;
  const importance = String(entry.importance ?? "Primary")
    .trim()
    .toLowerCase();
  return importance === "primary"
    ? `/sector/${id}`
    : `/sub-sector/${id}`;
}

export function parseSectorRefArray(value: unknown): SectorLinkEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): SectorLinkEntry | null => {
      if (!item || typeof item !== "object") return null;
      const rec = item as Record<string, unknown>;
      const name = String(rec.name ?? rec.sector_name ?? "").trim();
      if (!name) return null;
      const id = extractSectorId(item);
      const importance = String(
        rec.Sector_importance ?? rec.sector_importance ?? "Primary"
      ).trim();
      return { name, id, importance };
    })
    .filter((entry): entry is SectorLinkEntry => entry !== null);
}

export function coerceSectorNameList(raw: unknown): SectorLinkEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): SectorLinkEntry | null => {
      if (typeof item === "string") {
        const name = item.trim();
        return name ? { name, importance: "Primary" } : null;
      }
      if (!item || typeof item !== "object") return null;
      const rec = item as Record<string, unknown>;
      const name = String(rec.sector_name ?? rec.name ?? "").trim();
      if (!name) return null;
      return {
        name,
        id: extractSectorId(item),
        importance: String(
          rec.Sector_importance ?? rec.sector_importance ?? "Primary"
        ).trim(),
      };
    })
    .filter((entry): entry is SectorLinkEntry => entry !== null);
}

export function enrichSectorEntries(
  entries: SectorLinkEntry[],
  nameToId?: SectorNameLookup
): SectorLinkEntry[] {
  if (!nameToId) return entries;
  return entries.map((entry) => {
    if (entry.id) return entry;
    const lookup = nameToId[normalizeSectorName(entry.name)];
    if (!lookup) return entry;
    return {
      ...entry,
      id: lookup.id,
      importance: entry.importance ?? lookup.importance,
    };
  });
}

export function buildSectorNameLookup(
  sectors: Array<{
    sector_name?: string;
    Sector_importance?: string;
    sector_id?: number;
    id?: number;
  }>
): SectorNameLookup {
  const map: SectorNameLookup = {};
  for (const sector of sectors) {
    const name = sector.sector_name?.trim();
    const id = extractSectorId(sector);
    if (!name || !id) continue;
    map[normalizeSectorName(name)] = {
      id,
      importance: sector.Sector_importance ?? "Primary",
    };
  }
  return map;
}

export type EventSectorsPayload = {
  Primary?: unknown[];
  Secondary?: unknown[];
};

/** Parse `sectors` from corporate-event API (object or JSON string). */
export function parseEventSectorsPayload(
  value: unknown
): EventSectorsPayload | null {
  if (!value) return null;
  if (typeof value === "object") return value as EventSectorsPayload;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as EventSectorsPayload;
    }
  } catch {
    return null;
  }
  return null;
}

/** Prefer `sectors.Primary` / `sectors.Secondary` refs; fall back to legacy `primary`. */
export function resolveEventSectorEntries(
  sectorsField: unknown,
  legacyPrimaryField?: unknown,
  importance: "Primary" | "Secondary" = "Primary"
): SectorLinkEntry[] {
  const payload = parseEventSectorsPayload(sectorsField);
  const listKey = importance === "Primary" ? "Primary" : "Secondary";
  const defaultImportance = importance;

  const fromSectors = coerceSectorNameList(payload?.[listKey]).map((entry) => ({
    ...entry,
    importance: entry.importance ?? defaultImportance,
  }));
  if (fromSectors.length > 0) return fromSectors;

  if (importance === "Primary") {
    return parseSectorRefArray(legacyPrimaryField);
  }
  return [];
}
