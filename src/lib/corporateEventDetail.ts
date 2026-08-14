import type {
  CorporateEventAdvisor,
  CorporateEventCounterparty,
  CorporateEventDetail,
  CorporateEventDetailResponse,
  PreviousCorporateEvent,
  PrimarySector,
  SubSector,
} from "@/types/corporateEvents";

const EMPTY_CORPORATE_EVENT_DETAIL: CorporateEventDetailResponse = {
  Event: [],
  Event_counterparties: [],
  Event_advisors: [],
  Primary_sectors: [],
  "Sub-sectors": [],
  Previous_Corporate_Events: [],
};

function safeParseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return (value as T) ?? fallback;
  try {
    return (JSON.parse(value) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeToArray<T>(value: unknown): T[] {
  const parsed = safeParseJson(value, value);
  if (Array.isArray(parsed)) {
    return parsed.filter((item) => item != null) as T[];
  }
  if (parsed != null && typeof parsed === "object") {
    return [parsed as T];
  }
  return [];
}

function isXanoScriptError(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return (
    value.startsWith("[Line") ||
    value.includes("Cannot create property") ||
    value.includes("ERROR_CODE")
  );
}

function looksLikeCorporateEventDetail(
  record: Record<string, unknown>
): boolean {
  return (
    typeof record.id === "number" &&
    (typeof record.description === "string" ||
      typeof record.deal_type === "string" ||
      typeof record.announcement_date === "string")
  );
}

function normalizeEventField(record: Record<string, unknown>): CorporateEventDetail[] {
  const fromEventKey = normalizeToArray<CorporateEventDetail>(
    record.Event ?? record.event ?? record.corporate_event
  );
  if (fromEventKey.length > 0) {
    return fromEventKey;
  }

  if (looksLikeCorporateEventDetail(record)) {
    return [record as unknown as CorporateEventDetail];
  }

  return [];
}

function buildDetailFromRecord(
  record: Record<string, unknown>
): CorporateEventDetailResponse {
  return {
    Event: normalizeEventField(record),
    Event_counterparties: normalizeToArray<CorporateEventCounterparty>(
      record.Event_counterparties ?? record.event_counterparties
    ),
    Event_advisors: normalizeToArray<CorporateEventAdvisor>(
      record.Event_advisors ?? record.event_advisors
    ),
    Primary_sectors: normalizeToArray<PrimarySector>(
      record.Primary_sectors ?? record.primary_sectors
    ),
    "Sub-sectors": normalizeToArray<SubSector>(
      record["Sub-sectors"] ?? record.sub_sectors
    ),
    Previous_Corporate_Events: normalizeToArray<PreviousCorporateEvent>(
      record.Previous_Corporate_Events ?? record.previous_corporate_events
    ),
  };
}

function unwrapResult1Record(
  result1: unknown
): Record<string, unknown> | null {
  const parsed = safeParseJson(result1, result1);

  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      const record = unwrapResult1Record(entry);
      if (record) return record;
    }
    return null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  return parsed as Record<string, unknown>;
}

function extractDetailRecord(data: Record<string, unknown>): Record<string, unknown> | null {
  if (data.Event != null || looksLikeCorporateEventDetail(data)) {
    return data;
  }

  if (data.result1 != null) {
    const fromResult1 = unwrapResult1Record(data.result1);
    if (fromResult1) {
      return fromResult1;
    }
  }

  if (
    "Event_counterparties" in data ||
    "Event_advisors" in data ||
    "Primary_sectors" in data ||
    "Sub-sectors" in data
  ) {
    return data;
  }

  return null;
}

export function normalizeCorporateEventDetailResponse(
  data: unknown
): CorporateEventDetailResponse {
  if (!data || typeof data !== "object") {
    return EMPTY_CORPORATE_EVENT_DETAIL;
  }

  const root = data as Record<string, unknown>;

  if (isXanoScriptError(root.result1)) {
    return EMPTY_CORPORATE_EVENT_DETAIL;
  }

  const record = extractDetailRecord(root);
  if (!record) {
    return EMPTY_CORPORATE_EVENT_DETAIL;
  }

  return buildDetailFromRecord(record);
}

export function getCorporateEventDetailApiError(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const result1 = (data as Record<string, unknown>).result1;
  if (isXanoScriptError(result1)) return result1;
  return null;
}

export function hasCorporateEventDetailPayload(
  data: CorporateEventDetailResponse
): boolean {
  return Array.isArray(data.Event) && data.Event.length > 0;
}
