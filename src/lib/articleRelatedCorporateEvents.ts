export type ArticleRelatedCorporateEvent = {
  id: number;
  created_at?: number;
  description?: string;
  long_description?: string;
  deal_status?: string;
  announcement_date?: string;
  closed_date?: string;
  deal_type?: string;
  target?: { id?: number; name?: string; logo?: string };
  advisors?: Array<{ _new_company?: { id?: number; name?: string } }>;
  primary_sectors?: Array<{ id?: number; sector_name?: string }>;
  secondary_sectors?: Array<{ id?: number; sector_name?: string }>;
};

function parseJsonString(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed.replace(/\\u0022/g, '"'));
  } catch {
    return undefined;
  }
}

function eventFromUnknown(item: unknown): ArticleRelatedCorporateEvent | null {
  if (typeof item === "number" && Number.isFinite(item) && item > 0) {
    return { id: item, description: "View corporate event" };
  }
  if (typeof item === "string") {
    const trimmed = item.trim();
    if (!trimmed) return null;
    const asNum = parseInt(trimmed, 10);
    if (String(asNum) === trimmed && asNum > 0) {
      return { id: asNum, description: "View corporate event" };
    }
    const parsed = parseJsonString(trimmed);
    if (parsed !== undefined) {
      return eventFromUnknown(parsed);
    }
    return null;
  }
  if (!item || typeof item !== "object") return null;

  const obj = item as Record<string, unknown>;
  const idRaw =
    obj.id ?? obj.corporate_event_id ?? obj.corporate_events_id ?? obj.event_id;
  const id =
    typeof idRaw === "number"
      ? idRaw
      : typeof idRaw === "string"
        ? parseInt(idRaw, 10)
        : NaN;
  if (!Number.isFinite(id) || id <= 0) return null;

  return {
    ...(obj as ArticleRelatedCorporateEvent),
    id,
    description:
      typeof obj.description === "string" && obj.description.trim()
        ? obj.description.trim()
        : typeof obj.long_description === "string" && obj.long_description.trim()
          ? obj.long_description.trim().slice(0, 120)
          : "View corporate event",
    target:
      obj.target && typeof obj.target === "object"
        ? (obj.target as ArticleRelatedCorporateEvent["target"])
        : undefined,
  };
}

function flattenRelatedCorporateEventsInput(raw: unknown): unknown[] {
  if (raw == null || raw === "") return [];

  if (Array.isArray(raw)) {
    return raw.flatMap((entry) => {
      if (Array.isArray(entry)) return flattenRelatedCorporateEventsInput(entry);
      return [entry];
    });
  }

  if (typeof raw === "string") {
    const parsed = parseJsonString(raw);
    if (parsed !== undefined) return flattenRelatedCorporateEventsInput(parsed);
    return [];
  }

  if (typeof raw === "number") return [raw];
  if (typeof raw === "object") return [raw];
  return [];
}

/** Normalize Xano `Related_Corporate_Event` for article pages (array, JSON string, or id list). */
export function normalizeArticleRelatedCorporateEvents(
  raw: unknown
): ArticleRelatedCorporateEvent[] {
  const items = flattenRelatedCorporateEventsInput(raw);
  const seen = new Set<number>();
  const out: ArticleRelatedCorporateEvent[] = [];

  for (const item of items) {
    const event = eventFromUnknown(item);
    if (!event || seen.has(event.id)) continue;
    seen.add(event.id);
    out.push(event);
  }

  return out;
}

export function pickRelatedCorporateEventsFromArticlePayload(
  raw: Record<string, unknown>
): unknown {
  return (
    raw.Related_Corporate_Event ??
    raw.related_corporate_event ??
    raw.related_corporate_events
  );
}
