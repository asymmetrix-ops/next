import type {
  FilterBarState,
  FilterCategory,
  FilterDef,
} from "@/components/companies/CompaniesFilterBar";
import {
  DEFAULT_TRANSACTION_COMPS_QUERY,
  type RangeValue,
  type TransactionCompsOption,
  type TransactionCompsQuery,
} from "./transactionCompsTypes";

export const TRANSACTION_COMPS_FILTER_CATEGORIES: FilterCategory[] = [
  { id: "default", name: "Default" },
  { id: "overview", name: "Overview" },
  { id: "deal_details", name: "Deal details" },
  { id: "financial_metrics", name: "Financial metrics" },
];

/** Completed-deal types only: every transaction comp is a completed deal. */
/** EV source values users can filter by (proprietary sources are not offered). */
export const TRANSACTION_COMPS_EV_SOURCES = [
  "Public - official document",
  "Public - reported in media",
  "Public - derived from official document with analyst judgment",
];

export const TRANSACTION_COMPS_DEAL_TYPES = [
  "Acquisition",
  "Investment",
  "IPO",
  "Sale",
  "Divestment",
];

/** Filter id -> API range param stem (`<stem>_min` / `<stem>_max`). */
const RANGE_FILTERS: Record<string, string> = {
  ev: "ev",
  ev_revenue: "ev_revenue",
  ev_ebitda: "ev_ebitda",
  revenue: "revenue",
  ebitda: "ebitda",
  rev_growth: "rev_growth",
  ebitda_margin: "ebitda_margin",
  rule_of_40: "rule_of_40",
};

export interface TransactionCompsFilterOptions {
  sectors: { id: number; sector_name: string }[];
  secondarySectors: { id: number; sector_name: string }[];
  ownershipTypes: { id: number; ownership: string }[];
  countries: string[];
  acquirers: TransactionCompsOption[];
  corporateEvents: TransactionCompsOption[];
}

export function buildTransactionCompsFilterDefs(
  opts: TransactionCompsFilterOptions
): FilterDef[] {
  const range = (
    id: string,
    label: string,
    category: string,
    type: FilterDef["type"],
    unit: string | undefined,
    max: number,
    min = 0
  ): FilterDef => ({ id, label, fullLabel: label, category, type, editor: "range", unit, min, max });
  const list = (id: string, label: string, category: string, options: string[]): FilterDef => ({
    id, label, fullLabel: label, category, type: "Aa", editor: "enum", options,
  });

  // Values are option ids (as strings); labels shown via optionLabels.
  const idList = (
    id: string,
    label: string,
    category: string,
    items: TransactionCompsOption[]
  ): FilterDef => ({
    id,
    label,
    fullLabel: label,
    category,
    type: "Aa",
    editor: "enum",
    options: items.map((o) => String(o.id)),
    optionLabels: Object.fromEntries(items.map((o) => [String(o.id), o.label])),
  });

  return [
    list("deal_type", "Deal type", "default", TRANSACTION_COMPS_DEAL_TYPES),
    range("ev", "EV ($m)", "default", "$", "$m", 10000),
    range("ev_revenue", "EV / Revenue", "default", "#", "x", 30),
    range("ev_ebitda", "EV / EBITDA", "default", "#", "x", 60),
    { id: "deal_date", label: "Deal date", fullLabel: "Deal date", category: "default", type: "date", editor: "date_range" },
    idList("acquirer_investor", "Acquirer / investor", "default", opts.acquirers),
    idList("corporate_events", "Related Corporate Event", "default", opts.corporateEvents),
    list("sector", "Primary sector", "overview", opts.sectors.map((s) => s.sector_name)),
    list("secondary_sector", "Secondary sector", "overview", opts.secondarySectors.map((s) => s.sector_name)),
    list("ownership", "Acquirer type", "overview", opts.ownershipTypes.map((o) => o.ownership)),
    list("hq_country", "HQ country", "overview", opts.countries),
    list("ev_source", "EV source", "deal_details", TRANSACTION_COMPS_EV_SOURCES),
    range("revenue", "Revenue ($m)", "financial_metrics", "$", "$m", 10000),
    range("ebitda", "EBITDA ($m)", "financial_metrics", "$", "$m", 10000),
    range("rev_growth", "Revenue growth", "financial_metrics", "%", "%", 200, -50),
    range("ebitda_margin", "EBITDA margin", "financial_metrics", "%", "%", 100, -50),
    range("rule_of_40", "Rule of 40", "financial_metrics", "#", undefined, 150, -50),
  ];
}

const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

export function filterStateToQuery(
  state: FilterBarState,
  opts: TransactionCompsFilterOptions,
  base: Pick<TransactionCompsQuery, "page" | "perPage" | "sortBy" | "sortDir">
): TransactionCompsQuery {
  const q: TransactionCompsQuery = {
    ...DEFAULT_TRANSACTION_COMPS_QUERY,
    ...base,
    searchText: state.searchText,
    ranges: {},
    sectorIds: [],
    secondarySectorIds: [],
    countries: [],
    ownershipIds: [],
    dealTypes: [],
    evSourceTypes: [],
    acquirerIds: [],
    ceIds: [],
  };

  for (const f of state.filters) {
    const stem = RANGE_FILTERS[f.id];
    if (stem) {
      const v = f.value as RangeValue | undefined;
      if (v && (v.min !== undefined || v.max !== undefined)) {
        q.ranges[stem] = { min: v.min, max: v.max };
      }
      continue;
    }
    switch (f.id) {
      case "deal_date": {
        const v = f.value as { from?: string; to?: string } | undefined;
        if (v?.from) q.dealDateFrom = v.from;
        if (v?.to) q.dealDateTo = v.to;
        break;
      }
      case "sector":
        for (const name of asStrings(f.value)) {
          const id = opts.sectors.find((s) => s.sector_name === name)?.id;
          if (id != null) q.sectorIds.push(id);
        }
        break;
      case "secondary_sector":
        for (const name of asStrings(f.value)) {
          const id = opts.secondarySectors.find((s) => s.sector_name === name)?.id;
          if (id != null) q.secondarySectorIds.push(id);
        }
        break;
      case "ownership":
        for (const name of asStrings(f.value)) {
          const id = opts.ownershipTypes.find((o) => o.ownership === name)?.id;
          if (id != null) q.ownershipIds.push(id);
        }
        break;
      case "hq_country":
        q.countries.push(...asStrings(f.value));
        break;
      case "acquirer_investor":
        q.acquirerIds.push(...asStrings(f.value).map(Number).filter(Number.isFinite));
        break;
      case "corporate_events":
        q.ceIds.push(...asStrings(f.value).map(Number).filter(Number.isFinite));
        break;
      case "ev_source":
        q.evSourceTypes.push(...asStrings(f.value));
        break;
      case "deal_type":
        q.dealTypes.push(...asStrings(f.value));
        break;
    }
  }
  return q;
}
