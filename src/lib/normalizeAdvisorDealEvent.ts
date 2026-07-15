import { getTargetCompany } from "@/components/corporate-events/corporateEventsTableUtils";
import type { AdvisorDealEvent } from "@/components/advisors/AdvisorDealsProfilePanel";
import {
  coerceSectorNameList,
  extractSectorId,
  resolveEventSectorEntries,
  type SectorLinkEntry,
} from "@/lib/sectorLinks";

function coerceUnknownToArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw === null || raw === undefined) return [];
  if (typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "[]") return [];
  try {
    const normalized = trimmed.replace(/\\u0022/g, '"');
    const parsed = JSON.parse(normalized) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function coerceDateString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  return undefined;
}

/** Parse `primary_sectors` from the flat `advisors_ce` payload. */
function parseAdvisorsCePrimarySectors(
  raw: unknown
): NonNullable<AdvisorDealEvent["primary_sectors"]> {
  const sectors: NonNullable<AdvisorDealEvent["primary_sectors"]> = [];
  for (const item of coerceUnknownToArray(raw)) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const name = String(rec.sector_name ?? rec.name ?? "").trim();
    if (!name) continue;
    sectors.push({
      id: extractSectorId(item),
      sector_name: name,
      sector_importance:
        String(rec.sector_importance ?? "Primary").trim() || "Primary",
      is_derived: Boolean(rec.is_derived),
    });
  }
  return sectors;
}

function parseTargetCompanies(
  raw: unknown
): NonNullable<AdvisorDealEvent["target_companies"]> {
  return coerceUnknownToArray(raw)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const rec = item as { id?: number; name?: string };
      const id = typeof rec.id === "number" && rec.id > 0 ? rec.id : null;
      const name = String(rec.name ?? "").trim();
      if (!id || !name) return null;
      return { id, name };
    })
    .filter((item): item is { id: number; name: string } => item !== null);
}

function sectorEntriesToPrimarySectors(
  entries: SectorLinkEntry[]
): NonNullable<AdvisorDealEvent["primary_sectors"]> {
  return entries.slice(0, 4).map((entry) => ({
    id: entry.id,
    sector_name: entry.name,
    sector_importance: entry.importance ?? "Primary",
    is_derived: false,
  }));
}

function resolveAdvisorDealSectors(event: Record<string, unknown>): SectorLinkEntry[] {
  const fromPrimarySectors = coerceSectorNameList(event.primary_sectors);
  if (fromPrimarySectors.length > 0) return fromPrimarySectors;

  const fromEventSectors = resolveEventSectorEntries(
    event.sectors,
    event.primary,
    "Primary"
  );
  if (fromEventSectors.length > 0) return fromEventSectors;

  const target = getTargetCompany(
    event as unknown as Parameters<typeof getTargetCompany>[0]
  );
  if (target) {
    const fromTargetSectors = resolveEventSectorEntries(
      target.sectors,
      target.primary,
      "Primary"
    );
    if (fromTargetSectors.length > 0) return fromTargetSectors;

    const fromTargetLegacy = coerceSectorNameList(
      target.primary_sectors ?? target._sectors_primary
    );
    if (fromTargetLegacy.length > 0) return fromTargetLegacy;
  }

  return [];
}

function resolveCompanyAdvised(event: Record<string, unknown>): {
  id: number | null;
  name: string | null;
  role: string | null;
} {
  const flatId =
    typeof event.company_advised_id === "number" ? event.company_advised_id : null;
  const flatName = String(event.company_advised_name ?? "").trim() || null;
  const flatRole = String(event.company_advised_role ?? "").trim() || null;
  if (flatId || flatName) {
    return { id: flatId, name: flatName, role: flatRole };
  }

  const targetCounterparty = (event._target_counterparty_of_corporate_events ??
    event.target_counterparty) as
    | {
        new_company_counterparty?: number;
        new_company?: { id?: number; name?: string };
        _new_company?: { id?: number; name?: string };
      }
    | undefined;

  const targetCompany =
    targetCounterparty?.new_company ?? targetCounterparty?._new_company;
  if (targetCompany?.name) {
    return {
      id:
        (typeof targetCompany.id === "number" ? targetCompany.id : null) ??
        (typeof targetCounterparty?.new_company_counterparty === "number"
          ? targetCounterparty.new_company_counterparty
          : null),
      name: String(targetCompany.name).trim() || null,
      role: flatRole ?? "Target",
    };
  }

  const related = event.related_to_individual_by_event_id as
    | {
        _counterparties?: {
          new_company_counterparty?: number;
          _new_company?: {
            id?: number;
            name?: string;
            _is_that_investor?: boolean;
          };
        };
      }
    | undefined;
  const relatedCompany = related?._counterparties?._new_company;
  if (relatedCompany?.name) {
    const isInvestor = Boolean(relatedCompany._is_that_investor);
    return {
      id:
        (typeof relatedCompany.id === "number" ? relatedCompany.id : null) ??
        (typeof related?._counterparties?.new_company_counterparty === "number"
          ? related._counterparties.new_company_counterparty
          : null),
      name: String(relatedCompany.name).trim() || null,
      role: isInvestor ? "Investor" : flatRole ?? "Counterparty",
    };
  }

  const counterparties = coerceUnknownToArray(
    event._other_counterparties_of_corporate_events
  );
  for (const item of counterparties) {
    const cp = item as {
      _new_company?: { id?: number; name?: string; _is_that_investor?: boolean };
    };
    const company = cp?._new_company;
    if (company?.name) {
      return {
        id: typeof company.id === "number" ? company.id : null,
        name: String(company.name).trim() || null,
        role: company._is_that_investor ? "Investor" : flatRole ?? "Counterparty",
      };
    }
  }

  return { id: null, name: null, role: flatRole };
}

