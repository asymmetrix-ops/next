"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchableMultiSelect from "@/components/ui/SearchableMultiSelect";
import {
  getTransactionStatusTone,
  getProcessStageTone,
  getIntermediaryTone,
  getTransactionSignalTone,
  ENTITY_TONES,
} from "@/lib/tagColors";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Sector {
  id: number;
  name: string;
}

interface NamedRef {
  id: number;
  name: string;
}

interface ValSource {
  value: string | null;
  source: string | null;
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
  hq_country: string | null;
  ownership_type: string | null;
  owner_name: string | null;
  primary_sectors: Sector[];
  transaction_status_id: number;
  transaction_status: string;
  transaction_signal: string | null;
  active_status_set_at: string | null;
  process_stage: string | null;
  buyer_type: string[];
  intermediary_type: string | null;
  intermediary: NamedRef | null;
  bidders: NamedRef[];
  revenue: ValSource;
  ev: ValSource;
  potential_acquirers: NamedRef[];
  linked_event: LinkedEvent | null;
  content_cta: ContentCta | null;
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

interface SectorOption {
  id: number;
  sector_name: string;
}

interface CountryOption {
  locations_Country: string;
}

interface DealRadarFilters {
  ownershipTypeIds: number[];
  hqCountries: string[];
  sectorIds: number[];
  transactionStatusIds: number[];
  processStages: string[];
  transactionSignals: string[];
}

const EMPTY_FILTERS: DealRadarFilters = {
  ownershipTypeIds: [],
  hqCountries: [],
  sectorIds: [],
  transactionStatusIds: [],
  processStages: [],
  transactionSignals: [],
};

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au";
const FILTER_API = "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob";
const PAGE_SIZE = 25;
const ANTICIPATED_18_MONTHS_ID = 1;
const TABLE_COL_COUNT = 12;

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
          ? "Anticipated"
          : o.label,
    statusId: o.id,
    totalsKey: o.totalsKey,
  })),
];

const PROCESS_STAGE_OPTIONS = [
  { value: "Strategic Review", label: "Strategic Review" },
  { value: "Banker Pitches", label: "Banker Pitches" },
  { value: "Deal Prep", label: "Deal Prep" },
  { value: "In Market", label: "In Market" },
  { value: "In Exclusivity", label: "In Exclusivity" },
];

const TRANSACTION_SIGNAL_OPTIONS = [
  { value: "Long Hold", label: "Long Hold" },
  { value: "Asymmetrix Assessment", label: "Asymmetrix Assessment" },
  { value: "Proprietary Intel", label: "Proprietary Intel" },
];

const TRANSACTION_SIGNAL_DESCRIPTIONS: Record<string, string> = {
  "Long Hold": "",
  "Asymmetrix Assessment": "",
  "Proprietary Intel": "",
};

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

function isInvalidVal(value: string | null | undefined): boolean {
  if (!value) return true;
  const v = value.trim().toLowerCase();
  return v === "null" || v === "nan" || v === "";
}

