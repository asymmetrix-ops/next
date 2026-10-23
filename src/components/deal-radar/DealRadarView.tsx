"use client";

import { OwnershipChip } from "@/components/companies/CompanySection";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { trackKeyAction } from "@/lib/tracking";
import { usePlatformCurrency } from "@/components/providers/PlatformCurrencyProvider";
import Footer from "@/components/Footer";
import {
  CompaniesFilterBar,
  type FilterBarState,
  type FilterCategory,
  type FilterDef,
} from "@/components/companies/CompaniesFilterBar";
import {
  getTransactionStatusTone,
  getProcessStageTone,
  getBuyerTypeTone,
  getTransactionSignalDescription,
  ENTITY_TONES,
  DEAL_TYPE_TONE,
  TRANSACTION_SIGNAL_TONES,
  type TagTone,
} from "@/lib/tagColors";
import { TransactionStatusPill } from "@/components/tags/TransactionStatusPill";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import {
  SEARCH_MULTI_VALUE_STYLES,
  SearchEntityMultiValueCell,
} from "@/components/search/SearchEntityMultiValueCell";
import { appendMetricCurrency } from "@/lib/buildFinancialMetricsSections";
import { formatMetricMillionsPlain } from "@/lib/formatMetricMillions";
import { EMPTY_DISPLAY } from "@/lib/emptyDisplay";
import {
  SEARCH_TABLE_ENTITY_LOGO_SIZE_PX,
  SEARCH_TABLE_STYLES,
} from "@/components/search/searchTableStyles";
import {
  SEARCH_DASHBOARD_EYEBROW,
  SearchListTabs,
  SEARCH_DASHBOARD_FILTER_INNER,
  SEARCH_DASHBOARD_FILTER_SHELL,
  SEARCH_DASHBOARD_HEADER_ROW,
  SEARCH_DASHBOARD_INNER,
  SEARCH_DASHBOARD_MATCH_COUNT,
  SEARCH_DASHBOARD_SHELL,
  SEARCH_DASHBOARD_TITLE,
} from "@/components/search/searchDashboardLayout";
import { SearchTablePagination } from "@/components/search/SearchTablePagination";
import { locationsService } from "@/lib/locationsService";
import type { PrimarySector } from "@/components/companies/companiesFilterConfig";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Sector {
  id: number;
  name: string;
}

interface NamedRef {
  id: number;
  name: string;
}

interface AdvisorRef {
  id: number;
  name: string;
  /** True when the firm has an Advisor profile page. */
  has_profile: boolean;
  /** Bankers tagged under this Advisor. */
  bankers: NamedRef[];
}

/** "Proprietary" | "Public" from Financial Metrics (x2_116.proprietary); null for legacy/empty. */
type RevenueSourceType = "Proprietary" | "Public" | null;

interface ValSource {
  value: string | null;
  source: string | null;
  source_type?: RevenueSourceType;
  currency?: string | null;
}

interface LinkedEvent {
  id: number;
  announcement_date: string;
}

interface ContentCta {
  id: number;
  label: string;
  content_type: string;
  publication_date: string;
}

interface DealRadarDashboardItem {
  company_id: number;
  name: string;
  logo?: string | null;
  hq_country: string | null;
  ownership_type: string | null;
  owner_name: string | null;
  owner_id?: number | null;
  primary_sectors: Sector[];
  transaction_status_id: number;
  transaction_status: string;
  transaction_signal: string | null;
  active_status_set_at: string | null;
  process_stage: string | null;
  buyer_type: string[];
  intermediary_type: string | null;
  intermediary: NamedRef | null;
  advisors?: AdvisorRef[];
  bidders: NamedRef[];
  revenue: ValSource;
  ev: ValSource;
  potential_acquirers: NamedRef[];
  linked_event: LinkedEvent | null;
  content_cta: ContentCta | null;
  /** Newer API shape: every linkable report for the company (news and company analysis). */
  content_ctas?: ContentCta[] | null;
}

interface Pagination {
  total_items: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  offset: number;
  has_next_page: boolean;
  has_prev_page: boolean;
  next_page: number | null;
  prev_page: number | null;
  next_offset: number | null;
  prev_offset: number | null;
}

interface DealRadarDashboardResponse {
  items: DealRadarDashboardItem[];
  pagination: Pagination;
  status_totals: Record<string, number>;
}

interface OwnershipTypeOption {
  id: number;
  ownership: string;
}

interface CountryOption {
  locations_Country: string;
}

interface AdvisorOption {
  id: number;
  name: string;
}

/** One filter sent to get_deal_radar_dashboard (`filters_json`), combined left to right. */
interface DealRadarApiFilter {
  field: string;
  values: Array<string | number>;
  logic: "and" | "or";
}

const FILTER_CATEGORIES: FilterCategory[] = [
  { id: "transaction", name: "Transaction" },
  { id: "company", name: "Company" },
];

/** Agreed tracking names (lowercase, underscores) so a respelling never splits in the dashboard. */
const DEAL_RADAR_FILTER_NAMES: Record<string, string> = {
  ownership: "ownership_type",
  hq_country: "hq_country",
  sector: "sector",
  process_stage: "process_stage",
  transaction_signal: "transaction_signal",
  buyer_type: "buyer_type",
  advisor: "advisor",
  banker: "banker",
};

