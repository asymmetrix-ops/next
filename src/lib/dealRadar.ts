export type DealRadarSector = {
  id: number;
  name: string;
};

export type DealRadarLatestContent = {
  id: number;
  headline: string;
  contentType: string;
  publicationDate: string;
};

export type DealRadarItem = {
  companyId: number;
  companyName: string;
  transactionStatus: string;
  primarySectors: DealRadarSector[];
  latestContent: DealRadarLatestContent | null;
};

const normalizeSectorName = (raw: string): string =>
  raw
    .trim()
    .replace(/\\u0022/g, '"')
    .replace(/^["']+|["']+$/g, "")
    .trim();

const coerceToSectorArray = (value: unknown): unknown[] => {
  if (value == null) return [];
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === "object") {
        return Object.values(parsed as Record<string, unknown>);
      }
    } catch {
      return trimmed
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    }
    return [];
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>);
  }

  return [];
};

const readSectorName = (sector: unknown): string => {
  if (typeof sector === "string") {
    return normalizeSectorName(sector);
  }

  if (!sector || typeof sector !== "object") {
    return "";
  }

  const record = sector as Record<string, unknown>;
  const nameKeys = [
    "name",
    "sector_name",
    "sectorName",
    "Sector_name",
    "label",
  ];

  for (const key of nameKeys) {
    const candidate = record[key];
    if (typeof candidate === "string") {
      const name = normalizeSectorName(candidate);
      if (name) return name;
    }
  }

  return "";
};

const readSectorId = (sector: unknown): number => {
  if (!sector || typeof sector !== "object") {
    return 0;
  }

  const record = sector as Record<string, unknown>;
  const idKeys = ["id", "sector_id", "sectors_id"];

  for (const key of idKeys) {
    const parsed = Number(record[key]);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 0;
};

export const mapDealRadarPrimarySectors = (value: unknown): DealRadarSector[] => {
  const seen = new Set<string>();
  const sectors: DealRadarSector[] = [];

  for (const entry of coerceToSectorArray(value)) {
    const name = readSectorName(entry);
    if (!name) continue;

    const id = readSectorId(entry);
    const dedupeKey = `${id}:${name.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    sectors.push({ id, name });
  }

  return sectors;
};

const mapDealRadarLatestContent = (
  value: unknown
): DealRadarLatestContent | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = Number(record.id);
  const headline = String(record.headline || record.Headline || "").trim();
  const contentType = String(
    record.content_type || record.Content_Type || record.contentType || ""
  ).trim();
  const publicationDate = String(
    record.publication_date ||
      record.Publication_Date ||
      record.publicationDate ||
      ""
  ).trim();

  if (!Number.isFinite(id) || id <= 0 || !headline) {
    return null;
  }

  return {
    id,
    headline,
    contentType,
    publicationDate,
  };
};

/** Append a page of results without duplicate companies (by companyId). */
export const appendDealRadarItems = (
  existing: DealRadarItem[],
  incoming: DealRadarItem[]
): DealRadarItem[] => {
  if (incoming.length === 0) return existing;

  const seen = new Set(existing.map((item) => item.companyId));
  const uniqueIncoming = incoming.filter((item) => {
    if (!item.companyId || seen.has(item.companyId)) return false;
    seen.add(item.companyId);
    return true;
  });

  return uniqueIncoming.length > 0 ? [...existing, ...uniqueIncoming] : existing;
};

export const mapDealRadarItem = (raw: Record<string, unknown>): DealRadarItem => {
  const companyId = Number(raw.company_id);
  const primarySectorsRaw =
    raw.primary_sectors ?? raw.Primary_sectors ?? raw.primarySectors;

  return {
    companyId: Number.isFinite(companyId) ? companyId : 0,
    companyName: String(raw.name || "").trim(),
    transactionStatus: String(raw.transaction_status || "").trim(),
    primarySectors: mapDealRadarPrimarySectors(primarySectorsRaw),
    latestContent: mapDealRadarLatestContent(
      raw.latest_content ?? raw.latestContent
    ),
  };
};
