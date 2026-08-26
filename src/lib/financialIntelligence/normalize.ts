import {
  extractAllSectorNamesByImportance,
  extractDefaultSectorNames,
  extractPrimarySectorIdsFromRaw,
  extractPrimarySectorsFromList,
  extractSectorIdsFromRaw,
  serializeSectorsId,
} from "./mappers";
import type { FiCompanyRow, FiPeersResponse } from "./types";
import { resolveFinancialMetricSourceType } from "./sourceTypes";
import { readEntityLogo, resolveCompanyLogoSrc } from "@/lib/companyLogo";
import { readPreferredCurrencyCode } from "./fieldCurrency";

export function safeFiniteNumber(value: unknown): number | null {
  if (value == null || value === "" || value === "$NaN" || value === "NaN") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function safeInt(value: unknown, fallback = 0): number {
  const n = safeFiniteNumber(value);
  return n != null ? Math.trunc(n) : fallback;
}

function normalizeFinancialYear(value: unknown): number {
  return safeInt(value, 0);
}

function normalizeFinancialYearValue(raw: Record<string, unknown>): number {
  const explicit = safeInt(raw.financial_year_value, 0);
  if (explicit >= 1900 && explicit <= 2100) return explicit;

  const legacy = safeInt(raw.financial_year, 0);
  if (legacy >= 1900 && legacy <= 2100) return legacy;

  return 0;
}

const FY_YE_MONTH_NAMES: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function normalizeFyYeMonth(value: unknown): number {
  if (typeof value === "string") {
    const named = FY_YE_MONTH_NAMES[value.trim().toLowerCase()];
    if (named) return named;
  }
  return safeInt(value, 0);
}

function normalizeLogo(value: unknown): string | null {
  return resolveCompanyLogoSrc(typeof value === "string" ? value : null);
}

function readCurrencyCode(raw: Record<string, unknown>, key: string): string | null {
  const value = raw[key];
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim().toUpperCase();
}

function readOptionalBoolean(raw: Record<string, unknown>, key: string): boolean | undefined {
  const value = raw[key];
  return typeof value === "boolean" ? value : undefined;
}

function readOptionalNativeCurrencyId(raw: Record<string, unknown>, key: string): number | null {
  const value = raw[key];
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

function readFiCurrencyMeta(raw: Record<string, unknown>): Pick<
  FiCompanyRow,
  | "revenue_currency_code"
  | "subscription_revenue_currency_code"
  | "ebitda_currency_code"
  | "ebit_currency_code"
  | "ev_currency_code"
  | "revenue_per_employee_currency_code"
  | "revenue_converted"
  | "subscription_revenue_converted"
  | "ebitda_converted"
  | "ebit_converted"
  | "ev_converted"
  | "revenue_per_employee_converted"
  | "revenue_native_currency_id"
  | "subscription_revenue_native_currency_id"
  | "ebitda_native_currency_id"
  | "ebit_native_currency_id"
  | "ev_native_currency_id"
  | "revenue_per_employee_native_currency_id"
> {
  return {
    revenue_currency_code: readCurrencyCode(raw, "revenue_currency_code"),
    subscription_revenue_currency_code: readCurrencyCode(
      raw,
      "subscription_revenue_currency_code"
    ),
    ebitda_currency_code: readCurrencyCode(raw, "ebitda_currency_code"),
    ebit_currency_code: readCurrencyCode(raw, "ebit_currency_code"),
    ev_currency_code: readCurrencyCode(raw, "ev_currency_code"),
    revenue_per_employee_currency_code: readCurrencyCode(
      raw,
      "revenue_per_employee_currency_code"
    ),
    revenue_converted: readOptionalBoolean(raw, "revenue_converted"),
    subscription_revenue_converted: readOptionalBoolean(raw, "subscription_revenue_converted"),
    ebitda_converted: readOptionalBoolean(raw, "ebitda_converted"),
    ebit_converted: readOptionalBoolean(raw, "ebit_converted"),
    ev_converted: readOptionalBoolean(raw, "ev_converted"),
    revenue_per_employee_converted: readOptionalBoolean(raw, "revenue_per_employee_converted"),
    revenue_native_currency_id: readOptionalNativeCurrencyId(raw, "revenue_native_currency_id"),
    subscription_revenue_native_currency_id: readOptionalNativeCurrencyId(
      raw,
      "subscription_revenue_native_currency_id"
    ),
    ebitda_native_currency_id: readOptionalNativeCurrencyId(raw, "ebitda_native_currency_id"),
    ebit_native_currency_id: readOptionalNativeCurrencyId(raw, "ebit_native_currency_id"),
    ev_native_currency_id: readOptionalNativeCurrencyId(raw, "ev_native_currency_id"),
    revenue_per_employee_native_currency_id: readOptionalNativeCurrencyId(
      raw,
      "revenue_per_employee_native_currency_id"
    ),
  };
}

function firstDefined<T>(...values: T[]): T | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

/** Preserve Front_End_Display labels for API source filtering; fall back to bucket names from codes. */
function resolveRowSourceLabel(
  raw: Record<string, unknown>,
  ...keys: string[]
): string | null {
  if (keys.length === 0) return null;
  const labelKeys = keys.slice(0, -1);
  const codeKey = keys[keys.length - 1];
  for (const key of labelKeys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const code = raw[codeKey];
  return resolveFinancialMetricSourceType(undefined, code);
}

/** Map `company_financial_metrics` (PascalCase) into FI snake_case before normalize. */
export function companyFinancialMetricsToRawFi(
  raw: Record<string, unknown>
): Record<string, unknown> {
  return {
    company_id: firstDefined(raw.new_company_id, raw.company_id, raw.id),
    financial_year: firstDefined(raw.Financial_Year, raw.financial_year),
    financial_year_value: firstDefined(raw.financial_year_text, raw.financial_year_value),
    fy_ye_month: firstDefined(raw.FY_YE_Month_Dec_default, raw.fy_ye_month),
    revenue_m_usd: firstDefined(raw.Revenue_m, raw.revenue_m_usd),
    revenue_source_type: firstDefined(raw.Revenue_source_label, raw.revenue_source_type),
    rev_growth_pc: firstDefined(raw.Rev_Growth_PC, raw.rev_growth_pc),
    rev_growth_source_type: firstDefined(raw.Rev_growth_source_label, raw.rev_growth_source_type),
    ebitda_margin: firstDefined(raw.EBITDA_margin, raw.ebitda_margin),
    ebitda_margin_source_type: firstDefined(
      raw.EBITDA_margin_source_label,
      raw.ebitda_margin_source_type
    ),
    ebitda_m_usd: firstDefined(raw.EBITDA_m, raw.ebitda_m_usd),
    ebitda_source_type: firstDefined(raw.EBITDA_source_label, raw.ebitda_source_type),
    ebit_m_usd: firstDefined(raw.EBIT_m, raw.ebit_m_usd),
    ebit_source_type: firstDefined(raw.EBIT_source_label, raw.ebit_source_type),
    ev_usd: firstDefined(raw.EV, raw.ev_usd),
    ev_source_type: firstDefined(raw.EV_source_label, raw.ev_source_type),
    rule_of_40: firstDefined(raw.Rule_of_40, raw.rule_of_40),
    rule_of_40_source_type: firstDefined(raw.Rule_of_40_source_label, raw.rule_of_40_source_type),
    subscription_revenue_pc: firstDefined(
      raw.Subscription_revenue_pc,
      raw.subscription_revenue_pc,
      raw.arr_pc
    ),
    subscription_revenue_m: firstDefined(
      raw.Subscription_revenue_m,
      raw.subscription_revenue_m,
      raw.arr_m,
      raw.arr_m_usd
    ),
    subscription_revenue_pc_source_type: firstDefined(
      raw.Subscription_revenue_source_label,
      raw.subscription_revenue_pc_source_type
    ),
    subscription_revenue_m_source_type: firstDefined(
      raw.Subscription_revenue_source_label,
      raw.subscription_revenue_m_source_type,
      raw.arr_source_type
    ),
    churn_pc: firstDefined(raw.Churn_pc, raw.churn_pc, raw.churn),
    churn_source_type: firstDefined(raw.Churn_source_label, raw.churn_source_type),
    grr_pc: firstDefined(raw.GRR_pc, raw.grr_pc, raw.grr, raw.GRR_pc),
    grr_source_type: firstDefined(raw.GRR_source_label, raw.grr_source_type),
    nrr: firstDefined(raw.NRR, raw.nrr),
    nrr_source_type: firstDefined(raw.NRR_source_label, raw.nrr_source_type),
    new_client_growth_pc: firstDefined(raw.New_client_growth_pc, raw.new_client_growth_pc),
    new_client_growth_source_type: firstDefined(
      raw.New_client_growth_source_label,
      raw.new_client_growth_source_type
    ),
    upsell_pc: firstDefined(raw.Upsell_pc, raw.upsell_pc),
    upsell_source_type: firstDefined(raw.Upsell_source_label, raw.upsell_source_type),
    cross_sell_pc: firstDefined(raw.Cross_sell_pc, raw.cross_sell_pc),
    cross_sell_source_type: firstDefined(raw.Cross_sell_source_label, raw.cross_sell_source_type),
    price_increase_pc: firstDefined(raw.Price_increase_pc, raw.price_increase_pc),
    price_increase_source_type: firstDefined(
      raw.Price_increase_source_label,
      raw.price_increase_source_type
    ),
    rev_expansion_pc: firstDefined(raw.Rev_expansion_pc, raw.rev_expansion_pc),
    rev_expansion_source_type: firstDefined(
      raw.Rev_expansion_source_label,
      raw.rev_expansion_source_type
    ),
    no_of_clients: firstDefined(raw.No_of_Clients, raw.no_of_clients, raw.no_clients),
    no_of_clients_source_type: firstDefined(
      raw.No_of_Clients_source_label,
      raw.no_of_clients_source_type
    ),
    revenue_per_client: firstDefined(raw.Rev_per_client, raw.revenue_per_client, raw.rev_per_client),
    revenue_per_client_source_type: firstDefined(
      raw.Rev_per_client_source_label,
      raw.revenue_per_client_source_type
    ),
    no_employees: firstDefined(raw.No_Employees, raw.no_employees),
    no_employees_source_type: firstDefined(
      raw.No_Employees_source_label,
      raw.no_employees_source_type
    ),
    revenue_per_employee: firstDefined(raw.Revenue_per_employee, raw.revenue_per_employee),
    revenue_per_employee_source_type: firstDefined(
      raw.Revenue_per_employee_source_label,
      raw.revenue_per_employee_source_type
    ),
    revenue_multiple: firstDefined(raw.Revenue_multiple, raw.revenue_multiple),
    revenue_multiple_source_type: firstDefined(
      raw.Revenue_multiple_source_label,
      raw.revenue_multiple_source_type
    ),
  };
}

/** Fill null/empty target fields from a secondary row (e.g. company profile metrics). */
export function mergeFiCompanyRows(primary: FiCompanyRow, overlay: FiCompanyRow): FiCompanyRow {
  const merged: FiCompanyRow = { ...primary };
  const skipKeys = new Set<keyof FiCompanyRow>([
    "company_id",
    "company_name",
    "company_logo",
  ]);

  (Object.keys(overlay) as Array<keyof FiCompanyRow>).forEach((key) => {
    if (skipKeys.has(key)) return;
    const current = merged[key];
    const next = overlay[key];
    if (current != null && current !== "") return;
    if (next == null || next === "") return;
    merged[key] = next as never;
  });

  return merged;
}

export function normalizeCompanyRow(
  raw: Record<string, unknown>,
  fallbackCompanyId?: number
): FiCompanyRow {
  const company_id = safeInt(
    raw.company_id ?? raw.id ?? raw.new_company_id ?? raw.target_company_id,
    fallbackCompanyId ?? 0
  );

  const revenue_m_usd = safeFiniteNumber(raw.revenue_m_usd ?? raw.Revenue_m);
  const no_of_clients = safeFiniteNumber(
    raw.no_of_clients ?? raw.no_clients ?? raw.No_of_Clients
  );
  const revenue_per_employee = safeFiniteNumber(
    raw.revenue_per_employee ?? raw.Revenue_per_employee
  );

  let revenue_per_client = safeFiniteNumber(
    raw.revenue_per_client ?? raw.rev_per_client ?? raw.Rev_per_client
  );
  if (
    revenue_per_client == null &&
    revenue_m_usd != null &&
    no_of_clients != null &&
    no_of_clients > 0
  ) {
    revenue_per_client = (revenue_m_usd * 1_000_000) / no_of_clients;
  }

  let no_employees = safeFiniteNumber(raw.no_employees ?? raw.No_Employees);
  if (
    no_employees == null &&
    revenue_m_usd != null &&
    revenue_per_employee != null &&
    revenue_per_employee > 0
  ) {
    no_employees = Math.round((revenue_m_usd * 1_000_000) / revenue_per_employee);
  }

  return {
    company_id,
    company_name: String(raw.company_name ?? raw.name ?? ""),
    company_logo:
      readEntityLogo(raw) ??
      normalizeLogo(raw.company_logo ?? raw.linkedin_logo),
    sectors_id: serializeSectorsId(extractSectorIdsFromRaw(raw)),
    ...(() => {
      const fromTargetApi = extractPrimarySectorsFromList(raw.primary_sectors);
      const sectorNames = extractDefaultSectorNames(raw);
      if (fromTargetApi.ids.length > 0) {
        return {
          primary_sector_name: fromTargetApi.names[0],
          primary_sector_names: fromTargetApi.names,
          primary_sector_ids: fromTargetApi.ids,
          ...(sectorNames.secondary ? { secondary_sector_name: sectorNames.secondary } : {}),
        };
      }

      const primarySectorIds = extractPrimarySectorIdsFromRaw(raw);
      const allSectorNames = extractAllSectorNamesByImportance(raw);
      return {
        ...(sectorNames.primary ? { primary_sector_name: sectorNames.primary } : {}),
        ...(allSectorNames.primary.length > 0 ? { primary_sector_names: allSectorNames.primary } : {}),
        ...(primarySectorIds.length > 0 ? { primary_sector_ids: primarySectorIds } : {}),
        ...(sectorNames.secondary ? { secondary_sector_name: sectorNames.secondary } : {}),
      };
    })(),
    location_country: String(raw.location_country ?? ""),
    location_region: String(raw.location_region ?? ""),
    financial_year: normalizeFinancialYear(raw.financial_year ?? raw.Financial_Year),
    financial_year_value: normalizeFinancialYearValue({
      ...raw,
      financial_year_value: firstDefined(raw.financial_year_value, raw.financial_year_text),
    }),
    fy_ye_month: normalizeFyYeMonth(raw.fy_ye_month ?? raw.FY_YE_Month_Dec_default),
    revenue_m_usd,
    rev_growth_pc: safeFiniteNumber(raw.rev_growth_pc ?? raw.Rev_Growth_PC),
    new_client_growth_pc: safeFiniteNumber(
      raw.new_client_growth_pc ?? raw.New_client_growth_pc
    ),
    ebitda_margin: safeFiniteNumber(raw.ebitda_margin ?? raw.EBITDA_margin),
    ebitda_m_usd: safeFiniteNumber(raw.ebitda_m_usd ?? raw.EBITDA_m),
    ebit_m_usd: safeFiniteNumber(raw.ebit_m_usd ?? raw.EBIT_m),
    rule_of_40: safeFiniteNumber(raw.rule_of_40 ?? raw.Rule_of_40),
    subscription_revenue_pc: safeFiniteNumber(
      raw.subscription_revenue_pc ?? raw.Subscription_revenue_pc ?? raw.arr_pc
    ),
    subscription_revenue_m: safeFiniteNumber(
      raw.subscription_revenue_m ??
        raw.Subscription_revenue_m ??
        raw.arr_m ??
        raw.arr_m_usd
    ),
    nrr: safeFiniteNumber(raw.nrr ?? raw.NRR),
    churn_pc: safeFiniteNumber(raw.churn_pc ?? raw.churn ?? raw.Churn_pc),
    grr_pc: safeFiniteNumber(raw.grr_pc ?? raw.grr ?? raw.GRR_pc),
    upsell_pc: safeFiniteNumber(raw.upsell_pc ?? raw.Upsell_pc),
    cross_sell_pc: safeFiniteNumber(raw.cross_sell_pc ?? raw.Cross_sell_pc),
    price_increase_pc: safeFiniteNumber(raw.price_increase_pc ?? raw.Price_increase_pc),
    rev_expansion_pc: safeFiniteNumber(raw.rev_expansion_pc ?? raw.Rev_expansion_pc),
    ev_usd: safeFiniteNumber(raw.ev_usd ?? raw.EV),
    no_of_clients,
    revenue_per_client,
    no_employees,
    revenue_per_employee,
    revenue_multiple: safeFiniteNumber(raw.revenue_multiple ?? raw.Revenue_multiple),
    ev_revenue_x: safeFiniteNumber(raw.ev_revenue_x),
    ev_ebitda_x: safeFiniteNumber(raw.ev_ebitda_x),
    revenue_source_type: resolveRowSourceLabel(
      raw,
      "revenue_source_type",
      "Revenue_source_label",
      "Rev_source"
    ),
    rev_growth_source_type: resolveRowSourceLabel(
      raw,
      "rev_growth_source_type",
      "Rev_growth_source_label",
      "Rev_Growth_source"
    ),
    new_client_growth_source_type: resolveRowSourceLabel(
      raw,
      "new_client_growth_source_type",
      "New_client_growth_source_label",
      "New_Client_Growth_Source"
    ),
    ebitda_source_type: resolveRowSourceLabel(
      raw,
      "ebitda_source_type",
      "EBITDA_source_label",
      "EBITDA_source"
    ),
    ebitda_margin_source_type: resolveRowSourceLabel(
      raw,
      "ebitda_margin_source_type",
      "EBITDA_margin_source_label",
      "EBITDA_margin_source"
    ),
    ebit_source_type: resolveRowSourceLabel(
      raw,
      "ebit_source_type",
      "EBIT_source_label",
      "EBIT_source"
    ),
    ev_source_type: resolveRowSourceLabel(raw, "ev_source_type", "EV_source_label", "EV_source"),
    no_of_clients_source_type: resolveRowSourceLabel(
      raw,
      "no_of_clients_source_type",
      "No_of_Clients_source_label",
      "No_Clients_source"
    ),
    revenue_per_client_source_type: resolveRowSourceLabel(
      raw,
      "revenue_per_client_source_type",
      "Rev_per_client_source_label",
      "Rev_per_client_source"
    ),
    no_employees_source_type: resolveRowSourceLabel(
      raw,
      "no_employees_source_type",
      "No_Employees_source_label",
      "No_Employees_source"
    ),
    revenue_per_employee_source_type: resolveRowSourceLabel(
      raw,
      "revenue_per_employee_source_type",
      "Revenue_per_employee_source_label",
      "Rev_per_employee_source"
    ),
    rule_of_40_source_type: resolveRowSourceLabel(
      raw,
      "rule_of_40_source_type",
      "Rule_of_40_source_label",
      "Rule_of_40_source"
    ),
    subscription_revenue_pc_source_type: resolveRowSourceLabel(
      raw,
      "subscription_revenue_pc_source_type",
      "Subscription_revenue_source_label",
      "Subscription_revenue_source"
    ),
    subscription_revenue_m_source_type:
      resolveRowSourceLabel(
        raw,
        "subscription_revenue_m_source_type",
        "Subscription_revenue_source_label",
        "Subscription_revenue_source"
      ) ?? resolveFinancialMetricSourceType(raw.arr_source_type),
    nrr_source_type: resolveRowSourceLabel(raw, "nrr_source_type", "NRR_source_label", "NRR_source"),
    churn_source_type: resolveRowSourceLabel(
      raw,
      "churn_source_type",
      "Churn_source_label",
      "Churn_Source"
    ),
    grr_source_type: resolveRowSourceLabel(raw, "grr_source_type", "GRR_source_label", "GRR_source"),
    upsell_source_type: resolveRowSourceLabel(
      raw,
      "upsell_source_type",
      "Upsell_source_label",
      "Upsell_source"
    ),
    cross_sell_source_type: resolveRowSourceLabel(
      raw,
      "cross_sell_source_type",
      "Cross_sell_source_label",
      "Cross_sell_source"
    ),
    price_increase_source_type: resolveRowSourceLabel(
      raw,
      "price_increase_source_type",
      "Price_increase_source_label",
      "Price_increase_source"
    ),
    rev_expansion_source_type: resolveRowSourceLabel(
      raw,
      "rev_expansion_source_type",
      "Rev_expansion_source_label",
      "Rev_expansion_source"
    ),
    revenue_multiple_source_type: resolveRowSourceLabel(
      raw,
      "revenue_multiple_source_type",
      "Revenue_multiple_source_label",
      "Rev_x_source"
    ),
    url:
      typeof raw.url === "string" && raw.url.trim()
        ? raw.url.trim()
        : typeof raw.website === "string" && raw.website.trim()
          ? raw.website.trim()
          : null,
    is_manually_added: Boolean(
      raw.is_manually_added ?? raw.manually_added ?? raw.is_added
    ),
    ...readFiCurrencyMeta(raw),
  };
}

/** Mark peers the user added via company_ids_include (or API flag). */
export function annotateManuallyAddedPeers(
  peers: FiCompanyRow[],
  manuallyAddedIds: number[]
): FiCompanyRow[] {
  const addedIds = new Set(
    manuallyAddedIds.filter((id) => Number.isFinite(id) && id > 0)
  );
  if (addedIds.size === 0) return peers;

  return peers.map((peer) => ({
    ...peer,
    is_manually_added: Boolean(peer.is_manually_added) || addedIds.has(peer.company_id),
  }));
}

export function unwrapApiPayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const obj = payload as Record<string, unknown>;
  for (const key of ["data", "payload"] as const) {
    const nested = obj[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }
  }
  return obj;
}

function mergeTargetEnvelopeFields(
  row: Record<string, unknown>,
  envelope: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...row };
  if (!Array.isArray(merged.primary_sectors) && Array.isArray(envelope.primary_sectors)) {
    merged.primary_sectors = envelope.primary_sectors;
  }
  if (!Array.isArray(merged.secondary_sectors) && Array.isArray(envelope.secondary_sectors)) {
    merged.secondary_sectors = envelope.secondary_sectors;
  }
  return merged;
}

/** Resolve target row from varying Xano response shapes. */
export function extractTargetRow(
  payload: unknown,
  requestedCompanyId: number
): Record<string, unknown> {
  if (Array.isArray(payload) && payload.length > 0) {
    return payload[0] as Record<string, unknown>;
  }

  const obj = unwrapApiPayload(payload);

  if (obj.found === false) {
    return mergeTargetEnvelopeFields({ company_id: requestedCompanyId }, obj);
  }

  for (const key of ["target", "company", "result", "item", "record"] as const) {
    const nested = obj[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return mergeTargetEnvelopeFields(nested as Record<string, unknown>, obj);
    }
  }

  // Some target endpoints return the same envelope as peers
  if (Array.isArray(obj.peers) && obj.peers.length > 0) {
    const peers = obj.peers as Record<string, unknown>[];
    const match = peers.find(
      (peer) =>
        safeInt(peer.company_id ?? peer.id ?? peer.new_company_id, 0) === requestedCompanyId
    );
    return mergeTargetEnvelopeFields(match ?? peers[0], obj);
  }

  if (
    obj.company_id != null ||
    obj.id != null ||
    obj.company_name ||
    obj.name ||
    obj.revenue_m_usd != null
  ) {
    return obj;
  }

  return mergeTargetEnvelopeFields({ company_id: requestedCompanyId }, obj);
}

export function normalizePeersResponse(
  payload: unknown,
  fallbackPreferredCurrencyCode = "USD"
): FiPeersResponse {
  if (Array.isArray(payload)) {
    const peers = payload.map((row) =>
      normalizeCompanyRow(row as Record<string, unknown>)
    );
    return {
      peers,
      total_peers: peers.length,
      is_default_mode: true,
      target_logo: null,
      preferred_currency_code: fallbackPreferredCurrencyCode,
    };
  }

  const obj = unwrapApiPayload(payload);
  const preferredCurrencyCode = readPreferredCurrencyCode(
    obj,
    fallbackPreferredCurrencyCode
  );
  const peerRows = Array.isArray(obj.peers)
    ? obj.peers
    : Array.isArray(obj.items)
      ? obj.items
      : [];

  const peers = peerRows.map((row) =>
    normalizeCompanyRow(row as Record<string, unknown>)
  );

  const preferredCurrencyIdRaw = obj.preferred_currency_id;
  const preferredCurrencyId =
    preferredCurrencyIdRaw != null && preferredCurrencyIdRaw !== ""
      ? safeInt(preferredCurrencyIdRaw, 0) || undefined
      : undefined;

  return {
    peers,
    total_peers: Number(obj.total_peers ?? peers.length),
    is_default_mode: Boolean(obj.is_default_mode ?? false),
    target_logo: normalizeLogo(obj.target_logo),
    preferred_currency_id: preferredCurrencyId,
    preferred_currency_code: preferredCurrencyCode,
  };
}

export async function readApiError(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  return text ? `${response.status} ${response.statusText} — ${text}` : `${response.status} ${response.statusText}`;
}
