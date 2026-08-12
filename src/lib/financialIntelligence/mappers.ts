import type { FinRow } from "@/app/financials-tsx/types";
import type { SectorMedian } from "@/app/financials-tsx/types";
import {
  FI_BENCHMARK_METRICS,
  FI_BENCHMARK_SCORECARD_KEYS,
  computeDeltaVsAggregate,
  computeDistributionStats,
  computePercentile,
  computeRank,
  aggregatePeerMetric,
  collectPeerMetricValues,
  getMetricValueForDisplay,
  peerAggregate,
  toMillions,
} from "./calculations";
import {
  getMetricSourceType,
  getHeadlineMetricSourceType,
  isDefaultSourceTypes,
  isHeadlineSourceAllowed,
} from "./sourceTypes";
import type {
  FiBenchmarkMetricRow,
  FiCompanyRow,
  FiHeadlineMetric,
  FiMetricKey,
  FiMetricSourceType,
  FiPeerAggregateMode,
  FiSectorLookup,
} from "./types";
import { buildFiFieldCurrencyCodes, resolveFiMetricKeyDisplayCurrency } from "./fieldCurrency";

const BRAND_COLORS = [
  "#0370AA",
  "#0788C8",
  "#15A2EA",
  "#02527D",
  "#54C7FF",
  "#128A5C",
  "#7B5CD9",
];

export function parseSectorsId(raw: string | null | undefined): number[] {
  if (!raw) return [];
  return raw
    .replace(/[{}]/g, "")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isFinite(id) && id > 0);
}

export function resolveSectorNames(
  sectorsId: string,
  primarySectors: FiSectorLookup[],
  secondarySectors: FiSectorLookup[]
): { primary: string; secondary: string } {
  const ids = parseSectorsId(sectorsId);
  const primaryNames: string[] = [];
  const secondaryNames: string[] = [];

  for (const id of ids) {
    const primary = primarySectors.find((s) => s.id === id);
    if (primary) {
      primaryNames.push(primary.sector_name);
      continue;
    }
    const secondary = secondarySectors.find((s) => s.id === id);
    if (secondary) secondaryNames.push(secondary.sector_name);
  }

  return {
    primary: primaryNames[0] ?? secondaryNames[0] ?? "—",
    secondary: secondaryNames[0] ?? primaryNames[1] ?? "—",
  };
}

export function companyColor(companyId: number): string {
  return BRAND_COLORS[companyId % BRAND_COLORS.length];
}

export function mapCompanyToFinRow(
  row: FiCompanyRow,
  primarySectors: FiSectorLookup[],
  secondarySectors: FiSectorLookup[],
  preferredCurrencyCode = "USD"
): FinRow {
  const sectors = resolveSectorNames(row.sectors_id, primarySectors, secondarySectors);
  const revenue = toMillions(row.revenue_m_usd);
  const ebitda = toMillions(row.ebitda_m_usd);
  const ebit = toMillions(row.ebit_m_usd);
  const ev = toMillions(row.ev_usd);

  const ruleOf40 =
    row.rule_of_40 ??
    (row.rev_growth_pc != null && row.ebitda_margin != null
      ? row.rev_growth_pc + row.ebitda_margin
      : undefined);

  const evEbit =
    ev != null && ebit != null && ebit !== 0 ? ev / ebit : undefined;

  return {
    name: row.company_name,
    companyId: row.company_id,
    logo: row.company_logo,
    isManuallyAdded: Boolean(row.is_manually_added),
    primary: sectors.primary,
    secondary: sectors.secondary,
    country: row.location_country || "—",
    hq: row.location_country || "—",
    ownership: "Private",
    color: companyColor(row.company_id),
    fte: 0,
    revenue: revenue ?? 0,
    rev_growth: row.rev_growth_pc ?? 0,
    ebitda: ebitda ?? 0,
    ebitda_margin:
      row.ebitda_margin != null && Number.isFinite(row.ebitda_margin)
        ? row.ebitda_margin
        : (undefined as unknown as number),
    ebit: ebit ?? 0,
    ev: ev ?? 0,
    ev_revenue: row.ev_revenue_x ?? (revenue && ev ? ev / revenue : 0),
    ev_ebitda: row.ev_ebitda_x ?? (ebitda && ev ? ev / ebitda : 0),
    ev_ebit: evEbit ?? 0,
    rev_multiple: row.revenue_multiple ?? row.ev_revenue_x ?? 0,
    trend: [],
    rule_of_40: ruleOf40 ?? undefined,
    financial_year: formatCompanyReportingPeriod(row) ?? undefined,
    subscription_revenue_pc: row.subscription_revenue_pc ?? undefined,
    subscription_revenue_m: toMillions(row.subscription_revenue_m) ?? undefined,
    churn: row.churn_pc ?? undefined,
    grr: row.grr_pc ?? undefined,
    nrr: row.nrr ?? undefined,
    new_clients_rev: row.new_client_growth_pc ?? undefined,
    upsell: row.upsell_pc ?? undefined,
    cross_sell: row.cross_sell_pc ?? undefined,
    price_increase: row.price_increase_pc ?? undefined,
    revenue_expansion: row.rev_expansion_pc ?? undefined,
    num_clients: row.no_of_clients ?? undefined,
    rev_per_client: row.revenue_per_client ?? undefined,
    num_employees: row.no_employees ?? undefined,
    rev_per_employee: row.revenue_per_employee ?? undefined,
    fieldCurrencyCodes: buildFiFieldCurrencyCodes(row, preferredCurrencyCode),
  };
}