function formatVal(val: ValSource): React.ReactNode {
  const v = val?.value;
  const src = val?.source;
  if (isInvalidVal(v)) return <span className="text-gray-300">—</span>;

  const isEst = src && src.startsWith("http");
  const isProp =
    src && !src.startsWith("http") && !isInvalidVal(src);

  return (
    <span className="font-medium text-gray-800">
      {v}m
      {isEst && (
        <abbr
          title={`Estimate — source: ${src}`}
          className="ml-1 text-[10px] text-amber-600 border border-amber-300 rounded px-1 cursor-help no-underline"
        >
          Est.
        </abbr>
      )}
      {isProp && (
        <abbr
          title="Proprietary data"
          className="ml-1 text-[10px] text-blue-600 border border-blue-300 rounded px-1 cursor-help no-underline"
        >
          Prop.
        </abbr>
      )}
    </span>
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

function getContentCtaLabel(cta: ContentCta): string {
  const label = cta.label?.trim();
  if (label) return label;
  if (cta.content_type.toLowerCase().trim() === "news") {
    return "Read our News";
  }
  return "Read our Research";
}

function buildDashboardUrl(
  offset: number,
  search: string,
  filters: DealRadarFilters
): URL {
  const url = new URL(`${API_BASE}/get_deal_radar_dashboard`);
  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set("offset", String(offset));
  if (search) url.searchParams.set("search", search);

  filters.ownershipTypeIds.forEach((id) =>
    url.searchParams.append("ownership_type_ids[]", String(id))
  );
  filters.hqCountries.forEach((c) =>
    url.searchParams.append("hq_countries[]", c)
  );
  filters.sectorIds.forEach((id) =>
    url.searchParams.append("sector_ids[]", String(id))
  );
  filters.transactionStatusIds.forEach((id) =>
    url.searchParams.append("transaction_status_ids[]", String(id))
  );
  filters.processStages.forEach((s) =>
    url.searchParams.append("process_stage[]", s)
  );
  filters.transactionSignals.forEach((s) =>
    url.searchParams.append("transaction_signal[]", s)
  );

  return url;
}

function countActiveFilters(filters: DealRadarFilters): number {
  return (
    filters.ownershipTypeIds.length +
    filters.hqCountries.length +
    filters.sectorIds.length +
    filters.transactionStatusIds.length +
    filters.processStages.length +
    filters.transactionSignals.length
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function TransactionSignalLabel({ signal }: { signal: string }) {
  const tone = getTransactionSignalTone(signal);
  return (
    <div className="group relative mt-1 w-full text-center">
      <p
        className="cursor-help inline-block rounded-full px-2 py-0.5 text-[10.5px] font-bold border"
        style={{
          backgroundColor: tone.fill,
          color: tone.text,
          borderColor: tone.border,
        }}
      >
        {signal}
      </p>
      <div
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-64 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-lg group-hover:block"
      >
        <p className="mb-2 text-[11px] font-semibold text-gray-900">
          Transaction signals
        </p>
        <ul className="space-y-2">
          {TRANSACTION_SIGNAL_OPTIONS.map((opt) => (
            <li key={opt.value}>
              <p
                className={`text-[11px] font-medium ${
                  opt.value === signal ? "text-blue-700" : "text-gray-800"
                }`}
              >
                {opt.label}
              </p>
              {TRANSACTION_SIGNAL_DESCRIPTIONS[opt.value] && (
                <p className="mt-0.5 text-[10px] leading-snug text-gray-500">
                  {TRANSACTION_SIGNAL_DESCRIPTIONS[opt.value]}
                </p>
              )}
            </li>
          ))}
        </ul>
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

export default function DealRadarDashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<DealRadarDashboardItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [statusTotals, setStatusTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<DealRadarFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ownershipTypes, setOwnershipTypes] = useState<OwnershipTypeOption[]>([]);
  const [sectorOptions, setSectorOptions] = useState<SectorOption[]>([]);
  const [countryOptions, setCountryOptions] = useState<CountryOption[]>([]);

  const showAnticipatedSubFilters = filters.transactionStatusIds.includes(
    ANTICIPATED_18_MONTHS_ID
  );

  const activeStatusBubbleId =
    filters.transactionStatusIds.length === 1
      ? filters.transactionStatusIds[0]
      : filters.transactionStatusIds.length === 0
        ? null
        : -1;

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => setDebouncedSearch(searchQuery.trim()),
      300
    );
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

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
        const [ownershipRes, sectorsRes, countriesRes] = await Promise.all([
          fetch(`${FILTER_API}/get_all_ownership_types`, { headers }),
          fetch(`${FILTER_API}/get_all_primary_sectors_dropdown`, { headers }),
          fetch(`${FILTER_API}/locations_country`, { headers }),
        ]);

        if (ownershipRes.ok) {
          const data = (await ownershipRes.json()) as OwnershipTypeOption[];
          setOwnershipTypes(Array.isArray(data) ? data : []);
        }
        if (sectorsRes.ok) {
          const data = (await sectorsRes.json()) as SectorOption[];
          setSectorOptions(Array.isArray(data) ? data : []);
        }
        if (countriesRes.ok) {
          const data = (await countriesRes.json()) as CountryOption[];
          setCountryOptions(Array.isArray(data) ? data : []);
        }
      } catch {
        // Filter options are optional — page still works without them
      }
    }

    loadFilterOptions();
  }, []);

  const fetchData = useCallback(
    async (
      offset = 0,
      append = false,
      search = "",
      activeFilters = EMPTY_FILTERS
    ) => {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("asymmetrix_auth_token")
            : null;
        const url = buildDashboardUrl(offset, search, activeFilters);

        const res = await fetch(url.toString(), {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) throw new Error(`Request failed: ${res.statusText}`);

        const data: DealRadarDashboardResponse = await res.json();
        setItems((prev) =>
          append ? [...prev, ...data.items] : data.items
        );
        setPagination(data.pagination);
        if (!append && data.status_totals) setStatusTotals(data.status_totals);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Re-fetch when search or filters change
  useEffect(() => {
    fetchData(0, false, debouncedSearch, filters);
  }, [fetchData, debouncedSearch, filters]);

  const statusCounts = useMemo<Record<string, number>>(() => {
    const total = Object.values(statusTotals).reduce((a, b) => a + b, 0);
    return { "": total, ...statusTotals };
  }, [statusTotals]);

  const updateFilters = (patch: Partial<DealRadarFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      if (
        patch.transactionStatusIds &&
        !patch.transactionStatusIds.includes(ANTICIPATED_18_MONTHS_ID)
      ) {
        next.processStages = [];
        next.transactionSignals = [];
      }
      return next;
    });
  };

  const handleStatusBubbleClick = (statusId: number | null) => {
    updateFilters({
      transactionStatusIds: statusId ? [statusId] : [],
      processStages: [],
      transactionSignals: [],
    });
  };

  const clearAllFilters = () => setFilters(EMPTY_FILTERS);

  const ownershipSelectOptions = useMemo(
    () =>
      ownershipTypes
        .filter((o) => o.ownership?.trim())
        .map((o) => ({ value: o.id, label: o.ownership })),
    [ownershipTypes]
  );

  const sectorSelectOptions = useMemo(
    () =>
      sectorOptions
        .filter((s) => s.sector_name?.trim())
        .map((s) => ({ value: s.id, label: s.sector_name })),
    [sectorOptions]
  );

  const countrySelectOptions = useMemo(
    () =>
      countryOptions
        .filter((c) => c.locations_Country?.trim())
        .map((c) => ({
          value: c.locations_Country,
          label: c.locations_Country,
        })),
    [countryOptions]
  );

  const transactionStatusSelectOptions = useMemo(
    () =>
      TRANSACTION_STATUS_OPTIONS.map((o) => ({
        value: o.id,
        label: o.label,
      })),
    []
  );

  const Th = ({
    label,
    className = "",
  }: {
    label: string;
    className?: string;
  }) => (
    <th
      className={`px-3 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 ${className}`}
    >
      {label}
    </th>
  );

  const activeFilterCount = countActiveFilters(filters);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 w-full px-4 py-6 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="2" />
                <path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 7.76a6 6 0 0 0 0 8.49" />
                <path d="M20.49 3.51a12 12 0 0 1 0 16.97M3.51 3.51a12 12 0 0 0 0 16.97" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                Deal Radar
              </h1>
              {pagination && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {pagination.total_items} active transactions
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Filter toggle */}
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                filtersOpen || activeFilterCount > 0
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-blue-600 text-white text-[10px] font-semibold px-1.5 py-0.5 min-w-[18px] text-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search company, sector…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Ownership type
                </label>
                <SearchableMultiSelect
                  options={ownershipSelectOptions}
                  selectedValues={filters.ownershipTypeIds}
                  onSelectionChange={(vals) =>
                    updateFilters({ ownershipTypeIds: vals })
                  }
                  placeholder="All ownership types"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  HQ (country)
                </label>
                <SearchableMultiSelect
                  options={countrySelectOptions}
                  selectedValues={filters.hqCountries}
                  onSelectionChange={(vals) =>
                    updateFilters({ hqCountries: vals })
                  }
                  placeholder="All countries"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Primary sector
                </label>
                <SearchableMultiSelect
                  options={sectorSelectOptions}
                  selectedValues={filters.sectorIds}
                  onSelectionChange={(vals) =>
                    updateFilters({ sectorIds: vals })
                  }
                  placeholder="All sectors"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Transaction status
                </label>
                <SearchableMultiSelect
                  options={transactionStatusSelectOptions}
                  selectedValues={filters.transactionStatusIds}
                  onSelectionChange={(vals) =>
                    updateFilters({ transactionStatusIds: vals })
                  }
                  placeholder="All statuses"
                />
              </div>
              <div
                title={
                  showAnticipatedSubFilters
                    ? undefined
                    : "Available when Transaction Anticipated within 18 Months is selected"
                }
              >
                <label
                  className={`mb-1 block text-[11px] font-semibold uppercase tracking-wider ${
                    showAnticipatedSubFilters
                      ? "text-gray-500"
                      : "text-gray-400"
                  }`}
                >
                  Process stage
                </label>
                <SearchableMultiSelect
                  options={PROCESS_STAGE_OPTIONS}
                  selectedValues={filters.processStages}
                  onSelectionChange={(vals) =>
                    updateFilters({ processStages: vals })
                  }
                  placeholder="All stages"
                  disabled={!showAnticipatedSubFilters}
                />
              </div>
              <div
                title={
                  showAnticipatedSubFilters
                    ? undefined
                    : "Available when Transaction Anticipated within 18 Months is selected"
                }
              >
                <label
                  className={`mb-1 block text-[11px] font-semibold uppercase tracking-wider ${
                    showAnticipatedSubFilters
                      ? "text-gray-500"
                      : "text-gray-400"
                  }`}
                >
                  Transaction signal
                </label>
                <SearchableMultiSelect
                  options={TRANSACTION_SIGNAL_OPTIONS}
                  selectedValues={filters.transactionSignals}
                  onSelectionChange={(vals) =>
                    updateFilters({ transactionSignals: vals })
                  }
                  placeholder="All signals"
                  disabled={!showAnticipatedSubFilters}
                />
              </div>
            </div>
          </div>
        )}

        {/* Status filter pills */}
        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => {
            const count =
              f.totalsKey === ""
                ? (statusCounts[""] ?? 0)
                : (statusCounts[f.totalsKey] ?? 0);
            const active =
              f.statusId === null
                ? activeStatusBubbleId === null
                : activeStatusBubbleId === f.statusId;
            const style =
              f.statusId !== null
                ? getStatusStyle(
                    TRANSACTION_STATUS_OPTIONS.find((o) => o.id === f.statusId)
                      ?.label ?? ""
                  )
                : null;
            const pillStyle: React.CSSProperties =
              active && style
                ? {
                    backgroundColor: style.bg,
                    color: style.text,
                    borderColor: style.border,
                  }
                : active
                  ? {
                      backgroundColor: "#2A46EA",
                      color: "#FFFFFF",
                      borderColor: "#2A46EA",
                    }
                  : {};
            return (
              <button
                key={f.statusId ?? "all"}
                type="button"
                onClick={() => handleStatusBubbleClick(f.statusId)}
                style={pillStyle}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  active
                    ? "shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {f.statusId !== null && style && (
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: active ? style.dot : "#D1D5DB" }}
                  />
                )}
                {f.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    active
                      ? "bg-white/40 text-inherit"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Table card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {error ? (
            <div className="p-8 text-center">
              <p className="text-sm text-red-600 font-medium">{error}</p>
              <button
                type="button"
                onClick={() => fetchData(0, false, debouncedSearch, filters)}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1500px] border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-gray-200">
                    <Th label="Company" className="min-w-[160px]" />
                    <Th label="HQ" className="min-w-[100px]" />
                    <Th label="Ownership" className="min-w-[120px]" />
                    <Th label="Primary Sector(s)" className="min-w-[180px]" />
                    <Th label="Transaction Status" className="min-w-[200px]" />
                    <Th label="Process Stage" className="min-w-[130px]" />
                    <Th label="Intermediary" className="min-w-[140px]" />
                    <Th label="Bidders" className="min-w-[140px]" />
                    <Th label="Revenue (m)" className="min-w-[110px]" />
                    <Th label="EV (m)" className="min-w-[100px]" />
                    <Th label="Potential Acquirers" className="min-w-[180px]" />
                    <Th label="Corp. Event" className="min-w-[110px]" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
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
                          const statusStyle = getStatusStyle(
                            item.transaction_status
                          );
                          const isReportedInMarket = item.transaction_status
                            .toLowerCase()
                            .includes("reported");
                          const sectors = item.primary_sectors.map((s) => ({
                            ...s,
                            name: cleanSectorName(s.name),
                          }));

                          return (
                            <tr
                              key={item.company_id}
                              className="hover:bg-blue-50/30 transition-colors align-top group"
                            >
                              {/* Company */}
                              <td className="px-3 py-3">
                                <a
                                  href={`/company/${item.company_id}`}
                                  onClick={(e) => {
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
                                  className="text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline leading-snug"
                                >
                                  {item.name}
                                </a>
                                {item.active_status_set_at && (
                                  <p className="text-[10px] text-gray-400 mt-0.5">
                                    {formatDate(item.active_status_set_at)}
                                  </p>
                                )}
                                {item.content_cta && (
                                  <a
                                    href={`/article/${item.content_cta.id}`}
                                    onClick={(e) => {
                                      if (
                                        e.button !== 0 ||
                                        e.metaKey ||
                                        e.ctrlKey ||
                                        e.shiftKey ||
                                        e.altKey
                                      )
                                        return;
                                      e.preventDefault();
                                      router.push(
                                        `/article/${item.content_cta!.id}`
                                      );
                                    }}
                                    className="mt-0.5 block text-[11.5px] font-medium text-gray-500 hover:text-blue-600 hover:underline"
                                  >
                                    {getContentCtaLabel(item.content_cta)}
                                  </a>
                                )}
                              </td>

                              {/* HQ */}
                              <td className="px-3 py-3 text-xs text-gray-700">
                                {item.hq_country ?? (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>

                              {/* Ownership */}
                              <td className="px-3 py-3 text-xs text-gray-700">
                                {item.ownership_type ? (
                                  <div>
                                    <span className="font-medium">
                                      {item.ownership_type}
                                    </span>
                                    {item.owner_name && (
                                      <p className="text-[10px] text-gray-500 mt-0.5">
                                        {item.owner_name}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>

                              {/* Sectors */}
                              <td className="px-3 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {sectors.length > 0 ? (
                                    sectors.map((s) => (
                                      <a
                                        key={`${s.id}-${s.name}`}
                                        href={
                                          s.id > 0 ? `/sector/${s.id}` : undefined
                                        }
                                        onClick={
                                          s.id > 0
                                            ? (e) => {
                                                if (
                                                  e.button !== 0 ||
                                                  e.metaKey ||
                                                  e.ctrlKey ||
                                                  e.shiftKey ||
                                                  e.altKey
                                                )
                                                  return;
                                                e.preventDefault();
                                                router.push(`/sector/${s.id}`);
                                              }
                                            : undefined
                                        }
                                        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                          s.id > 0
                                            ? "bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
                                            : "bg-gray-100 text-gray-600 cursor-default"
                                        }`}
                                      >
                                        {s.name}
                                      </a>
                                    ))
                                  ) : (
                                    <span className="text-gray-300 text-xs">
                                      —
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Transaction Status + Signal */}
                              <td className="px-3 py-3">
                                <div className="inline-flex flex-col items-center">
                                  <span
                                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                                    style={{
                                      backgroundColor: statusStyle.bg,
                                      color: statusStyle.text,
                                      borderColor: "transparent",
                                    }}
                                  >
                                    <span
                                      className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                                      style={{ backgroundColor: statusStyle.dot }}
                                    />
                                    {item.transaction_status}
                                  </span>
                                  {item.transaction_signal && (
                                    <TransactionSignalLabel
                                      signal={item.transaction_signal}
                                    />
                                  )}
                                </div>
                              </td>

                              {/* Process Stage — hue varies by value, tags.txt §5 */}
                              <td className="px-3 py-3 text-xs text-gray-700">
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
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>

                              {/* Intermediary — tags.txt §6 */}
                              <td className="px-3 py-3 text-xs text-gray-700">
                                {item.intermediary && item.intermediary.name ? (
                                  (() => {
                                    const tone = getIntermediaryTone(undefined);
                                    return (
                                      <a
                                        href={`/advisor/${item.intermediary.id}`}
                                        className="inline-block rounded-full border text-[11px] font-medium px-2 py-0.5"
                                        style={{
                                          backgroundColor: tone.fill,
                                          color: tone.text,
                                          borderColor: tone.border,
                                        }}
                                      >
                                        {item.intermediary.name}
                                      </a>
                                    );
                                  })()
                                ) : item.intermediary_type &&
                                  item.intermediary_type !== "No Intermediary" ? (
                                  (() => {
                                    const tone = getIntermediaryTone(item.intermediary_type);
                                    return (
                                      <span
                                        className="inline-block rounded-full border text-[11px] font-medium px-2 py-0.5"
                                        style={{
                                          backgroundColor: tone.fill,
                                          color: tone.text,
                                          borderColor: tone.border,
                                        }}
                                      >
                                        {item.intermediary_type}
                                      </span>
                                    );
                                  })()
                                ) : item.intermediary_type === "No Intermediary" ? (
                                  (() => {
                                    const tone = getIntermediaryTone("No Intermediary");
                                    return (
                                      <span
                                        className="inline-block rounded-full border text-[11px] font-medium px-2 py-0.5"
                                        style={{
                                          backgroundColor: tone.fill,
                                          color: tone.text,
                                          borderColor: tone.border,
                                        }}
                                      >
                                        No Intermediary
                                      </span>
                                    );
                                  })()
                                ) : (
                                  (() => {
                                    const tone = getIntermediaryTone("Unknown");
                                    return (
                                      <span
                                        className="inline-block rounded-full text-[11px] font-medium px-2 py-0.5"
                                        style={{
                                          backgroundColor: tone.fill,
                                          color: tone.text,
                                          border: `1px dashed ${tone.border}`,
                                        }}
                                      >
                                        Unknown
                                      </span>
                                    );
                                  })()
                                )}
                              </td>

                              {/* Bidders — entity chip, tags.txt §10 (Companies · green) */}
                              <td className="px-3 py-3">
                                {item.bidders.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {item.bidders.map((b) => (
                                      <a
                                        key={b.id}
                                        href={`/company/${b.id}`}
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
                                  <span className="text-gray-300 text-xs">—</span>
                                )}
                              </td>

                              {/* Revenue */}
                              <td className="px-3 py-3 text-xs">
                                {formatVal(item.revenue)}
                              </td>

                              {/* EV */}
                              <td className="px-3 py-3 text-xs">
                                {formatVal(item.ev)}
                              </td>

                              {/* Potential Acquirers */}
                              <td className="px-3 py-3">
                                {item.potential_acquirers.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {item.potential_acquirers.map((acq) => (
                                      <a
                                        key={acq.id}
                                        href={`/company/${acq.id}`}
                                        onClick={(e) => {
                                          if (
                                            e.button !== 0 ||
                                            e.metaKey ||
                                            e.ctrlKey ||
                                            e.shiftKey ||
                                            e.altKey
                                          )
                                            return;
                                          e.preventDefault();
                                          router.push(`/company/${acq.id}`);
                                        }}
                                        className="entity-chip-company inline-block rounded-full text-[10.5px] font-semibold px-2 py-0.5 transition-colors"
                                        style={{
                                          backgroundColor: ENTITY_TONES.company.fill,
                                          color: ENTITY_TONES.company.text,
                                        }}
                                      >
                                        {acq.name}
                                      </a>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-300 text-xs">—</span>
                                )}
                              </td>

                              {/* Corporate Event link (only when Reported in Market) */}
                              <td className="px-3 py-3">
                                {item.linked_event && isReportedInMarket ? (
                                  <a
                                    href={`/corporate-event/${item.linked_event.id}`}
                                    onClick={(e) => {
                                      if (
                                        e.button !== 0 ||
                                        e.metaKey ||
                                        e.ctrlKey ||
                                        e.shiftKey ||
                                        e.altKey
                                      )
                                        return;
                                      e.preventDefault();
                                      router.push(
                                        `/corporate-event/${item.linked_event!.id}`
                                      );
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-900 hover:underline"
                                  >
                                    <svg
                                      className="w-3 h-3 shrink-0"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      aria-hidden="true"
                                    >
                                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                      <polyline points="15 3 21 3 21 9" />
                                      <line x1="10" y1="14" x2="21" y2="3" />
                                    </svg>
                                    {formatDate(
                                      item.linked_event.announcement_date
                                    )}
                                  </a>
                                ) : (
                                  <span className="text-gray-300 text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                </tbody>
              </table>
            </div>
          )}

          {/* Load more / Pagination footer */}
          {!loading && !error && pagination?.has_next_page && (
            <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Showing {items.length} of {pagination.total_items} transactions
              </p>
              <button
                type="button"
                disabled={loadingMore}
                onClick={() =>
                  fetchData(
                    pagination.next_offset ?? items.length,
                    true,
                    debouncedSearch,
                    filters
                  )
                }
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {loadingMore ? (
                  <>
                    <svg
                      className="w-3.5 h-3.5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Loading…
                  </>
                ) : (
                  `Load more (${pagination.total_items - items.length} remaining)`
                )}
              </button>
            </div>
          )}
          {!loading && !error && !pagination?.has_next_page && items.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2.5 text-center text-xs text-gray-400">
              All {pagination?.total_items ?? items.length} transactions loaded
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-gray-500">
          <span className="font-semibold text-gray-600">Legend:</span>
          <span>
            <abbr className="no-underline border border-amber-300 text-amber-600 rounded px-1 mr-1">
              Est.
            </abbr>
            Revenue / EV is an estimate (third-party source)
          </span>
          <span>
            <abbr className="no-underline border border-blue-300 text-blue-600 rounded px-1 mr-1">
              Prop.
            </abbr>
            Revenue / EV is proprietary data
          </span>
          <span className="text-gray-400">
            Corporate event link shown when Transaction Status is Reported in
            Market.
          </span>
        </div>
      </main>
      <Footer />
    </div>
  );
}