function normalizeAdvisorIndividuals(
  raw: unknown
): AdvisorDealEvent["advisor_individuals"] {
  return coerceUnknownToArray(raw)
    .map((item) => {
      const rec = item as Record<string, unknown>;
      const nested = rec._individuals as
        | { id?: number; advisor_individuals?: string }
        | undefined;
      const id =
        (typeof rec.id === "number" ? rec.id : undefined) ??
        (typeof rec.individuals_id === "number" ? rec.individuals_id : undefined) ??
        (typeof nested?.id === "number" ? nested.id : undefined);
      const name = String(
        rec.name ?? rec.advisor_individuals ?? nested?.advisor_individuals ?? ""
      ).trim();
      if (!id || !name) return null;
      return { id, name };
    })
    .filter((item): item is { id: number; name: string } => item !== null);
}

function normalizeOtherAdvisors(
  raw: unknown
): AdvisorDealEvent["other_advisors"] {
  return coerceUnknownToArray(raw)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const rec = item as Record<string, unknown>;
      return {
        id: typeof rec.id === "number" ? rec.id : undefined,
        individuals_id: Array.isArray(rec.individuals_id)
          ? (rec.individuals_id as number[])
          : undefined,
        advisor_company_id:
          typeof rec.advisor_company_id === "number"
            ? rec.advisor_company_id
            : undefined,
        advisor_company_name:
          typeof rec.advisor_company_name === "string"
            ? rec.advisor_company_name
            : undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

/** Stable row key — one corporate event can appear multiple times (per advised side). */
export function getAdvisorDealRowKey(
  event: Pick<
    AdvisorDealEvent,
    "id" | "company_advised_id" | "company_advised_role"
  >,
  index: number
): string {
  return `${event.id}-${event.company_advised_id ?? "na"}-${event.company_advised_role ?? "na"}-${index}`;
}

/** Map flat `advisors_ce` rows (and legacy shapes) into `AdvisorDealEvent`. */
export function normalizeAdvisorDealEvent(event: unknown): AdvisorDealEvent {
  const raw = (event && typeof event === "object" ? event : {}) as Record<
    string,
    unknown
  >;

  const companyAdvised = resolveCompanyAdvised(raw);
  const primarySectors = parseAdvisorsCePrimarySectors(raw.primary_sectors);
  const sectorFallback =
    primarySectors.length > 0
      ? primarySectors
      : sectorEntriesToPrimarySectors(resolveAdvisorDealSectors(raw));

  const evData = raw.ev_data as
    | {
        enterprise_value_m?: string | number | null;
        _currency?: { Currency?: string };
        currency?: { Currency?: string };
      }
    | undefined;

  const enterpriseValueRaw =
    raw.enterprise_value_m ?? evData?.enterprise_value_m ?? null;
  const enterpriseValue =
    typeof enterpriseValueRaw === "number" || typeof enterpriseValueRaw === "string"
      ? enterpriseValueRaw
      : null;
  const currencyName =
    String(raw.currency_name ?? "").trim() ||
    evData?._currency?.Currency ||
    evData?.currency?.Currency ||
    null;

  return {
    id: typeof raw.id === "number" ? raw.id : 0,
    description:
      typeof raw.description === "string" ? raw.description : undefined,
    announcement_date: coerceDateString(raw.announcement_date),
    deal_type: typeof raw.deal_type === "string" ? raw.deal_type : undefined,
    company_advised_id: companyAdvised.id,
    company_advised_name: companyAdvised.name,
    company_advised_role: companyAdvised.role,
    target_companies: parseTargetCompanies(raw.target_companies),
    enterprise_value_m: enterpriseValue,
    currency_name: currencyName,
    ev_source:
      typeof raw.ev_source === "string" && raw.ev_source.trim()
        ? raw.ev_source.trim()
        : null,
    advisor_individuals: normalizeAdvisorIndividuals(
      raw.advisor_individuals ??
        raw.__related_to_corporate_event_advisors_individuals ??
        raw._related_to_corporate_event_individuals
    ),
    other_advisors: normalizeOtherAdvisors(raw.other_advisors),
    primary_sectors: sectorFallback,
  };
}

/** Best-effort sector id extraction for logging / diagnostics. */
export function advisorDealSectorHasId(sector: {
  id?: number;
  sector_name?: string;
}): boolean {
  return extractSectorId(sector) != null;
}