const SECTOR_AGGREGATE_METRIC: Partial<Record<keyof SectorMedian, FiMetricKey>> = {
  revenue: "revenue_m_usd",
  rev_growth: "rev_growth_pc",
  ebitda: "ebitda_m_usd",
  ebitda_margin: "ebitda_margin",
  ebit: "ebit_m_usd",
  ev: "ev_usd",
  ev_revenue: "ev_revenue_x",
  ev_ebitda: "ev_ebitda_x",
  rev_multiple: "revenue_multiple",
};

function aggregateEvEbit(
  peers: FiCompanyRow[],
  mode: FiPeerAggregateMode,
  allowedSources?: FiMetricSourceType[] | null
): number | null {
  const values = peers
    .map((peer) => {
      const ev = getMetricValueForDisplay(peer, "ev_usd", allowedSources);
      const ebit = getMetricValueForDisplay(peer, "ebit_m_usd", allowedSources);
      if (ev != null && ebit != null && ebit !== 0) return ev / ebit;
      return null;
    })
    .filter((v): v is number => v != null && Number.isFinite(v));
  return peerAggregate(values, mode);
}

export function buildPeerSectorMedian(
  peers: FiCompanyRow[],
  aggregateMode: FiPeerAggregateMode = "median",
  allowedSources?: FiMetricSourceType[] | null
): SectorMedian {
  const pick = (key: keyof SectorMedian) => {
    if (key === "fte") return 0;
    if (key === "ev_ebit") return aggregateEvEbit(peers, aggregateMode, allowedSources) ?? 0;
    const metricKey = SECTOR_AGGREGATE_METRIC[key];
    if (!metricKey) return 0;
    return aggregatePeerMetric(peers, metricKey, aggregateMode, allowedSources) ?? 0;
  };

  return {
    fte: pick("fte"),
    revenue: pick("revenue"),
    rev_growth: pick("rev_growth"),
    ebitda: pick("ebitda"),
    ebitda_margin: pick("ebitda_margin"),
    ebit: pick("ebit"),
    ev: pick("ev"),
    ev_revenue: pick("ev_revenue"),
    ev_ebit: pick("ev_ebit"),
    ev_ebitda: pick("ev_ebitda"),
    rev_multiple: pick("rev_multiple"),
  };
}

const AGGREGATE_FIN_ROW_NUMERIC_KEYS = [
  "fte",
  "revenue",
  "rev_growth",
  "ebitda",
  "ebitda_margin",
  "ebit",
  "ev",
  "ev_revenue",
  "ev_ebitda",
  "ev_ebit",
  "rev_multiple",
  "rule_of_40",
  "subscription_revenue_pc",
  "subscription_revenue_m",
  "churn",
  "grr",
  "nrr",
  "new_clients_rev",
  "upsell",
  "cross_sell",
  "price_increase",
  "revenue_expansion",
  "num_clients",
  "rev_per_client",
  "num_employees",
  "rev_per_employee",
] as const;