type SortDir = "asc" | "desc";
type SortKey =
  | "name"
  | "hq"
  | "ownership"
  | "sector"
  | "status"
  | "stage"
  | "advisor"
  | "buyer_type"
  | "bidders"
  | "revenue"
  | "ev";

/** Agreed tracking names (lowercase, underscores). */
const DEAL_RADAR_SORT_NAMES: Record<SortKey, string> = {
  name: "company",
  hq: "hq",
  ownership: "ownership",
  sector: "sector",
  status: "transaction_status",
  stage: "process_stage",
  advisor: "advisor",
  buyer_type: "buyer_type",
  bidders: "bidders",
  revenue: "revenue",
  ev: "ev",
};

/** Blue hover on sortable headers so users can tell they are clickable. */
const SORTABLE_HEADER_HOVER_STYLES = `
  .company-table thead th.company-table-th-sortable {
    transition: color 0.12s, background-color 0.12s;
  }
  .company-table thead th.company-table-th-sortable:hover {
    color: #2A46EA;
    background: #E8EDFB;
  }
  .company-table thead th.company-table-th-sortable:hover .company-table-sort-indicator {
    color: #2A46EA;
  }
`;

const BUYER_TYPE_FILTER_OPTIONS = ["Trade", "Sponsor", "Growth Equity"];

const INITIAL_FILTER_BAR_STATE: FilterBarState = {
  filters: [],
  viewId: null,
  searchText: "",
  filterLogic: "and",
};

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop";
const FILTER_API = "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob:develop";
const PAGE_SIZE = 25;
const TABLE_COL_COUNT = 11;

/** Advisors for a row; falls back to the single `intermediary` an older API response carries. */
function advisorsOf(item: DealRadarDashboardItem): AdvisorRef[] {
  if (Array.isArray(item.advisors)) return item.advisors;
  return item.intermediary
    ? [{ ...item.intermediary, has_profile: true, bankers: [] }]
    : [];
}

/** Advisor column like other list views: plain links (no tags), each firm with its bankers underneath. */
function AdvisorCell({ item, align = "left" }: { item: DealRadarDashboardItem; align?: "left" | "right" }) {
  const advisors = advisorsOf(item);
  if (advisors.length === 0) {
    const type = item.intermediary_type;
    if (type === "No Intermediary") return <>No Advisor</>;
    return type === "Not Yet Hired" ? <>{type}</> : <>{EMPTY_DISPLAY}</>;
  }
  const alignClass = align === "right" ? "items-end text-right" : "items-start text-left";
  return (
    <div className={`flex flex-col gap-1.5 text-xs leading-snug ${alignClass}`}>
      {advisors.map((advisor) => (
        <div key={advisor.id} className={`flex flex-col gap-0.5 ${alignClass}`}>
          {advisor.has_profile ? (
            <a href={`/advisor/${advisor.id}`} className={`search-multi-value-link`}>
              {advisor.name}
            </a>
          ) : (
            <span className="text-gray-800">{advisor.name}</span>
          )}
          {(advisor.bankers ?? [])
            .filter((banker) => banker.name)
            .map((banker) => (
              <a key={banker.id} href={`/individual/${banker.id}`} className="search-multi-value-link text-[11px]">
                {banker.name}
              </a>
            ))}
        </div>
      ))}
    </div>
  );
}

/** Buyer Type column: one pill per recorded type, "-" when none. */
function BuyerTypeCell({ types }: { types: string[] }) {
  const list = (types ?? []).filter(Boolean);
  if (list.length === 0) return <>{EMPTY_DISPLAY}</>;
  return (
    <div className="flex flex-wrap gap-1">
      {list.map((type) => {
        const tone = getBuyerTypeTone(type);
        return (
          <span
            key={type}
            className="inline-block rounded-full border text-[11px] font-medium px-2 py-0.5"
            style={{ backgroundColor: tone.fill, color: tone.text, borderColor: tone.border }}
          >
            {type}
          </span>
        );
      })}
    </div>
  );
}


const TRANSACTION_STATUS_OPTIONS = [
  { id: 3, label: "Reported in Market", totalsKey: "Reported in Market" },
  { id: 2, label: "Rumoured in Market", totalsKey: "Rumoured in Market" },
  {
    id: 1,
    label: "Transaction Anticipated within 18 Months",
    totalsKey: "Transaction anticipated within 18 months",
  },
  {
    id: 6,
    label: "Transaction Anticipated within 6 Months",
    totalsKey: "Transaction Anticipated within 6 Months",
  },
  { id: 5, label: "Process on Hold", totalsKey: "Process on Hold" },
];

const STATUS_FILTERS = [
  { label: "All", statusId: null, totalsKey: "" },
  ...TRANSACTION_STATUS_OPTIONS.map((o) => ({
    label:
      o.id === 6
        ? "Anticipated within 6 months"
        : o.id === 1
          ? "Anticipated within 18 months"
          : o.label,
    statusId: o.id,
    totalsKey: o.totalsKey,
  })),
];

const PROCESS_STAGE_FILTER_OPTIONS = [
  "Strategic Review",
  "Banker Pitches",
  "Deal Prep",
  "In Market",
  "In Exclusivity",
];

