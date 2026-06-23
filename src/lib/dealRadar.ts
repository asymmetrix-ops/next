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
  hqCountryIso2: string | null;
  transactionStatus: string;
  primarySectors: DealRadarSector[];
  latestContent: DealRadarLatestContent | null;
};

export const COUNTRY_FLAG_CDN_BASE =
  "https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/4x3";

export const INLINE_COUNTRY_FLAG_CLASS =
  "ml-1 inline-block h-3 w-4 shrink-0 rounded-sm object-cover ring-1 ring-black/10 cursor-default align-text-bottom";

export const getCountryFlagUrl = (
  iso2: string | null | undefined
): string | null => {
  const normalized = String(iso2 || "")
    .trim()
    .toLowerCase();
  if (!/^[a-z]{2}$/.test(normalized)) return null;
  return `${COUNTRY_FLAG_CDN_BASE}/${normalized}.svg`;
};

const regionDisplayNames =
  typeof Intl !== "undefined"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

export const getCountryDisplayName = (
  iso2: string | null | undefined
): string | null => {
  const normalized = String(iso2 || "")
    .trim()
    .toLowerCase();
  if (!/^[a-z]{2}$/.test(normalized)) return null;
  try {
    const name = regionDisplayNames?.of(normalized.toUpperCase());
    return name && name !== normalized.toUpperCase() ? name : null;
  } catch {
    return null;
  }
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

const normalizeIso2 = (value: unknown): string | null => {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const normalized = text.toLowerCase();
  return /^[a-z]{2}$/.test(normalized) ? normalized : null;
};

export const readHqCountryIso2 = (raw: Record<string, unknown>): string | null => {
  const directKeys = [
    "hq_country_iso2",
    "hqCountryIso2",
    "HQ_country_iso2",
    "hq_country_iso_2",
    "country_iso2",
    "countryIso2",
  ];

  for (const key of directKeys) {
    const iso2 = normalizeIso2(raw[key]);
    if (iso2) return iso2;
  }

  const fallbackKeys = ["hq_country", "hqCountry", "HQ_country", "country"];
  for (const key of fallbackKeys) {
    const iso2 = normalizeIso2(raw[key]);
    if (iso2) return iso2;
  }

  const locations = raw._locations ?? raw.locations;
  if (locations && typeof locations === "object") {
    const locationRecord = locations as Record<string, unknown>;
    const iso2 = normalizeIso2(
      locationRecord.Country ?? locationRecord.country
    );
    if (iso2) return iso2;
  }

  return null;
};

export const applyHqCountryIso2ToDealRadarItems = (
  items: DealRadarItem[],
  isoByCompanyId: Map<number, string | null>
): DealRadarItem[] => {
  if (isoByCompanyId.size === 0) return items;

  return items.map((item) => {
    if (item.hqCountryIso2) return item;
    const iso2 = isoByCompanyId.get(item.companyId);
    return iso2 ? { ...item, hqCountryIso2: iso2 } : item;
  });
};

export const mapDealRadarItem = (raw: Record<string, unknown>): DealRadarItem => {
  const companyId = Number(raw.company_id);
  const primarySectorsRaw =
    raw.primary_sectors ?? raw.Primary_sectors ?? raw.primarySectors;

  return {
    companyId: Number.isFinite(companyId) ? companyId : 0,
    companyName: String(raw.name || "").trim(),
    hqCountryIso2: readHqCountryIso2(raw),
    transactionStatus: String(raw.transaction_status || "").trim(),
    primarySectors: mapDealRadarPrimarySectors(primarySectorsRaw),
    latestContent: mapDealRadarLatestContent(
      raw.latest_content ?? raw.latestContent
    ),
  };
};