const FIN_ROW_AGGREGATE_METRIC: Partial<
  Record<(typeof AGGREGATE_FIN_ROW_NUMERIC_KEYS)[number], FiMetricKey>
> = {
  revenue: "revenue_m_usd",
  rev_growth: "rev_growth_pc",
  ebitda: "ebitda_m_usd",
  ebitda_margin: "ebitda_margin",
  ebit: "ebit_m_usd",
  ev: "ev_usd",
  ev_revenue: "ev_revenue_x",
  ev_ebitda: "ev_ebitda_x",
  rev_multiple: "revenue_multiple",
  rule_of_40: "rule_of_40",
  subscription_revenue_pc: "subscription_revenue_pc",
  subscription_revenue_m: "subscription_revenue_m",
  churn: "churn_pc",
  grr: "grr_pc",
  nrr: "nrr",
  new_clients_rev: "new_client_growth_pc",
  upsell: "upsell_pc",
  cross_sell: "cross_sell_pc",
  price_increase: "price_increase_pc",
  revenue_expansion: "rev_expansion_pc",
  num_clients: "no_of_clients",
  rev_per_client: "revenue_per_client",
  num_employees: "no_employees",
  rev_per_employee: "revenue_per_employee",
};

export function buildPeerAggregateFinRow(
  peers: FiCompanyRow[],
  _primarySectors: FiSectorLookup[],
  _secondarySectors: FiSectorLookup[],
  aggregateMode: FiPeerAggregateMode = "median",
  preferredCurrencyCode = "USD",
  allowedSources?: FiMetricSourceType[] | null
): FinRow {
  const aggregateLabel =
    aggregateMode === "mean" ? "Sector mean" : "Sector median";

  const pick = (key: (typeof AGGREGATE_FIN_ROW_NUMERIC_KEYS)[number]) => {
    if (key === "fte") return 0;
    if (key === "ev_ebit") return aggregateEvEbit(peers, aggregateMode, allowedSources) ?? 0;
    const metricKey = FIN_ROW_AGGREGATE_METRIC[key];
    if (!metricKey) return 0;
    return aggregatePeerMetric(peers, metricKey, aggregateMode, allowedSources) ?? 0;
  };

  const aggregated = Object.fromEntries(
    AGGREGATE_FIN_ROW_NUMERIC_KEYS.map((key) => [key, pick(key)])
  ) as Pick<FinRow, (typeof AGGREGATE_FIN_ROW_NUMERIC_KEYS)[number]>;

  return {
    name: aggregateLabel,
    primary: "Benchmark",
    secondary: `${peers.length} companies`,
    country: "",
    hq: "",
    ownership: "Private",
    color: "var(--ax-cyan-700)",
    trend: [],
    fieldCurrencyCodes: {
      revenue: preferredCurrencyCode,
      ebitda: preferredCurrencyCode,
      ebit: preferredCurrencyCode,
      ev: preferredCurrencyCode,
      subscription_revenue_m: preferredCurrencyCode,
      rev_per_employee: preferredCurrencyCode,
    },
    ...aggregated,
  };
}