const TRANSACTION_SIGNAL_FILTER_OPTIONS = [
  "Long Hold",
  "Asymmetrix Assessment",
  "Proprietary Intel",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Exact hexes from tags.txt §2 — fixed platform-wide, do not re-map per page. */
function getStatusStyle(status: string): {
  bg: string;
  text: string;
  dot: string;
  border: string;
} {
  const tone = getTransactionStatusTone(status);
  return {
    bg: tone.fill,
    text: tone.text,
    dot: tone.dot || tone.text,
    border: tone.border,
  };
}

function cleanSectorName(raw: string): string {
  return raw
    .trim()
    .replace(/\\u0022/g, '"')
    .replace(/^["']+|["']+$/g, "")
    .trim();
}

function isInvalidVal(value: string | number | null | undefined): boolean {
  if (value === null || value === undefined || value === "") return true;
  const v = String(value).trim().toLowerCase();
  return v === "null" || v === "nan" || v === "";
}

/** Revenue / EV formatted value, e.g. "$12.5m". */
function formatVal(val: ValSource): React.ReactNode {
  if (isInvalidVal(val?.value)) return EMPTY_DISPLAY;
  const plain = formatMetricMillionsPlain(val.value);
  if (plain === EMPTY_DISPLAY) return EMPTY_DISPLAY;
  return appendMetricCurrency(plain, val.currency ?? undefined);
}

/** Same tones already used for "Proprietary Intel" (transaction signal) and "Trade" (buyer type). */
const REVENUE_SOURCE_TONES: Record<"Proprietary" | "Public", TagTone> = {
  Proprietary: TRANSACTION_SIGNAL_TONES["proprietary intel"],
  Public: DEAL_TYPE_TONE,
};

/** Colored pill ("Proprietary" / "Public") marking where a Revenue/EV figure came from — identical markup/sizing to BuyerTypeCell's pills (e.g. "Trade"). */
function SourceTypeTag({ type }: { type: RevenueSourceType | undefined }) {
  if (type !== "Proprietary" && type !== "Public") return null;
  const tone = REVENUE_SOURCE_TONES[type];
  return (
    <span
      className="inline-block rounded-full border text-[11px] font-medium px-2 py-0.5"
      style={{ backgroundColor: tone.fill, color: tone.text, borderColor: tone.border }}
    >
      {type}
    </span>
  );
}

/** Revenue / EV value with its source-type tag alongside when available (Financial Metrics only). */
function formatValWithSourceTag(val: ValSource): React.ReactNode {
  const formatted = formatVal(val);
  if (formatted === EMPTY_DISPLAY) return formatted;
  if (val.source_type !== "Proprietary" && val.source_type !== "Public") {
    return formatted;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span>{formatted}</span>
      <SourceTypeTag type={val.source_type} />
    </div>
  );
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function isNewsCta(cta: ContentCta): boolean {
  return String(cta.content_type ?? "").toLowerCase().trim() === "news";
}

/** One report link per company: news wins over company analysis, newest first within each. */
function pickContentCta(item: DealRadarDashboardItem): ContentCta | null {
  const candidates = [...(item.content_ctas ?? []), ...(item.content_cta ? [item.content_cta] : [])].filter(
    (c) => c && c.id
  );
  if (candidates.length === 0) return null;
  const time = (c: ContentCta) => new Date(c.publication_date).getTime() || 0;
  return candidates.sort(
    (a, b) => Number(isNewsCta(b)) - Number(isNewsCta(a)) || time(b) - time(a)
  )[0];
}

function getContentCtaLabel(cta: ContentCta): string {
  const label = cta.label?.trim();
  if (label) return label;
  return isNewsCta(cta) ? "Read our News" : "Read our Company Analysis";
}

function buildDashboardUrl(
  offset: number,
  search: string,
  statusId: number | null,
  barFilters: DealRadarApiFilter[],
  sort: { key: SortKey | null; dir: SortDir } = { key: null, dir: "asc" },
  preferredCurrencyId?: number,
  sectorId?: number
): URL {
  const url = new URL(`${API_BASE}/get_deal_radar_dashboard`);
  if (sectorId != null) url.searchParams.append("sector_ids[]", String(sectorId));
  if (preferredCurrencyId) {
    url.searchParams.set("preferred_currency_id", String(preferredCurrencyId));
  }
  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set("offset", String(offset));
  if (search) url.searchParams.set("search", search);
  if (statusId !== null) {
    url.searchParams.append("transaction_status_ids[]", String(statusId));
  }
  if (barFilters.length > 0) {
    url.searchParams.set("filters_json", JSON.stringify(barFilters));
  }
  if (sort.key) {
    url.searchParams.set("sort_by", sort.key);
    url.searchParams.set("sort_dir", sort.dir);
  }
  return url;
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function TransactionSignalLabel({ signal }: { signal: string }) {
  const description = getTransactionSignalDescription(signal);
  return (
    <p
      className="mt-1 cursor-help text-center text-[11px] font-medium text-gray-600"
      title={description || undefined}
    >
      {signal}
    </p>
  );
}

const DEAL_RADAR_LINK_CLASS = "deal-radar-link";

const DEAL_RADAR_STYLES = `
  .deal-radar-link,
  .deal-radar-link-plain,
  .search-multi-value-link {
    color: #0075df;
    text-decoration: none;
    cursor: pointer;
  }
  .deal-radar-link:hover,
  .deal-radar-link-plain:hover,
  .search-multi-value-link:hover {
    color: #005bb5;
    text-decoration: underline;
  }
  .deal-radar-table .search-multi-value-cell {
    max-width: 150px;
  }
`;

function DealRadarMobileCard({
  item,
  onNavigate,
}: {
  item: DealRadarDashboardItem;
  onNavigate: (href: string) => void;
}) {
  const sectors = item.primary_sectors.map((s) => ({ ...s, name: cleanSectorName(s.name) }));
  const dash = <span>-</span>;
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-start justify-between gap-3 py-1.5 text-xs">
      <span className="w-24 shrink-0 font-medium text-gray-500">{label}</span>
      <div className="min-w-0 flex-1 text-right text-gray-800">{value}</div>
    </div>
  );
  const chip = (key: string | number, href: string, name: string) => (
    <a
      key={key}
      href={href}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onNavigate(href);
      }}
      className="entity-chip-company inline-block rounded-full text-[10.5px] font-semibold px-2 py-0.5"
      style={{ backgroundColor: ENTITY_TONES.company.fill, color: ENTITY_TONES.company.text }}
    >
      {name}
    </a>
  );
  const stageTone = item.process_stage ? getProcessStageTone(item.process_stage) : null;
  const cta = pickContentCta(item);

  return (
    <div className="border-b border-gray-100 px-4 py-4">
      <div className="flex items-start gap-3">
        <CompanyAvatar name={item.name} logo={item.logo} size={36} />
        <div className="min-w-0 flex-1">
          <a
            href={`/company/${item.company_id}`}
            onClick={(e) => {
              trackKeyAction({
                section: "deal_radar",
                action: "company_clicked_through",
                targetType: "company",
                targetId: item.company_id,
              });
              if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              onNavigate(`/company/${item.company_id}`);
            }}
            className={`${DEAL_RADAR_LINK_CLASS} text-[15px] font-semibold leading-snug`}
          >
            {item.name}
          </a>
          {item.active_status_set_at && (
            <p className="mt-0.5 text-[10px] text-gray-400">{formatDate(item.active_status_set_at)}</p>
          )}
          {cta && (
            <a
              href={`/article/${cta.id}`}
              onClick={(e) => {
                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                onNavigate(`/article/${cta.id}`);
              }}
              className={`${DEAL_RADAR_LINK_CLASS} mt-0.5 block text-[11.5px] font-medium`}
            >
              {getContentCtaLabel(cta)}
            </a>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <TransactionStatusPill
            status={item.transaction_status}
            className="inline-block max-w-[9rem]"
            style={{ textAlign: "left", justifyContent: "flex-start" }}
            allowWrap
          />
          {item.transaction_signal && <TransactionSignalLabel signal={item.transaction_signal} />}
        </div>
      </div>

      <div className="mt-3 divide-y divide-gray-50">
        {row("HQ", item.hq_country ?? dash)}
        {row(
          "Ownership",
          item.ownership_type ? (
            <>
              <OwnershipChip value={item.ownership_type} />
              {item.owner_name && (
                <p className="text-[10px] text-gray-500">
                  {item.owner_id ? (
                    <a
                      href={`/investors/${item.owner_id}`}
                      onClick={(e) => {
                        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                        e.preventDefault();
                        onNavigate(`/investors/${item.owner_id}`);
                      }}
                      className="deal-radar-link-plain"
                    >
                      {item.owner_name}
                    </a>
                  ) : (
                    item.owner_name
                  )}
                </p>
              )}
            </>
          ) : (
            dash
          )
        )}
        {row(
          "Sectors",
          sectors.length > 0 ? (
            <SearchEntityMultiValueCell
              items={sectors.map((s) => ({
                key: `${s.id}-${s.name}`,
                name: s.name,
                href: s.id > 0 ? `/sector/${s.id}` : undefined,
              }))}
            />
          ) : (
            dash
          )
        )}
        {row(
          "Process stage",
          stageTone && item.process_stage ? (
            <span
              className="inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: stageTone.fill, color: stageTone.text, borderColor: stageTone.border }}
            >
              {item.process_stage}
            </span>
          ) : (
            dash
          )
        )}
        {row("Advisor", <AdvisorCell item={item} align="right" />)}
        {row("Buyer type", <div className="flex justify-end"><BuyerTypeCell types={item.buyer_type} /></div>)}
        {row(
          "Bidders",
          item.bidders.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-1">
              {item.bidders.map((b) => chip(b.id, `/company/${b.id}`, b.name))}
            </div>
          ) : (
            dash
          )
        )}
        {row("Revenue (m)", <div className="flex justify-end">{formatValWithSourceTag(item.revenue)}</div>)}
        {row("EV (m)", <div className="flex justify-end">{formatValWithSourceTag(item.ev)}</div>)}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-gray-100">
      {Array.from({ length: TABLE_COL_COUNT }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <div className="h-3 bg-gray-200 rounded w-full" />
        </td>
      ))}
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DealRadarView({
  fixedSectorId,
}: {
  /** Embedded on a sector page: scopes the table to that primary sector and drops the page chrome. */
  fixedSectorId?: number;
} = {}) {
  const embedded = fixedSectorId != null;
  const { currencyId: preferredCurrencyId } = usePlatformCurrency();
  const router = useRouter();
  const [items, setItems] = useState<DealRadarDashboardItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [statusTotals, setStatusTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [filterBarState, setFilterBarState] = useState<FilterBarState>(
    INITIAL_FILTER_BAR_STATE
  );
  const [statusBubbleId, setStatusBubbleId] = useState<number | null>(null);
  const [sort, setSort] = useState<{ key: SortKey | null; dir: SortDir }>({
    key: null,
    dir: "asc",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ownershipTypes, setOwnershipTypes] = useState<OwnershipTypeOption[]>([]);
  const [sectorOptions, setSectorOptions] = useState<PrimarySector[]>([]);
  const [countryOptions, setCountryOptions] = useState<CountryOption[]>([]);
  const [advisorOptions, setAdvisorOptions] = useState<AdvisorOption[]>([]);
  const [bankerOptions, setBankerOptions] = useState<AdvisorOption[]>([]);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => {
        setDebouncedSearch(filterBarState.searchText.trim());
        setPage(1);
      },
      300
    );
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filterBarState.searchText]);

  // Load filter dropdown options
  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("asymmetrix_auth_token")
        : null;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    async function loadFilterOptions() {
      try {
        const [ownershipRes, countriesRes, advisorsRes, bankersRes] = await Promise.all([
          fetch(`${FILTER_API}/get_all_ownership_types`, { headers }),
          fetch(`${FILTER_API}/locations_country`, { headers }),
          fetch(`${API_BASE}/get_deal_radar_advisor_options`, { headers }),
          fetch(`${API_BASE}/get_deal_radar_banker_options`, { headers }),
        ]);

        if (ownershipRes.ok) {
          const data = (await ownershipRes.json()) as OwnershipTypeOption[];
          setOwnershipTypes(Array.isArray(data) ? data : []);
        }
        try {
          const primarySectors = await locationsService.getPrimarySectors();
          setSectorOptions(Array.isArray(primarySectors) ? primarySectors : []);
        } catch {
          // Primary sectors are optional — other filters still work
        }
        if (countriesRes.ok) {
          const data = (await countriesRes.json()) as CountryOption[];
          setCountryOptions(Array.isArray(data) ? data : []);
        }
        if (advisorsRes.ok) {
          const data = (await advisorsRes.json()) as AdvisorOption[];
          setAdvisorOptions(Array.isArray(data) ? data : []);
        }
        if (bankersRes.ok) {
          const data = (await bankersRes.json()) as AdvisorOption[];
          setBankerOptions(Array.isArray(data) ? data : []);
        }
      } catch {
        // Filter options are optional — page still works without them
      }
    }

    loadFilterOptions();
  }, []);

  // Latest request wins: the first fetch can go out with the default currency before the saved one loads.
  const latestRequestRef = useRef(0);
  const fetchData = useCallback(
    async (
      offset = 0,
      append = false,
      search = "",
      statusId: number | null = null,
      barFilters: DealRadarApiFilter[] = [],
      sortState: { key: SortKey | null; dir: SortDir } = { key: null, dir: "asc" }
    ) => {
      const requestId = ++latestRequestRef.current;
      setLoading(true);
      setError(null);

      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("asymmetrix_auth_token")
            : null;
        const url = buildDashboardUrl(offset, search, statusId, barFilters, sortState, preferredCurrencyId, fixedSectorId);

        const res = await fetch(url.toString(), {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) throw new Error(`Request failed: ${res.statusText}`);

        const data: DealRadarDashboardResponse = await res.json();
        if (requestId !== latestRequestRef.current) return;
        setItems((prev) =>
          append ? [...prev, ...data.items] : data.items
        );
        setPagination(data.pagination);
        if (!append && data.status_totals) setStatusTotals(data.status_totals);
      } catch (err) {
        if (requestId !== latestRequestRef.current) return;
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        if (requestId === latestRequestRef.current) setLoading(false);
      }
    },
    [preferredCurrencyId, fixedSectorId]
  );

  // Filter-bar items -> API filters (labels back to ids where the endpoint filters by id)
  const barFilters = useMemo<DealRadarApiFilter[]>(() => {
    const idsByName = (rows: Array<{ id: number; name: string }>, names: string[]) =>
      rows.filter((row) => names.includes(row.name)).map((row) => row.id);
    const result: DealRadarApiFilter[] = [];
    filterBarState.filters.forEach((item, index) => {
      const names = Array.isArray(item.value)
        ? (item.value as unknown[]).filter((v): v is string => typeof v === "string")
        : typeof item.value === "string" && item.value
          ? [item.value]
          : [];
      if (names.length === 0) return;
      let values: Array<string | number> = names;
      if (item.id === "ownership") {
        values = idsByName(
          ownershipTypes.map((o) => ({ id: o.id, name: o.ownership })),
          names
        );
      } else if (item.id === "sector") {
        values = idsByName(
          sectorOptions.map((o) => ({ id: o.id, name: o.sector_name })),
          names
        );
      } else if (item.id === "advisor") {
        values = idsByName(advisorOptions, names);
      } else if (item.id === "banker") {
        values = idsByName(bankerOptions, names);
      }
      if (values.length === 0) return;
      result.push({
        field: item.id,
        values,
        logic:
          index === 0 ? "and" : (item.combineLogic ?? filterBarState.filterLogic),
      });
    });
    return result;
  }, [filterBarState.filters, filterBarState.filterLogic, ownershipTypes, sectorOptions, advisorOptions, bankerOptions]);
  const barFiltersKey = JSON.stringify(barFilters);

  // Track newly applied filter types
  const trackedFieldsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const current = new Set(barFilters.map((f) => f.field));
    current.forEach((field) => {
      if (!trackedFieldsRef.current.has(field)) {
        trackKeyAction({
          section: "deal_radar",
          action: "filter_applied",
          actionDetail: DEAL_RADAR_FILTER_NAMES[field] ?? field,
        });
      }
    });
    trackedFieldsRef.current = current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barFiltersKey]);

  // Back to page 1 whenever the filters change
  useEffect(() => {
    setPage(1);
  }, [barFiltersKey, statusBubbleId, sort]);

  // Re-fetch when the page, search or filters change
  useEffect(() => {
    fetchData((page - 1) * PAGE_SIZE, false, debouncedSearch, statusBubbleId, barFilters, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, page, debouncedSearch, statusBubbleId, barFiltersKey, sort]);

  const toggleSort = (key: SortKey) => {
    trackKeyAction({
      section: "deal_radar",
      action: "column_sorted",
      actionDetail: DEAL_RADAR_SORT_NAMES[key],
    });
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

  const statusCounts = useMemo<Record<string, number>>(() => {
    const total = Object.values(statusTotals).reduce((a, b) => a + b, 0);
    return { "": total, ...statusTotals };
  }, [statusTotals]);

  const filterDefs = useMemo<FilterDef[]>(() => {
    const enumDef = (
      id: string,
      label: string,
      category: string,
      options: string[]
    ): FilterDef => ({
      id,
      label,
      fullLabel: label,
      category,
      type: "Aa",
      editor: "enum",
      options,
    });
    const unique = (values: string[]) =>
      Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
    return [
      enumDef("process_stage", "Process Stage", "transaction", PROCESS_STAGE_FILTER_OPTIONS),
      enumDef("transaction_signal", "Transaction Signal", "transaction", TRANSACTION_SIGNAL_FILTER_OPTIONS),
      enumDef("buyer_type", "Buyer Type", "transaction", BUYER_TYPE_FILTER_OPTIONS),
      enumDef("advisor", "Advisor", "transaction", unique(advisorOptions.map((a) => a.name))),
      enumDef("banker", "Banker", "transaction", unique(bankerOptions.map((b) => b.name))),
      enumDef("ownership", "Ownership Type", "company", unique(ownershipTypes.map((o) => o.ownership))),
      enumDef("hq_country", "HQ Country", "company", unique(countryOptions.map((c) => c.locations_Country))),
      ...(embedded
        ? []
        : [enumDef("sector", "Primary Sector", "company", unique(sectorOptions.map((o) => o.sector_name)))]),
    ];
  }, [embedded, advisorOptions, bankerOptions, ownershipTypes, countryOptions, sectorOptions]);

  const statusTabs = useMemo(
    () =>
      STATUS_FILTERS.map((f) => ({
        id: f.statusId === null ? "all" : String(f.statusId),
        label: f.label,
        count: f.totalsKey === "" ? (statusCounts[""] ?? 0) : (statusCounts[f.totalsKey] ?? 0),
        dot:
          f.statusId === null
            ? "#8A93A8"
            : getStatusStyle(
                TRANSACTION_STATUS_OPTIONS.find((o) => o.id === f.statusId)?.label ?? ""
              ).dot,
      })),
    [statusCounts]
  );

  const Th = ({
    label,
    sortKey,
    frozen = false,
    minWidth,
  }: {
    label: string;
    sortKey: SortKey;
    frozen?: boolean;
    minWidth?: number;
  }) => {
    const active = sort.key === sortKey;
    return (
      <th
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
        className={`company-table-th-sortable${frozen ? " company-table-sticky-frozen" : ""}`}
        style={{
          minWidth,
          ...(frozen
            ? {
                position: "sticky",
                left: 0,
                zIndex: 7,
                boxShadow: "2px 0 4px rgba(15, 23, 42, 0.06)",
                background: "#F5F7FD",
              }
            : null),
        }}
        onClick={() => toggleSort(sortKey)}
      >
        {label}
        {active && (
          <span className="company-table-sort-indicator">
            {sort.dir === "asc" ? " ↑" : " ↓"}
          </span>
        )}
      </th>
    );
  };

  const Shell = embedded ? React.Fragment : AppShell;
  return (
    <Shell>
      <div className={`${embedded ? "" : "min-h-screen "}flex flex-col${embedded ? " bg-white" : ""}`}>
        <style
          dangerouslySetInnerHTML={{
            __html: SEARCH_TABLE_STYLES + SEARCH_MULTI_VALUE_STYLES + SORTABLE_HEADER_HOVER_STYLES + DEAL_RADAR_STYLES,
          }}
        />
        <div style={SEARCH_DASHBOARD_SHELL}>
          <div style={SEARCH_DASHBOARD_INNER}>
            {!embedded && (
            <div style={SEARCH_DASHBOARD_HEADER_ROW}>
              <div>
                <div style={SEARCH_DASHBOARD_EYEBROW}>Deal Radar</div>
                <h1 style={SEARCH_DASHBOARD_TITLE}>
                  Deal Radar search
                  {pagination && (
                    <span style={SEARCH_DASHBOARD_MATCH_COUNT}>
                      {pagination.total_items.toLocaleString()} matches
                    </span>
                  )}
                </h1>
              </div>

            </div>
            )}

            <SearchListTabs
              tabs={statusTabs}
              activeTabId={statusBubbleId === null ? "all" : String(statusBubbleId)}
              onTabClick={(tabId) =>
                setStatusBubbleId(tabId === "all" ? null : Number(tabId))
              }
            />
          </div>
        </div>

        <div style={SEARCH_DASHBOARD_FILTER_SHELL}>
          <div style={SEARCH_DASHBOARD_FILTER_INNER}>
            <CompaniesFilterBar
              filterDefs={filterDefs}
              filterCategories={FILTER_CATEGORIES}
              state={filterBarState}
              onStateChange={setFilterBarState}
              totalCount={pagination?.total_items ?? 0}
              entityLabel="transactions"
            />
          </div>
        </div>

        <main className="flex-1 w-full px-7 py-4">
          {error ? (
            <div className="p-8 text-center">
              <p className="text-sm text-red-600 font-medium">{error}</p>
              <button
                type="button"
                onClick={() => fetchData((page - 1) * PAGE_SIZE, false, debouncedSearch, statusBubbleId, barFilters, sort)}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
            <div
              className="company-table-scroll hidden md:block"
              style={{ opacity: loading ? 0.6 : 1, transition: "opacity 0.15s" }}
            >
              <table className="company-table deal-radar-table">
                <thead>
                  <tr>
                    <Th label="Company" sortKey="name" frozen minWidth={260} />
                    <Th label="HQ" sortKey="hq" minWidth={100} />
                    <Th label="Ownership" sortKey="ownership" minWidth={120} />
                    <Th label="Primary Sector(s)" sortKey="sector" minWidth={120} />
                    <Th label="Transaction Status" sortKey="status" minWidth={220} />
                    <Th label="Process Stage" sortKey="stage" minWidth={130} />
                    <Th label="Advisor" sortKey="advisor" minWidth={160} />
                    <Th label="Buyer Type" sortKey="buyer_type" minWidth={120} />
                    <Th label="Bidders" sortKey="bidders" minWidth={140} />
                    <Th label="Revenue (m)" sortKey="revenue" minWidth={110} />
                    <Th label="EV (m)" sortKey="ev" minWidth={100} />
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <SkeletonRow key={i} />
                      ))
                    : items.length === 0
                      ? (
                        <tr>
                          <td
                            colSpan={TABLE_COL_COUNT}
                            className="py-16 text-center text-sm text-gray-400"
                          >
                            No transactions found
                          </td>
                        </tr>
                      )
                      : items.map((item) => {
                          const sectors = item.primary_sectors.map((s) => ({
                            ...s,
                            name: cleanSectorName(s.name),
                          }));

                          return (
                            <tr key={item.company_id}>
                              {/* Company */}
                              <td
                                className="company-table-sticky-frozen"
                                style={{
                                  minWidth: 260,
                                  position: "sticky",
                                  left: 0,
                                  zIndex: 3,
                                  boxShadow: "2px 0 4px rgba(15, 23, 42, 0.06)",
                                  background: "#fff",
                                }}
                              >
                                <div className="company-table-entity-name-cell">
                                  <CompanyAvatar
                                    name={item.name}
                                    logo={item.logo}
                                    size={SEARCH_TABLE_ENTITY_LOGO_SIZE_PX}
                                  />
                                  <div className="company-table-entity-name-text">
                                <a
                                  href={`/company/${item.company_id}`}
                                  onClick={(e) => {
                                    trackKeyAction({
                                      section: "deal_radar",
                                      action: "company_clicked_through",
                                      targetType: "company",
                                      targetId: item.company_id,
                                    });
                                    if (
                                      e.button !== 0 ||
                                      e.metaKey ||
                                      e.ctrlKey ||
                                      e.shiftKey ||
                                      e.altKey
                                    )
                                      return;
                                    e.preventDefault();
                                    router.push(`/company/${item.company_id}`);
                                  }}
                                  className={`${DEAL_RADAR_LINK_CLASS} text-sm font-semibold leading-snug`}
                                >
                                  {item.name}
                                </a>
                                {item.active_status_set_at && (
                                  <p className="text-[10px] text-gray-400 mt-0.5">
                                    {formatDate(item.active_status_set_at)}
                                  </p>
                                )}
                                {(() => {
                                  const cta = pickContentCta(item);
                                  if (!cta) return null;
                                  return (
                                    <a
                                      href={`/article/${cta.id}`}
                                      onClick={(e) => {
                                        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                                        e.preventDefault();
                                        router.push(`/article/${cta.id}`);
                                      }}
                                      className={`${DEAL_RADAR_LINK_CLASS} mt-0.5 block text-[11.5px] font-medium`}
                                    >
                                      {getContentCtaLabel(cta)}
                                    </a>
                                  );
                                })()}
                                  </div>
                                </div>
                              </td>

                              {/* HQ */}
                              <td className="text-xs text-gray-700">
                                {item.hq_country ?? (
                                  <span>-</span>
                                )}
                              </td>

                              {/* Ownership */}
                              <td className="text-xs text-gray-700">
                                {item.ownership_type ? (
                                  <div>
                                    <OwnershipChip value={item.ownership_type} />
                                    {item.owner_name && (
                                      <p className="text-[10px] text-gray-500 mt-0.5">
                                        {item.owner_id ? (
                                          <a
                                            href={`/investors/${item.owner_id}`}
                                            className="deal-radar-link-plain"
                                          >
                                            {item.owner_name}
                                          </a>
                                        ) : (
                                          item.owner_name
                                        )}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span>-</span>
                                )}
                              </td>

                              {/* Sectors */}
                              <td>
                                {sectors.length > 0 ? (
                                  <SearchEntityMultiValueCell
                                    items={sectors.map((s) => ({
                                      key: `${s.id}-${s.name}`,
                                      name: s.name,
                                      href:
                                        s.id > 0 ? `/sector/${s.id}` : undefined,
                                    }))}
                                  />
                                ) : (
                                  <span>-</span>
                                )}
                              </td>

                              {/* Transaction Status + Signal */}
                              <td>
                                <div className="inline-flex flex-col items-center">
                                  <TransactionStatusPill
                                    status={item.transaction_status}
                                    className="inline-flex w-[13rem] justify-center whitespace-nowrap"
                                  />
                                  {item.transaction_signal && (
                                    <TransactionSignalLabel
                                      signal={item.transaction_signal}
                                    />
                                  )}
                                </div>
                              </td>

                              {/* Process Stage — hue varies by value, tags.txt §5 */}
                              <td className="text-xs text-gray-700">
                                {item.process_stage ? (
                                  (() => {
                                    const tone = getProcessStageTone(item.process_stage);
                                    return (
                                      <span
                                        className="inline-block rounded-full border text-[11px] font-medium px-2 py-0.5"
                                        style={{
                                          backgroundColor: tone.fill,
                                          color: tone.text,
                                          borderColor: tone.border,
                                        }}
                                      >
                                        {item.process_stage}
                                      </span>
                                    );
                                  })()
                                ) : (
                                  <span>-</span>
                                )}
                              </td>

                              {/* Advisor — each firm with its bankers underneath */}
                              <td className="text-xs text-gray-700">
                                <AdvisorCell item={item} />
                              </td>

                              {/* Buyer Type */}
                              <td className="text-xs text-gray-700">
                                <BuyerTypeCell types={item.buyer_type} />
                              </td>

                              {/* Bidders — entity chip, tags.txt §10 (Companies · green) */}
                              <td>
                                {item.bidders.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {item.bidders.map((b) => (
                                      <a
                                        key={b.id}
                                        href={`/company/${b.id}`}
                                        onClick={() =>
                                          trackKeyAction({
                                            section: "deal_radar",
                                            action: "company_clicked_through",
                                            targetType: "company",
                                            targetId: b.id,
                                          })
                                        }
                                        className="entity-chip-company inline-block rounded-full text-[10.5px] font-semibold px-2 py-0.5 transition-colors"
                                        style={{
                                          backgroundColor: ENTITY_TONES.company.fill,
                                          color: ENTITY_TONES.company.text,
                                        }}
                                      >
                                        {b.name}
                                      </a>
                                    ))}
                                  </div>
                                ) : (
                                  <span>-</span>
                                )}
                              </td>

                              {/* Revenue */}
                              <td className="text-xs">
                                {formatValWithSourceTag(item.revenue)}
                              </td>

                              {/* EV */}
                              <td className="text-xs">
                                {formatValWithSourceTag(item.ev)}
                              </td>

                            </tr>
                          );
                        })}
                </tbody>
              </table>
            </div>

            {/* Phone layout (< md): cards instead of the wide table */}
            <div className="md:hidden">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse space-y-2 border-b border-gray-100 px-4 py-4">
                    <div className="h-4 w-2/3 rounded bg-gray-200" />
                    <div className="h-3 w-full rounded bg-gray-200" />
                    <div className="h-3 w-5/6 rounded bg-gray-200" />
                  </div>
                ))
              ) : items.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-400">No transactions found</p>
              ) : (
                items.map((item) => (
                  <DealRadarMobileCard
                    key={item.company_id}
                    item={item}
                    onNavigate={(href) => router.push(href)}
                  />
                ))
              )}
            </div>
            </>
          )}


          {!error && pagination && (
            <SearchTablePagination
              curPage={page}
              pageTotal={Math.max(1, pagination.total_pages)}
              nextPage={pagination.next_page}
              onPageChange={(next) => {
                if (
                  next >= 1 &&
                  next <= Math.max(1, pagination.total_pages) &&
                  next !== page &&
                  !loading
                ) {
                  setPage(next);
                }
              }}
              disabled={loading}
            />
          )}
        </main>
        {!embedded && <Footer />}
      </div>
    </Shell>
  );
}