export function buildBenchmarkMetricRows(
  target: FiCompanyRow,
  peers: FiCompanyRow[],
  aggregateMode: FiPeerAggregateMode = "median",
  preferredCurrencyCode = "USD",
  allowedSources?: FiMetricSourceType[] | null
): FiBenchmarkMetricRow[] {
  return FI_BENCHMARK_METRICS.filter((metric) =>
    FI_BENCHMARK_SCORECARD_KEYS.includes(metric.key)
  ).map((metric) => {
    const targetValue = getMetricValueForDisplay(target, metric.key, allowedSources);
    const peerValues = collectPeerMetricValues(peers, metric.key, allowedSources);
    const median = peerAggregate(peerValues, aggregateMode);
    const percentile =
      targetValue != null
        ? computePercentile(targetValue, peerValues, metric.higherIsBetter)
        : null;
    const deltaVsMedian =
      targetValue != null && median != null
        ? computeDeltaVsAggregate(targetValue, median, metric.format)
        : null;
    const rankResult =
      targetValue != null
        ? computeRank(targetValue, peerValues, metric.higherIsBetter)
        : null;
    const { min, max, q1, q3 } = computeDistributionStats(peerValues);

    return {
      key: metric.key,
      label: metric.label,
      targetValue,
      peerMedian: median,
      peerValues,
      min,
      max,
      q1,
      q3,
      percentile,
      rank: rankResult?.rank ?? null,
      rankTotal: rankResult?.total ?? null,
      deltaVsMedian,
      higherIsBetter: metric.higherIsBetter,
      directionHint: metric.directionHint,
      format: metric.format,
      targetSourceType: getMetricSourceType(target, metric.key),
      displayCurrencyCode:
        metric.format === "currency" || metric.format === "currency_k"
          ? resolveFiMetricKeyDisplayCurrency(target, metric.key, preferredCurrencyCode)
          : undefined,
    };
  });
}

export function buildHeadlineMetrics(
  target: FiCompanyRow,
  peers: FiCompanyRow[],
  aggregateMode: FiPeerAggregateMode = "median",
  preferredCurrencyCode = "USD",
  allowedSources?: FiMetricSourceType[] | null
): FiHeadlineMetric[] {
  const defs: Array<{
    key: "revenue" | "ebitda" | "rev_growth";
    metricKey: FiMetricKey;
    label: string;
    getValue: (row: FiCompanyRow) => number | null;
    format: "percent" | "currency";
    higherIsBetter: boolean;
  }> = [
    {
      key: "revenue",
      metricKey: "revenue_m_usd",
      label: "Revenue (m)",
      getValue: (row) => toMillions(row.revenue_m_usd),
      format: "currency",
      higherIsBetter: true,
    },
    {
      key: "ebitda",
      metricKey: "ebitda_m_usd",
      label: "EBITDA (m)",
      getValue: (row) => toMillions(row.ebitda_m_usd),
      format: "currency",
      higherIsBetter: true,
    },
    {
      key: "rev_growth",
      metricKey: "rev_growth_pc",
      label: "Revenue Growth",
      getValue: (row) => row.rev_growth_pc,
      format: "percent",
      higherIsBetter: true,
    },
  ];

  return defs.map((def) => {
    const targetValue =
      allowedSources &&
      !isDefaultSourceTypes(allowedSources) &&
      !isHeadlineSourceAllowed(target, def.key, allowedSources)
        ? null
        : def.getValue(target);
    const peerValues = peers
      .map((peer) =>
        allowedSources &&
        !isDefaultSourceTypes(allowedSources) &&
        !isHeadlineSourceAllowed(peer, def.key, allowedSources)
          ? null
          : def.getValue(peer)
      )
      .filter((v): v is number => v != null && Number.isFinite(v));
    const median = peerAggregate(peerValues, aggregateMode);
    const percentile =
      targetValue != null
        ? computePercentile(targetValue, peerValues, def.higherIsBetter)
        : null;
    const deltaVsMedian =
      targetValue != null && median != null
        ? computeDeltaVsAggregate(targetValue, median, def.format)
        : null;

    return {
      key: def.key,
      label: def.label,
      targetValue,
      targetSourceType: getHeadlineMetricSourceType(target, def.key),
      peerMedian: median,
      peerValues,
      percentile,
      deltaVsMedian,
      higherIsBetter: def.higherIsBetter,
      format: def.format,
      displayCurrencyCode:
        def.format === "currency"
          ? resolveFiMetricKeyDisplayCurrency(target, def.metricKey, preferredCurrencyCode)
          : undefined,
    };
  });
}

export function resolveFinancialYearValue(
  row: Pick<FiCompanyRow, "financial_year_value" | "financial_year">
): number {
  if (row.financial_year_value > 0) return row.financial_year_value;
  if (row.financial_year >= 1900 && row.financial_year <= 2100) return row.financial_year;
  return 0;
}

const FY_MONTH_ABBREV = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Company-profile style period label for latest estimate vintage (e.g. "DEC-2026"). */
export function formatFiMetricsPeriodDisplay(
  row: Pick<FiCompanyRow, "financial_year_value" | "financial_year" | "fy_ye_month">
): string | null {
  const year = resolveFinancialYearValue(row);
  if (year <= 0) return null;
  const month = row.fy_ye_month;
  if (month >= 1 && month <= 12) {
    return `${FY_MONTH_ABBREV[month - 1].toUpperCase()}-${year}`;
  }
  return `FY${year}`;
}

type FiReportingPeriodRow = Pick<
  FiCompanyRow,
  "financial_year_value" | "financial_year" | "fy_ye_month"
>;

export function formatReportingPeriod(
  yearValue: number,
  month?: number | null
): string | null {
  if (yearValue <= 0) return null;
  if (month != null && month >= 1 && month <= 12) {
    return `FY${yearValue} (${FY_MONTH_ABBREV[month - 1]})`;
  }
  return `FY${yearValue}`;
}

/** Canonical FY label for FI tables, tooltips, and mismatch flags. */
export function formatCompanyReportingPeriod(
  row: FiReportingPeriodRow,
  options?: { includeMonth?: boolean }
): string | null {
  const year = resolveFinancialYearValue(row);
  if (year <= 0) return null;
  const includeMonth =
    options?.includeMonth ??
    (row.fy_ye_month >= 1 && row.fy_ye_month <= 12);
  return formatReportingPeriod(year, includeMonth ? row.fy_ye_month : null);
}

export function hasFinancialPeriodMismatch(
  target: Pick<FiCompanyRow, "financial_year_value" | "financial_year" | "fy_ye_month">,
  peer: Pick<FiCompanyRow, "financial_year_value" | "financial_year" | "fy_ye_month">
): boolean {
  const targetYear = resolveFinancialYearValue(target);
  const peerYear = resolveFinancialYearValue(peer);
  if (targetYear <= 0 || peerYear <= 0) return false;
  if (targetYear !== peerYear) return true;

  const targetMonth = target.fy_ye_month;
  const peerMonth = peer.fy_ye_month;
  return targetMonth > 0 && peerMonth > 0 && targetMonth !== peerMonth;
}

/** Tooltip for peer vintage flag in the benchmark sidebar. */
export function yearMismatchTooltip(target: FiCompanyRow, peer: FiCompanyRow): string | null {
  if (!hasFinancialPeriodMismatch(target, peer)) return null;

  const peerYear = resolveFinancialYearValue(peer);
  const targetYear = resolveFinancialYearValue(target);
  const sameYear = peerYear > 0 && peerYear === targetYear;
  const peerLabel = formatCompanyReportingPeriod(peer, { includeMonth: sameYear });
  const targetLabel = formatCompanyReportingPeriod(target, { includeMonth: sameYear });
  if (!peerLabel || !targetLabel) return null;

  return `This company's latest financials are from ${peerLabel}; target uses ${targetLabel}.`;
}

export function vintageTooltip(
  peerYear: number,
  targetYear: number,
  peerMonth?: number | null,
  targetMonth?: number | null
): string {
  const sameYear = peerYear > 0 && peerYear === targetYear;
  const peerLabel =
    formatReportingPeriod(peerYear, sameYear ? peerMonth : null) ?? "unknown period";
  const targetLabel =
    formatReportingPeriod(targetYear, sameYear ? targetMonth : null) ?? "unknown period";

  if (peerYear < targetYear) {
    return `This company's latest financials are from ${peerLabel}; target uses ${targetLabel}.`;
  }
  if (peerYear > targetYear) {
    return `This company's latest financials are from ${peerLabel} (more recent than target ${targetLabel}).`;
  }
  if (
    peerMonth != null &&
    targetMonth != null &&
    peerMonth !== targetMonth
  ) {
    return `Year-end month differs: peer ${peerLabel} vs target ${targetLabel}.`;
  }
  return `Financial period: ${peerLabel} vs target ${targetLabel}.`;
}
