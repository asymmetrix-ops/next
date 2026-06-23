"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FollowedOnlyEmptyState } from "@/components/FollowedOnlyEmptyState";
import { InlineFollowButton } from "@/components/InlineFollowButton";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CompactPagination from "@/components/ui/CompactPagination";

const BulkAddToPortfolioModal = dynamic(
  () => import("@/components/companies/BulkAddToPortfolioModal").then((m) => ({ default: m.BulkAddToPortfolioModal })),
  { ssr: false }
);
import {
  CompaniesCSVExporter,
  CompanyCSVRow as BaseCompanyCSVRow,
} from "@/utils/companiesCSVExport";
const ExportLimitModal = dynamic(
  () => import("@/components/ExportLimitModal").then((m) => ({ default: m.ExportLimitModal })),
  { ssr: false }
);
import { checkExportLimit, EXPORT_LIMIT } from "@/utils/exportLimitCheck";
import {
  fetchCompaniesServer,
  fetchCompaniesCountsServer,
  CompaniesFilters as ServerFilters,
  type CompaniesFilters,
} from "./actions";
import {
  COMPANIES_API_BASE,
  companySearchPayloadToSearchParams,
} from "@/lib/companiesFilterPayload";
import {
  CompaniesSearchDashboard as CompanyDashboard,
  EMPTY_OWNERSHIP_COUNTS,
  type CompaniesOwnershipCounts,
} from "@/components/companies/CompaniesSearchDashboard";
const ColumnsControlRoom = dynamic(
  () => import("@/components/companies/ColumnsControlRoom").then((m) => ({ default: m.ColumnsControlRoom })),
  { ssr: false }
);
import {
  CANONICAL_COMPANY_COLUMN_KEYS,
  DEFAULT_VISIBLE_COMPANY_COLUMN_KEYS,
  PROD_DEFAULT_COMPANY_COLUMN_KEYS,
  FROZEN_COLUMN_KEYS,
  ALL_COMPANIES_COLUMN_META,
  enforceColumnKeyOrder,
  getEffectiveFrozenColumnKeys,
  columnKeysToVisibility,
  visibilityToColumnKeys,
  reorderColumnKeys,
} from "@/components/companies/companiesColumnCategories";
import {
  FILTER_PINNED_TOOLTIP,
  getColumnKeysForActiveFilters,
} from "@/components/companies/companiesColumnFilterMap";
import {
  compareSortValues,
  getApiSortColumn,
  getColumnSortKind,
  getSortPayloadFromState,
  getSortValueForColumn,
} from "@/components/companies/companiesTableSort";
import { formatWebsiteLabel, normalizeWebsiteUrl } from "@/lib/websiteUrl";
import { normalizeLinkedInProfileUrl } from "@/lib/linkedinUrl";
import { formatCompanyColumnDisplay } from "@/lib/companyTableData";
import {
  getApiColumnsForSelectedKeys,
  getApiColumnsSignature,
} from "@/components/companies/companiesApiColumns";
import {
  getFieldAliasesForColumn,
  LIST_JSON_COLUMN_KEYS,
} from "@/components/companies/companiesColumnFields";

// Feature flags (master only)
// Extended CSV row type that includes financial and subscription metrics
interface CompanyCSVRow extends BaseCompanyCSVRow {
  Revenue?: string;
  EBITDA?: string;
  "Enterprise Value"?: string;
  "Revenue Multiple"?: string;
  "Revenue Growth"?: string;
  "EBITDA Margin"?: string;
  "Rule of 40"?: string;
  ARR?: string;
  Churn?: string;
  GRR?: string;
  NRR?: string;
  "New Clients Revenue Growth"?: string;
}

// Types for API integration
type SectorRef =
  | string
  | {
      id?: number;
      sector_name?: string;
      name?: string;
    };

interface Company {
  id: number;
  name: string;
  description?: string;
  primary_sectors?: SectorRef[] | string;
  secondary_sectors?: SectorRef[] | string;
  ownership_type_id?: number;
  ownership?: string;
  country?: string;
  linkedin_logo?: string;
  linkedin_members_latest?: number;
  linkedin_members_old?: number;
  linkedin_members?: number;
  [key: string]: unknown;
  last_investment?: {
    display?: string | null;
    date?: string | null;
    days_since?: number | string | null;
  } | null;
}

type Filters = CompaniesFilters;

const createDefaultFilters = (): Filters => ({
  filters_sql: null,
  has_financial_filters: false,
  has_year_filter: false,
  query: null,
  columns: [],
});

// Shape returned by export API when sending JSON instead of CSV
interface ExportCompanyJson {
  id?: number | string;
  name?: string;
  description?: string;
  primary_sectors?: string | string[];
  secondary_sectors?: string | string[];
  ownership?: string;
  linkedin_members?: number | string;
  country?: string;
  asymmetrix_url?: string;
  company_link?: string;
  // Financial Metrics (exact API field names)
  Revenue_m?: number | string;
  EBITDA_m?: number | string;
  EV?: number | string;
  Revenue_multiple?: number | string;
  Rev_Growth_PC?: number | string;
  EBITDA_margin?: number | string;
  Rule_of_40?: number | string;
  // Subscription Metrics (exact API field names)
  ARR_pc?: number | string; // Recurring Revenue percentage
  ARR_m?: number | string;
  Churn_pc?: number | string;
  GRR_pc?: number | string;
  NRR?: number | string;
  New_client_growth_pc?: number | string;
  Financial_Year?: number | string;
}

// Shared styles object

// Utility functions
const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return "0";
  return num.toLocaleString();
};

// Type guard for export JSON items
const isExportCompanyJson = (value: unknown): value is ExportCompanyJson => {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  // At minimum require a name or description to exist as a string
  return (
    typeof obj.name === "string" ||
    typeof obj.description === "string" ||
    typeof obj.country === "string"
  );
};


const useCompaniesAPI = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRequestIdRef = useRef(0);
  const lastCountsRequestIdRef = useRef(0);
  const countsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentFiltersRef = useRef<Filters | undefined>(undefined);
  const currentCountsFiltersRef = useRef<Filters | undefined>(undefined);
  const requestColumnsRef = useRef<string[]>([]);
  const [currentFilters, setCurrentFilters] = useState<Filters | undefined>(
    undefined
  );
  const [pagination, setPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    perPage: 20,
    pageTotal: 0,
  });
  const [ownershipCounts, setOwnershipCounts] =
    useState<CompaniesOwnershipCounts>(EMPTY_OWNERSHIP_COUNTS);

  const setRequestColumns = useCallback((columns: string[]) => {
    requestColumnsRef.current = columns;
  }, []);

  const scheduleCountsFetch = useCallback((countsFilters: ServerFilters) => {
    if (countsTimeoutRef.current) clearTimeout(countsTimeoutRef.current);
    countsTimeoutRef.current = setTimeout(() => {
      const countsRequestId = ++lastCountsRequestIdRef.current;
      void fetchCompaniesCountsServer(countsFilters)
        .then((countsData) => {
          if (countsRequestId !== lastCountsRequestIdRef.current || !countsData) {
            return;
          }
          setOwnershipCounts({
            totalCount: countsData.totalCount || 0,
            publicCompanies: countsData.publicCompanies || 0,
            peOwnedCompanies: countsData.peOwnedCompanies || 0,
            vcOwnedCompanies: countsData.vcOwnedCompanies || 0,
            privateCompanies: countsData.privateCompanies || 0,
            subsidiaryCompanies: countsData.subsidiaryCompanies || 0,
            acquiredCompanies: countsData.acquiredCompanies || 0,
            otherCompanies: countsData.otherCompanies || 0,
          });
        })
        .catch((countsError) => {
          console.error("Error fetching companies counts:", countsError);
        });
    }, 400);
  }, []);

  const fetchCompanies = useCallback(
    async (page: number = 1, filters?: Filters, countsFilters?: Filters) => {
      const requestId = ++lastRequestIdRef.current;
      setLoading(true);
      setError(null);

      if (filters !== undefined) {
        currentFiltersRef.current = filters;
        setCurrentFilters(filters);
      }
      if (countsFilters !== undefined) {
        currentCountsFiltersRef.current = countsFilters;
      }

      const filtersToUse =
        filters !== undefined ? filters : currentFiltersRef.current ?? createDefaultFilters();
      const countsFiltersToUse =
        countsFilters ??
        currentCountsFiltersRef.current ??
        filtersToUse;

      try {
        const serverFilters: ServerFilters = {
          ...filtersToUse,
          columns: requestColumnsRef.current,
        };
        const countsServerFilters: ServerFilters = {
          ...countsFiltersToUse,
          columns: requestColumnsRef.current,
        };

        if (page === 1) {
          scheduleCountsFetch(countsServerFilters);
        }

        const data = await fetchCompaniesServer(page, serverFilters);

        if (!data) {
          throw new Error("Failed to fetch companies - authentication required");
        }

        if (requestId === lastRequestIdRef.current) {
          setCompanies((data.result1?.items || []) as Company[]);
          setPagination({
            itemsReceived: data.result1?.itemsReceived || 0,
            curPage: data.result1?.curPage || 1,
            nextPage: data.result1?.nextPage || null,
            prevPage: data.result1?.prevPage || null,
            offset: data.result1?.offset || 0,
            perPage: data.result1?.perPage || 20,
            pageTotal: data.result1?.pageTotal || 0,
          });
        }
      } catch (err) {
        if (requestId === lastRequestIdRef.current) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch companies"
          );
        }
        console.error("Error fetching companies:", err);
      } finally {
        if (requestId === lastRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [scheduleCountsFetch]
  );

  return {
    companies,
    loading,
    error,
    pagination,
    ownershipCounts,
    fetchCompanies,
    setRequestColumns,
    currentFilters,
  };
};

// Company Logo Component
const CompanyLogo = ({ logo, name }: { logo: string; name: string }) => (
  <div className="company-logo-cell">
    {logo ? (
      <Image
        src={`data:image/jpeg;base64,${logo}`}
        alt={`${name} logo`}
        width={60}
        height={40}
        className="company-logo"
        style={{ objectFit: "contain" }}
      />
    ) : (
      <div className="company-logo-placeholder">No Logo</div>
    )}
  </div>
);

// Helper to get sector info from API response


const getSectorInfo = (sector: unknown): { name: string; id?: number } => {
  if (typeof sector === "string") return { name: sector };
  if (!sector || typeof sector !== "object") return { name: "" };
  const rec = sector as Record<string, unknown>;
  const nameRaw =
    (typeof rec.sector_name === "string" && rec.sector_name) ||
    (typeof rec.name === "string" && rec.name) ||
    "";
  const idRaw = rec.id;
  const id = typeof idRaw === "number" ? idRaw : undefined;
  return { name: String(nameRaw), id };
};

const renderSectorLinks = (
  sectors: unknown[] | undefined,
  kind: "primary" | "secondary"
): React.ReactNode => {
  if (!Array.isArray(sectors) || sectors.length === 0) return "-";

  const nodes: React.ReactNode[] = [];
  sectors.forEach((s, index) => {
    const { name, id } = getSectorInfo(s);
    const label = String(name ?? "").trim();
    if (!label) return;

    const href =
      id != null
        ? kind === "primary"
          ? `/sector/${id}`
          : `/sub-sector/${id}`
        : undefined;

    nodes.push(
      href ? (
        <a
          key={`${kind}-${id}-${label}-${index}`}
          href={href}
          className="text-blue-600 underline hover:text-blue-800"
        >
          {label}
        </a>
      ) : (
        <span key={`${kind}-${label}-${index}`}>{label}</span>
      )
    );

    if (index < sectors.length - 1) nodes.push(<span key={`sep-${kind}-${index}`}>, </span>);
  });

  return nodes.length > 0 ? nodes : "-";
};

const getInvestorInfo = (investor: unknown): { name: string; id?: number } => {
  if (typeof investor === "string" || typeof investor === "number") {
    const name = String(investor).trim();
    return name ? { name } : { name: "" };
  }
  if (!investor || typeof investor !== "object") return { name: "" };
  const rec = investor as Record<string, unknown>;
  const name = String(
    rec.name ?? rec.investor_name ?? rec.company_name ?? ""
  ).trim();
  const idRaw =
    rec.investor_id ?? rec.original_new_company_id ?? rec.id;
  const id =
    typeof idRaw === "number" && Number.isFinite(idRaw) && idRaw > 0
      ? idRaw
      : undefined;
  return { name, id };
};

const readInvestorsFromCompany = (company: Company): unknown[] => {
  const rec = company as unknown as Record<string, unknown>;

  const structuredKeys = [
    "investors",
    "_companies_investors",
    "investors_new_company",
  ] as const;

  for (const key of structuredKeys) {
    const items = parseListField(rec[key]);
    if (items.length === 0) continue;
    if (items.some((item) => getInvestorInfo(item).id != null)) {
      return items;
    }
  }

  for (const key of ["_companies_investors", "investors_new_company"] as const) {
    const items = parseListField(rec[key]);
    if (items.length > 0) return items;
  }

  const fromInvestors = parseListField(rec.investors);
  if (fromInvestors.length > 0) return fromInvestors;

  return parseListField(rec.investor_names);
};

const renderInvestorLinks = (investors: unknown[]): React.ReactNode => {
  if (!Array.isArray(investors) || investors.length === 0) return "-";

  const nodes: React.ReactNode[] = [];
  investors.forEach((investor, index) => {
    const { name, id } = getInvestorInfo(investor);
    if (!name) return;

    const href = id != null ? `/investors/${id}` : undefined;
    nodes.push(
      href ? (
        <a
          key={`investor-${id}-${name}-${index}`}
          href={href}
          className="text-blue-600 underline hover:text-blue-800"
          onClick={(e) => e.stopPropagation()}
        >
          {name}
        </a>
      ) : (
        <span key={`investor-${name}-${index}`}>{name}</span>
      )
    );

    if (index < investors.length - 1) {
      nodes.push(<span key={`investor-sep-${index}`}>, </span>);
    }
  });

  return nodes.length > 0 ? nodes : "-";
};

type CompanyColumnRenderContext = {
  index: number;
  onCompanyClick: (companyId: number) => void;
};

interface CompanyColumnDefinition {
  key: string;
  label: string;
  group: string;
  wrap?: boolean;
  minWidth?: number;
  render: (
    company: Company,
    context: CompanyColumnRenderContext
  ) => React.ReactNode;
}

const COMPANIES_COLUMNS_STORAGE_KEY = "companies-search-column-keys-v1";

/** Normalize API list fields (sectors, investors) from arrays, JSON strings, or objects. */
const parseListField = (value: unknown): unknown[] => {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "[]" || trimmed === "{}") return [];
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === "object") return Object.values(parsed);
      } catch {
        // Fall through.
      }
    }
    return trimmed
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>);
  }
  return [];
};

const toPlainText = (value: unknown): string => {
  if (value == null || value === "") return "-";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString() : "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "[]" || trimmed === "{}") return "-";
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed) || (parsed && typeof parsed === "object")) {
          return toPlainText(parsed);
        }
      } catch {
        // Fall through to plain string.
      }
    }
    return trimmed;
  }
  if (Array.isArray(value)) {
    const text = value
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") return String(item);
        if (item && typeof item === "object") {
          const rec = item as Record<string, unknown>;
          return (
            rec.name ??
            rec.sector_name ??
            rec.investor_name ??
            rec.Product_Type ??
            rec.Data_Collection_Method ??
            rec.Revenue_Model_ ??
            ""
          );
        }
        return "";
      })
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(", ");
    return text || "-";
  }
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const preferred =
      rec.name ??
      rec.ownership ??
      rec.sector_name ??
      rec.City ??
      rec.Country ??
      rec.Currency ??
      rec.display ??
      rec.label;
    if (preferred != null) return toPlainText(preferred);
    return "-";
  }
  return String(value);
};

const readCompanyValue = (company: Company, aliases: string[]): unknown => {
  const rec = company as unknown as Record<string, unknown>;
  for (const alias of aliases) {
    const parts = alias.split(".");
    let current: unknown = rec;
    for (const part of parts) {
      if (!current || typeof current !== "object") {
        current = undefined;
        break;
      }
      current = (current as Record<string, unknown>)[part];
    }
    if (current != null && current !== "") return current;
  }
  return undefined;
};

const COLUMN_TYPE_BY_KEY = new Map(
  ALL_COMPANIES_COLUMN_META.map((column) => [column.columnKey, column.type])
);

const makeTextColumn = (
  key: string,
  label: string,
  group: string,
  options: Pick<CompanyColumnDefinition, "wrap" | "minWidth"> = {}
): CompanyColumnDefinition => ({
  key,
  label,
  group,
  ...options,
  render: (company) => {
    if (key === "years_since_last_investment") {
      return toPlainText(company.years_since_last_investment);
    }
    const raw = readCompanyValue(company, [...getFieldAliasesForColumn(key)]);
    if (LIST_JSON_COLUMN_KEYS.has(key)) {
      const items = parseListField(raw);
      return toPlainText(items.length > 0 ? items : raw);
    }
    const columnType = COLUMN_TYPE_BY_KEY.get(key) ?? "text";
    if (columnType === "text" || columnType === "paragraph" || columnType === "url") {
      return toPlainText(raw);
    }
    return formatCompanyColumnDisplay(key, columnType, raw);
  },
});

const COMPANY_COLUMN_GROUPS: Array<{ group: string; cols: CompanyColumnDefinition[] }> = [
  {
    group: "Identity",
    cols: [
      {
        key: "logo",
        label: "Logo",
        group: "Identity",
        minWidth: 88,
        render: (company) => (
          <CompanyLogo logo={String(company.linkedin_logo || "")} name={company.name} />
        ),
      },
      {
        key: "name",
        label: "Name",
        group: "Identity",
        minWidth: 160,
        render: (company, { onCompanyClick }) => (
          <a
            href={`/company/${company.id}`}
            className="company-name"
            style={{ textDecoration: "none", color: "#3b82f6" }}
            onClick={(e) => {
              if (
                e.defaultPrevented ||
                e.button !== 0 ||
                e.metaKey ||
                e.ctrlKey ||
                e.shiftKey ||
                e.altKey
              ) {
                return;
              }
              e.preventDefault();
              onCompanyClick(company.id);
            }}
          >
            {company.name || "-"}
          </a>
        ),
      },
      {
        key: "website",
        label: "Website",
        group: "Identity",
        wrap: true,
        minWidth: 220,
        render: (company) => {
          const raw = readCompanyValue(company, [
            ...getFieldAliasesForColumn("website"),
          ]);
          const href = normalizeWebsiteUrl(raw);
          if (!href) return toPlainText(raw);
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="company-website-link"
              style={{ color: "#3b82f6", textDecoration: "none" }}
              onClick={(e) => e.stopPropagation()}
            >
              {formatWebsiteLabel(href)}
            </a>
          );
        },
      },
    ],
  },
  {
    group: "Lists",
    cols: [
      {
        key: "follow",
        label: "My Portfolio",
        group: "Lists",
        minWidth: 120,
        render: (company) => {
          const id =
            typeof company.id === "number"
              ? company.id
              : Number.parseInt(String(company.id ?? ""), 10);
          if (!Number.isFinite(id) || id <= 0) return null;
          return (
            <div
              className="company-follow-cell"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <InlineFollowButton
                followKey="followed_companies"
                entityId={id}
                label={String(company.name || "")}
                icon="star"
              />
            </div>
          );
        },
      },
    ],
  },
  {
    group: "Default",
    cols: [
      {
        key: "description",
        label: "Description",
        group: "Default",
        wrap: true,
        minWidth: 280,
        render: (company, { index }) => (
          <CompanyDescription description={company.description || "-"} index={index} />
        ),
      },
      {
        key: "primary_sectors",
        label: "Primary Sector(s)",
        group: "Default",
        wrap: true,
        minWidth: 190,
        render: (company) =>
          renderSectorLinks(parseListField(company.primary_sectors), "primary"),
      },
      {
        key: "secondary_sectors",
        label: "Secondary Sector(s)",
        group: "Default",
        wrap: true,
        minWidth: 190,
        render: (company) =>
          renderSectorLinks(parseListField(company.secondary_sectors), "secondary"),
      },
      makeTextColumn("ownership", "Ownership", "Default"),
      makeTextColumn("linkedin_members", "LinkedIn Members", "Default", {
        minWidth: 130,
      }),
      makeTextColumn("hq", "HQ", "Default", { wrap: true, minWidth: 220 }),
    ],
  },
  {
    group: "Overview",
    cols: [
      makeTextColumn("year_founded", "Year Founded", "Overview"),
      makeTextColumn("city", "City", "Overview"),
      makeTextColumn("state", "State/Province", "Overview"),
      {
        key: "linkedin_url",
        label: "LinkedIn URL",
        group: "Overview",
        wrap: true,
        minWidth: 220,
        render: (company) => {
          const raw = readCompanyValue(company, [
            ...getFieldAliasesForColumn("linkedin_url"),
          ]);
          const href =
            normalizeLinkedInProfileUrl(raw) ?? normalizeWebsiteUrl(raw);
          if (!href) return toPlainText(raw);
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="company-website-link"
              style={{ color: "#3b82f6", textDecoration: "none" }}
              onClick={(e) => e.stopPropagation()}
            >
              {formatWebsiteLabel(href)}
            </a>
          );
        },
      },
      makeTextColumn("linkedin_growth", "LinkedIn Growth (%)", "Overview"),
      {
        key: "investors",
        label: "Investors",
        group: "Overview",
        wrap: true,
        minWidth: 220,
        render: (company) => renderInvestorLinks(readInvestorsFromCompany(company)),
      },
      makeTextColumn("years_since_last_investment", "Years Since Last Investment", "Overview", {
        minWidth: 190,
      }),
      makeTextColumn("lifecycle_stage", "Lifecycle Stage", "Overview"),
      makeTextColumn("product_type", "Product Type", "Overview", {
        wrap: true,
        minWidth: 220,
      }),
      makeTextColumn("data_collection_method", "Data Collection Method", "Overview", {
        wrap: true,
        minWidth: 220,
      }),
      makeTextColumn("revenue_model", "Revenue Model", "Overview", {
        wrap: true,
        minWidth: 220,
      }),
      makeTextColumn("transaction_status", "Transaction Status", "Overview", {
        wrap: true,
        minWidth: 200,
      }),
    ],
  },
  {
    group: "Financial Metrics",
    cols: [
      makeTextColumn("revenue_m", "Revenue (m)", "Financial Metrics"),
      makeTextColumn("ebitda_m", "EBITDA (m)", "Financial Metrics"),
      makeTextColumn("enterprise_value", "Enterprise Value (m)", "Financial Metrics"),
      makeTextColumn("revenue_multiple", "Revenue Multiple", "Financial Metrics"),
      makeTextColumn("revenue_growth", "Revenue Growth", "Financial Metrics"),
      makeTextColumn("ebitda_margin", "EBITDA Margin", "Financial Metrics"),
      makeTextColumn("rule_of_40", "Rule of 40", "Financial Metrics"),
    ],
  },
  {
    group: "Subscription Metrics",
    cols: [
      makeTextColumn("arr_pc", "Recurring Revenue", "Subscription Metrics"),
      makeTextColumn("arr_m", "ARR (m)", "Subscription Metrics"),
      makeTextColumn("churn_pc", "Churn", "Subscription Metrics"),
      makeTextColumn("grr_pc", "GRR", "Subscription Metrics"),
      makeTextColumn("nrr", "NRR", "Subscription Metrics"),
      makeTextColumn("new_client_growth_pc", "New Clients Revenue Growth", "Subscription Metrics"),
      makeTextColumn("upsell_pc", "Upsell", "Subscription Metrics"),
      makeTextColumn("cross_sell_pc", "Cross-sell", "Subscription Metrics"),
      makeTextColumn("price_increase_pc", "Price Increase", "Subscription Metrics"),
      makeTextColumn("rev_expansion_pc", "Revenue Expansion", "Subscription Metrics"),
    ],
  },
  {
    group: "Other Metrics",
    cols: [
      makeTextColumn("ebit_m", "EBIT (m)", "Other Metrics"),
      makeTextColumn("no_of_clients", "Number of Clients", "Other Metrics"),
      makeTextColumn("rev_per_client", "Revenue per Client", "Other Metrics"),
      makeTextColumn("no_employees", "Number of Employees", "Other Metrics"),
      makeTextColumn("rev_per_employee", "Revenue per Employee", "Other Metrics"),
      makeTextColumn("financial_year", "Financial Year", "Other Metrics"),
    ],
  },
];

const ALL_COMPANY_COLUMNS = COMPANY_COLUMN_GROUPS.flatMap((group) => group.cols);
const ALL_COMPANY_COLUMN_KEYS = CANONICAL_COMPANY_COLUMN_KEYS;
const DEFAULT_COMPANY_COLUMN_KEYS = DEFAULT_VISIBLE_COMPANY_COLUMN_KEYS;

const getValidColumnKeys = (
  keys: string[],
  filterPinnedKeys: string[] = []
): string[] => {
  const seen = new Set<string>();
  const valid: string[] = [];
  keys.forEach((key) => {
    const normalizedKey = key === "country" ? "hq" : key;
    if (ALL_COMPANY_COLUMN_KEYS.includes(normalizedKey) && !seen.has(normalizedKey)) {
      seen.add(normalizedKey);
      valid.push(normalizedKey);
    }
  });
  return enforceColumnKeyOrder(
    valid.length > 0 ? valid : [...PROD_DEFAULT_COMPANY_COLUMN_KEYS],
    filterPinnedKeys
  );
};

// Company Card Component for Mobile - Optimized with React state
const CompanyCardBase = ({
  company,
}: {
  company: Company;
  index: number;
}) => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCompanyClick = () => {
    router.push(`/company/${company.id}`);
  };

  const description = company.description || "-";
  const isLong = description.length > 250;

  // Just use the primary sectors from the API - no derivation needed
  const computedPrimarySectors = React.useMemo(
    () => parseListField(company.primary_sectors),
    [company.primary_sectors]
  );

  return React.createElement(
    "div",
    { className: "company-card" },
    React.createElement(
      "div",
      { className: "company-card-header" },
      company.linkedin_logo
        ? React.createElement("img", {
            src: `data:image/jpeg;base64,${company.linkedin_logo}`,
            alt: `${company.name} logo`,
            className: "company-card-logo",
            loading: "lazy",
            onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
              (e.target as HTMLImageElement).style.display = "none";
            },
          })
        : React.createElement(
            "div",
            { className: "company-card-logo-placeholder" },
            "No Logo"
          ),
      React.createElement(
        "span",
        {
          className: "company-card-name",
          onClick: handleCompanyClick,
        },
        company.name || "-"
      )
    ),
    React.createElement(
      "div",
      { className: "company-card-content" },
      React.createElement(
        "div",
        { className: "company-card-row" },
        React.createElement(
          "span",
          { className: "company-card-label" },
          "Primary Sectors:"
        ),
        React.createElement(
          "span",
          { className: "company-card-value" },
          computedPrimarySectors.length > 0
            ? renderSectorLinks(computedPrimarySectors as unknown[], "primary")
            : "-"
        )
      ),
      React.createElement(
        "div",
        { className: "company-card-row" },
        React.createElement(
          "span",
          { className: "company-card-label" },
          "Secondary Sectors:"
        ),
        React.createElement(
          "span",
          { className: "company-card-value" },
          parseListField(company.secondary_sectors).length > 0
            ? renderSectorLinks(parseListField(company.secondary_sectors), "secondary")
            : "-"
        )
      ),
      React.createElement(
        "div",
        { className: "company-card-row" },
        React.createElement(
          "span",
          { className: "company-card-label" },
          "Ownership:"
        ),
        React.createElement(
          "span",
          { className: "company-card-value" },
          company.ownership || "-"
        )
      ),
      React.createElement(
        "div",
        { className: "company-card-row" },
        React.createElement(
          "span",
          { className: "company-card-label" },
          "LinkedIn Members:"
        ),
        React.createElement(
          "span",
          { className: "company-card-value" },
          formatNumber(company.linkedin_members)
        )
      ),
      React.createElement(
        "div",
        { className: "company-card-row" },
        React.createElement(
          "span",
          { className: "company-card-label" },
          "HQ:"
        ),
        React.createElement(
          "span",
          { className: "company-card-value" },
          toPlainText(
            readCompanyValue(company, [...getFieldAliasesForColumn("hq")])
          )
        )
      ),
      React.createElement(
        "div",
        { className: "company-card-description" },
        React.createElement(
          "div",
          {
            className: isExpanded ? "" : "company-card-description-truncated",
          },
          isExpanded || !isLong ? description : `${description.substring(0, 250)}...`
        ),
        isLong &&
          React.createElement(
            "span",
            {
              className: "company-card-expand",
              onClick: () => setIsExpanded(!isExpanded),
            },
            isExpanded ? "Show less" : "Show more"
          )
      )
    )
  );
};
const CompanyCard = React.memo(CompanyCardBase);
CompanyCard.displayName = "CompanyCard";

// Company Description Component - Optimized with React state
const CompanyDescriptionBase = ({
  description,
}: {
  description: string;
  index: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = description.length > 250;

  return (
    <div className="company-description">
      <div
        className={isExpanded ? "company-description-full" : "company-description-truncated"}
      >
        {isExpanded || !isLong ? description : `${description.substring(0, 250)}...`}
      </div>
      {isLong && (
        <span
          className="expand-description"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "Collapse" : "Expand"}
        </span>
      )}
    </div>
  );
};
const CompanyDescription = React.memo(CompanyDescriptionBase);
CompanyDescription.displayName = "CompanyDescription";

// Main Companies Component
const CompanySection = ({
  companies,
  loading,
  error,
  pagination,
  fetchCompanies,
  setRequestColumns,
  currentFilters,
  filterPinnedColumnKeys = [],
  onEditCompany,
  externalShowColumnsModal,
  externalSetShowColumnsModal,
  onColumnsCountChange,
  onRegisterExportCSV,
  selectedCompanyIds,
  onToggleCompanySelection,
  onTogglePageSelection,
  onClearSelection,
  isPortfolioOnlyFilter = false,
}: {
  companies: Company[];
  loading: boolean;
  error: string | null;
  pagination: {
    itemsReceived: number;
    curPage: number;
    nextPage: number | null;
    prevPage: number | null;
    offset: number;
    perPage: number;
    pageTotal: number;
  };
  fetchCompanies: (page?: number, filters?: Filters, countsFilters?: Filters) => Promise<void>;
  setRequestColumns: (columns: string[]) => void;
  currentFilters: Filters | undefined;
  filterPinnedColumnKeys?: string[];
  onEditCompany?: (id: number) => void;
  externalShowColumnsModal?: boolean;
  externalSetShowColumnsModal?: (v: boolean) => void;
  onColumnsCountChange?: (count: number) => void;
  onRegisterExportCSV?: (fn: () => void) => void;
  selectedCompanyIds: Set<number>;
  onToggleCompanySelection: (id: number) => void;
  onTogglePageSelection: (ids: number[]) => void;
  onClearSelection: () => void;
  isPortfolioOnlyFilter?: boolean;
}) => {
  const router = useRouter();
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [showExportLimitModal, setShowExportLimitModal] = useState(false);
  const [exportsLeft, setExportsLeft] = useState(0);
  const [internalShowColumnsModal, setInternalShowColumnsModal] = useState(false);
  const showColumnsModal = externalShowColumnsModal !== undefined ? externalShowColumnsModal : internalShowColumnsModal;
  const setShowColumnsModal = externalSetShowColumnsModal ?? setInternalShowColumnsModal;
  const [sortState, setSortState] = useState<{
    key: string;
    dir: "asc" | "desc";
  } | null>(null);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>(() => {
    if (typeof window === "undefined") return DEFAULT_COMPANY_COLUMN_KEYS;
    try {
      const saved = window.localStorage.getItem(COMPANIES_COLUMNS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as unknown;
        if (Array.isArray(parsed)) {
          const valid = getValidColumnKeys(
            parsed.filter((k): k is string => typeof k === "string")
          );
          if (valid.length > 0) return valid;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_COMPANY_COLUMN_KEYS;
  });
  // Prefs are synchronously loaded above — always true on the client.
  const columnPrefsLoaded = typeof window !== "undefined";

  useEffect(() => {
    if (filterPinnedColumnKeys.length === 0) return;
    setSelectedColumnKeys((current) => {
      const merged = enforceColumnKeyOrder(
        Array.from(new Set([...current, ...filterPinnedColumnKeys])),
        filterPinnedColumnKeys
      );
      if (
        merged.length === current.length &&
        merged.every((key, index) => key === current[index])
      ) {
        return current;
      }
      return merged;
    });
  }, [filterPinnedColumnKeys]);
  const [headerDragKey, setHeaderDragKey] = useState<string | null>(null);
  const [headerDragOverKey, setHeaderDragOverKey] = useState<string | null>(null);
  const headerDidDragRef = useRef(false);

  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const phantomScrollRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollLeftRef = useRef<number | null>(null);
  const apiColumnsSigRef = useRef<string | null>(null);
  const prevSelectedColumnKeysRef = useRef<string[]>([]);
  const [loadingColumnKeys, setLoadingColumnKeys] = useState<Set<string>>(
    () => new Set()
  );
  const [tableScrollWidth, setTableScrollWidth] = useState(0);
  const [showPhantomScroll, setShowPhantomScroll] = useState(false);

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setTableScrollWidth(el.scrollWidth);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowPhantomScroll(!!entry?.isIntersecting),
      { threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const table = tableScrollRef.current;
    const phantom = phantomScrollRef.current;
    if (!table || !phantom) return;
    let syncing = false;
    const syncFromTable = () => {
      if (syncing) return;
      syncing = true;
      phantom.scrollLeft = table.scrollLeft;
      syncing = false;
    };
    const syncFromPhantom = () => {
      if (syncing) return;
      syncing = true;
      table.scrollLeft = phantom.scrollLeft;
      syncing = false;
    };
    table.addEventListener("scroll", syncFromTable, { passive: true });
    phantom.addEventListener("scroll", syncFromPhantom, { passive: true });
    return () => {
      table.removeEventListener("scroll", syncFromTable);
      phantom.removeEventListener("scroll", syncFromPhantom);
    };
  }, [showPhantomScroll]);


  useEffect(() => {
    if (!columnPrefsLoaded) return;
    try {
      window.localStorage.setItem(
        COMPANIES_COLUMNS_STORAGE_KEY,
        JSON.stringify(selectedColumnKeys)
      );
    } catch (error) {
      console.warn("Unable to save company column preferences:", error);
    }
  }, [columnPrefsLoaded, selectedColumnKeys]);

  useEffect(() => {
    if (!columnPrefsLoaded) return;
    const apiColumns = getApiColumnsForSelectedKeys(selectedColumnKeys);
    setRequestColumns(apiColumns);

    const sig = getApiColumnsSignature(selectedColumnKeys);
    if (apiColumnsSigRef.current === sig) return;

    const isInitialColumnFetch = apiColumnsSigRef.current === null;
    if (!isInitialColumnFetch) {
      const prevKeys = new Set(prevSelectedColumnKeysRef.current);
      const addedKeys = selectedColumnKeys.filter(
        (key) =>
          !prevKeys.has(key) && key !== "logo" && key !== "name"
      );
      if (addedKeys.length > 0) {
        setLoadingColumnKeys(new Set(addedKeys));
      }
    }

    prevSelectedColumnKeysRef.current = selectedColumnKeys;
    apiColumnsSigRef.current = sig;

    const table = tableScrollRef.current;
    if (table && table.scrollLeft > 0) {
      pendingScrollLeftRef.current = table.scrollLeft;
    }

    // Pass no filters so fetchCompanies falls back to currentFiltersRef.current,
    // which is always synchronously up-to-date (unlike the currentFilters state prop,
    // which lags one render and would wipe filters_sql on column changes).
    void fetchCompanies(1);
    // Re-fetch only when the set of requested API columns changes (add/remove), not reorder.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColumnKeys, columnPrefsLoaded]);

  useEffect(() => {
    if (!loading) {
      setLoadingColumnKeys(new Set());
    }
  }, [loading]);

  useEffect(() => {
    if (loading || pendingScrollLeftRef.current == null) return;
    const left = pendingScrollLeftRef.current;
    pendingScrollLeftRef.current = null;
    requestAnimationFrame(() => {
      const table = tableScrollRef.current;
      const phantom = phantomScrollRef.current;
      if (table) table.scrollLeft = left;
      if (phantom) phantom.scrollLeft = left;
    });
  }, [loading]);

  const selectedColumns = useMemo(() => {
    const columnsByKey = new Map(ALL_COMPANY_COLUMNS.map((column) => [column.key, column]));
    return getValidColumnKeys(selectedColumnKeys, filterPinnedColumnKeys)
      .map((key) => columnsByKey.get(key))
      .filter((column): column is CompanyColumnDefinition => Boolean(column));
  }, [selectedColumnKeys, filterPinnedColumnKeys]);

  const columnVisibilityInitial = useMemo(
    () => columnKeysToVisibility(selectedColumnKeys),
    [selectedColumnKeys]
  );

  const handleApplyColumnVisibility = useCallback(
    (visible: Record<string, boolean>, order?: string[]) => {
      if (order && order.length > 0) {
        setSelectedColumnKeys(getValidColumnKeys(order, filterPinnedColumnKeys));
      } else {
        setSelectedColumnKeys((current) =>
          getValidColumnKeys(
            visibilityToColumnKeys(visible, current),
            filterPinnedColumnKeys
          )
        );
      }
      setShowColumnsModal(false);
    },
    [filterPinnedColumnKeys, setShowColumnsModal]
  );

  const handleReorderTableColumns = useCallback((dragKey: string, dropKey: string) => {
    setSelectedColumnKeys((current) =>
      getValidColumnKeys(
        reorderColumnKeys(current, dragKey, dropKey, filterPinnedColumnKeys),
        filterPinnedColumnKeys
      )
    );
  }, [filterPinnedColumnKeys]);

  useEffect(() => {
    if (sortState && !selectedColumnKeys.includes(sortState.key)) {
      setSortState(null);
      void fetchCompanies(1, {
        ...(currentFilters ?? createDefaultFilters()),
        sort_column: null,
        sort_direction: null,
      });
    }
  }, [selectedColumnKeys, sortState, fetchCompanies, currentFilters]);

  useEffect(() => {
    if (currentFilters?.sort_column) return;
    if (sortState && getApiSortColumn(sortState.key)) {
      setSortState(null);
    }
  }, [currentFilters?.sort_column, currentFilters?.sort_direction, sortState]);

  // Report selected columns count to parent (for header button label)
  useEffect(() => {
    onColumnsCountChange?.(selectedColumns.length);
  }, [selectedColumns.length, onColumnsCountChange]);


  const handleSortColumn = useCallback(
    (columnKey: string) => {
      if (!getColumnSortKind(columnKey)) return;
      setSortState((current) => {
        const next =
          current?.key === columnKey
            ? {
                key: columnKey,
                dir: current.dir === "asc" ? ("desc" as const) : ("asc" as const),
              }
            : { key: columnKey, dir: "asc" as const };
        const apiColumn = getApiSortColumn(columnKey);
        if (apiColumn) {
          void fetchCompanies(1, {
            ...(currentFilters ?? createDefaultFilters()),
            sort_column: apiColumn,
            sort_direction: next.dir,
          });
        }
        return next;
      });
    },
    [fetchCompanies, currentFilters]
  );

  const sortedCompanies = useMemo(() => {
    if (
      (sortState && getApiSortColumn(sortState.key)) ||
      !sortState ||
      !getColumnSortKind(sortState.key)
    ) {
      return companies;
    }
    const { key, dir } = sortState;
    return [...companies].sort((companyA, companyB) => {
      const rowA = companyA as unknown as Record<string, unknown>;
      const rowB = companyB as unknown as Record<string, unknown>;
      return compareSortValues(
        getSortValueForColumn(rowA, key),
        getSortValueForColumn(rowB, key),
        dir
      );
    });
  }, [companies, sortState]);

  const SELECT_COLUMN_WIDTH = 44;

  const frozenColumnKeys = useMemo(
    () => getEffectiveFrozenColumnKeys(filterPinnedColumnKeys),
    [filterPinnedColumnKeys]
  );

  const stickyColumnOffsets = useMemo(() => {
    const offsets = new Map<string, number>();
    let left = SELECT_COLUMN_WIDTH;
    for (const key of frozenColumnKeys) {
      offsets.set(key, left);
      const col = ALL_COMPANY_COLUMNS.find((c) => c.key === key);
      left += col?.minWidth ?? (key === "logo" ? 88 : 120);
    }
    return offsets;
  }, [frozenColumnKeys]);

  const getStickyColumnStyle = useCallback(
    (
      columnKey: string,
      minWidth?: number,
      header = false,
      selected = false
    ): React.CSSProperties | undefined => {
      const left = stickyColumnOffsets.get(columnKey);
      if (left == null) return undefined;
      return {
        position: "sticky",
        left,
        zIndex: header ? 7 : 3,
        minWidth,
        background: header ? "#f9fafb" : selected ? "#EFF6FF" : "#fff",
        boxShadow: "2px 0 4px rgba(15, 23, 42, 0.06)",
      };
    },
    [stickyColumnOffsets]
  );

  const isFrozenColumnKey = (key: string) => frozenColumnKeys.includes(key);

  const isFilterPinnedColumnKey = (key: string) =>
    filterPinnedColumnKeys.includes(key) &&
    !(FROZEN_COLUMN_KEYS as readonly string[]).includes(key);

  const getTableColumnClassName = (
    column: CompanyColumnDefinition,
    extra?: string | (string | undefined)[]
  ): string | undefined => {
    const extras = extra == null ? [] : Array.isArray(extra) ? extra : [extra];
    const classes = [
      ...extras,
      column.wrap ? "company-table-cell-wrap" : undefined,
      isFrozenColumnKey(column.key) ? "company-table-sticky-frozen" : undefined,
      column.key === "logo" ? "company-table-sticky-logo" : undefined,
      column.key === "follow" ? "company-table-col-follow" : undefined,
    ].filter(Boolean);
    return classes.length > 0 ? classes.join(" ") : undefined;
  };


  // Handle CSV export using backend endpoint and include active filters
  const handleExportCSV = useCallback(async () => {
    try {
      // Check export limit first
      const limitCheck = await checkExportLimit();
      if (!limitCheck.canExport) {
        setExportsLeft(limitCheck.exportsLeft);
        setShowExportLimitModal(true);
        return;
      }

      const token = localStorage.getItem("asymmetrix_auth_token");
      const exportPageSize = 25;
      const baseFilters = currentFilters ?? createDefaultFilters();
      const exportPayload: Filters = {
        ...baseFilters,
        query: baseFilters.query?.trim() || null,
        filters_sql: baseFilters.filters_sql || null,
        columns: getApiColumnsForSelectedKeys(selectedColumnKeys),
        has_financial_filters: Boolean(baseFilters.has_financial_filters),
        has_year_filter: Boolean(baseFilters.has_year_filter),
        ...getSortPayloadFromState(sortState),
      };
      const buildExportParams = (page: number) =>
        companySearchPayloadToSearchParams(exportPayload, {
          page,
          perPage: exportPageSize,
        });

      const firstPageUrl = `${COMPANIES_API_BASE}/Export_new_companies_csv?${buildExportParams(1).toString()}`;
      
      const firstResp = await fetch(firstPageUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      
      if (!firstResp.ok) {
        // Check if it's an export limit error
        if (firstResp.status === 403 || firstResp.status === 429) {
          const limitCheck = await checkExportLimit();
          setExportsLeft(limitCheck.exportsLeft);
          setShowExportLimitModal(true);
          return;
        }
        const errText = await firstResp.text();
        throw new Error(
          `Export failed: ${firstResp.status} ${firstResp.statusText} - ${errText}`
        );
      }
      
      // Parse first page to get pagination info
      const firstPageText = await firstResp.text();
      let firstPageParsed: unknown;
      let isJson = false;
      let totalPages = 1;
      
      try {
        firstPageParsed = JSON.parse(firstPageText);
        isJson = true;
        // Check if response has pagination info
        if (
          firstPageParsed &&
          typeof firstPageParsed === "object" &&
          "pageTotal" in (firstPageParsed as Record<string, unknown>)
        ) {
          totalPages = (firstPageParsed as { pageTotal?: number }).pageTotal || 1;
        } else if (
          firstPageParsed &&
          typeof firstPageParsed === "object" &&
          "result1" in (firstPageParsed as Record<string, unknown>)
        ) {
          const result1 = (firstPageParsed as { result1?: { pageTotal?: number } }).result1;
          totalPages = result1?.pageTotal || 1;
        }
      } catch {
        isJson = false;
      }
      
      // Collect all items from all pages
      let allItems: ExportCompanyJson[] = [];
      
      // Process first page
      if (isJson) {
        const itemsUnknown: unknown[] = Array.isArray(firstPageParsed)
          ? (firstPageParsed as unknown[])
          : firstPageParsed &&
            typeof firstPageParsed === "object" &&
            Array.isArray((firstPageParsed as { items?: unknown[] }).items)
          ? ((firstPageParsed as { items?: unknown[] }).items as unknown[])
          : firstPageParsed &&
            typeof firstPageParsed === "object" &&
            "result1" in (firstPageParsed as Record<string, unknown>) &&
            Array.isArray((firstPageParsed as { result1?: { items?: unknown[] } }).result1?.items)
          ? ((firstPageParsed as { result1?: { items?: unknown[] } }).result1?.items as unknown[])
          : [];
        allItems = itemsUnknown.filter(isExportCompanyJson);
      }
      
      // Fetch remaining pages if there are more
      if (totalPages > 1) {
        for (let page = 2; page <= totalPages; page++) {
          const pageUrl = `${COMPANIES_API_BASE}/Export_new_companies_csv?${buildExportParams(page).toString()}`;
          
          const pageResp = await fetch(pageUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: "include",
          });
          
          if (!pageResp.ok) {
            console.warn(`Failed to fetch page ${page}, continuing with available data`);
            continue;
          }
          
          const pageText = await pageResp.text();
          try {
            const pageParsed = JSON.parse(pageText);
            const pageItemsUnknown: unknown[] = Array.isArray(pageParsed)
              ? (pageParsed as unknown[])
              : pageParsed &&
                typeof pageParsed === "object" &&
                Array.isArray((pageParsed as { items?: unknown[] }).items)
              ? ((pageParsed as { items?: unknown[] }).items as unknown[])
              : pageParsed &&
                typeof pageParsed === "object" &&
                "result1" in (pageParsed as Record<string, unknown>) &&
                Array.isArray((pageParsed as { result1?: { items?: unknown[] } }).result1?.items)
              ? ((pageParsed as { result1?: { items?: unknown[] } }).result1?.items as unknown[])
              : [];
            const pageItems = pageItemsUnknown.filter(isExportCompanyJson);
            allItems = [...allItems, ...pageItems];
          } catch (e) {
            console.warn(`Failed to parse page ${page}, continuing with available data`, e);
          }
        }
      }
      
      if (allItems.length === 0) {
        throw new Error("Export returned empty data");
      }
      
      if (isJson) {
        const items = allItems;
        
        // Ensure all rows have all columns by creating a base row structure
        const rows: CompanyCSVRow[] = items.map((it: ExportCompanyJson) => {
          const primaryVal = it.primary_sectors ?? "";
          const secondaryVal = it.secondary_sectors ?? "";
          const primaryStr = Array.isArray(primaryVal)
            ? primaryVal.join(", ")
            : String(primaryVal);
          const secondaryStr = Array.isArray(secondaryVal)
            ? secondaryVal.join(", ")
            : String(secondaryVal);
          const primary = primaryStr
            ? primaryStr
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [];
          const secondary = secondaryStr
            ? secondaryStr
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [];

          // Some payloads use `arr_pc` while others use `ARR_pc`
          const arrPcRaw =
            (it as unknown as Record<string, unknown>)["arr_pc"] ?? it.ARR_pc;
          const arrPc =
            typeof arrPcRaw === "number" || typeof arrPcRaw === "string"
              ? arrPcRaw
              : undefined;
          
          // Construct company URL from ID, or fall back to API-provided URLs
          let companyLink = "";
          if (it.id != null) {
            const companyId = typeof it.id === "number" ? it.id : Number(it.id);
            if (!isNaN(companyId)) {
              companyLink = `https://www.asymmetrixintelligence.com/company/${companyId}`;
            }
          }
          if (!companyLink && it.company_link) {
            companyLink = it.company_link;
          }
          if (!companyLink && it.asymmetrix_url) {
            companyLink = it.asymmetrix_url;
          }
          
          // Create row with ALL columns always present
          const row: CompanyCSVRow = {
            Name: it.name ?? "-",
            Description: it.description ?? "-",
            "Primary Sector(s)": CompaniesCSVExporter.formatSectors(primary),
            "Secondary Sector(s)": CompaniesCSVExporter.formatSectors(secondary),
            Ownership: it.ownership ?? "-",
            "LinkedIn Members": CompaniesCSVExporter.formatLinkedinMembers(
              typeof it.linkedin_members === "number"
                ? it.linkedin_members
                : Number(it.linkedin_members)
            ),
            HQ: toPlainText(
              readCompanyValue(it as Company, [...getFieldAliasesForColumn("hq")])
            ),
            "Company Link": companyLink || "-",
            "Company URL": it.company_link ?? "",
            // Financial Metrics - exact field names from API
            Revenue:
              it.Revenue_m != null && it.Revenue_m !== ""
                ? `${it.Revenue_m}M`
                : "-",
            EBITDA:
              it.EBITDA_m != null && it.EBITDA_m !== ""
                ? `${it.EBITDA_m}M`
                : "-",
            "Enterprise Value":
              it.EV != null && it.EV !== "" ? `${it.EV}M` : "-",
            "Revenue Multiple":
              it.Revenue_multiple != null && it.Revenue_multiple !== ""
                ? String(it.Revenue_multiple)
                : "-",
            "Revenue Growth":
              it.Rev_Growth_PC != null && it.Rev_Growth_PC !== ""
                ? `${it.Rev_Growth_PC}%`
                : "-",
            "EBITDA Margin":
              it.EBITDA_margin != null && it.EBITDA_margin !== ""
                ? `${it.EBITDA_margin}%`
                : "-",
            "Rule of 40":
              it.Rule_of_40 != null && it.Rule_of_40 !== ""
                ? String(it.Rule_of_40)
                : "-",
            // Subscription Metrics - exact field names from API
            "Recurring Revenue": CompaniesCSVExporter.formatPercent(arrPc),
            ARR: it.ARR_m != null && it.ARR_m !== "" ? `${it.ARR_m}M` : "-",
            Churn:
              it.Churn_pc != null && it.Churn_pc !== ""
                ? `${it.Churn_pc}%`
                : "-",
            GRR:
              it.GRR_pc != null && it.GRR_pc !== ""
                ? `${it.GRR_pc}%`
                : "-",
            NRR: it.NRR != null && it.NRR !== "" ? `${it.NRR}%` : "-",
            "New Clients Revenue Growth":
              it.New_client_growth_pc != null && it.New_client_growth_pc !== ""
                ? `${it.New_client_growth_pc}%`
                : "-",
          };
          return row;
        });
        
        const csv = CompaniesCSVExporter.convertToCSV(rows);
        CompaniesCSVExporter.downloadCSV(csv, "companies_filtered");
      } else {
        // Fallback: If API returns CSV directly, use it as-is
        // Note: This may not include all financial columns if the server CSV is incomplete
        // Also note: CSV format doesn't support pagination, so only first page will be exported
        console.warn("API returned CSV directly - financial columns may be missing and only first page will be exported");
        const normalized = firstPageText.replace(/\r?\n/g, "\r\n");
        const contentWithBOM = "\uFEFF" + normalized;
        const blob = new Blob([contentWithBOM], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        const urlObject = URL.createObjectURL(blob);
        link.href = urlObject;
        link.download = "companies_filtered.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(urlObject);
      }
    } catch (e) {
      console.error("Error exporting CSV:", e);
      // Fallback to client-side CSV if API export fails
      if (companies.length > 0) {
        // `CompaniesCSVExporter` expects sectors as string arrays; normalize in case API returns objects.
        const toStringArray = (vals: unknown): string[] =>
          parseListField(vals)
            .map((v) => getSectorInfo(v).name)
            .map((n) => String(n ?? "").trim())
            .filter(Boolean);
        const normalizedCompanies = companies.map((c) => ({
          ...c,
          primary_sectors: toStringArray(c.primary_sectors),
          secondary_sectors: toStringArray(c.secondary_sectors),
        }));
        CompaniesCSVExporter.exportCompanies(
          // Exporter has its own internal `Company` type with string[] sectors.
          normalizedCompanies as unknown as Parameters<
            typeof CompaniesCSVExporter.exportCompanies
          >[0],
          "companies_filtered"
        );
      }
    }
  }, [currentFilters, companies, selectedColumnKeys, sortState]);

  // Register export function with parent so header Export CSV button works
  useEffect(() => {
    onRegisterExportCSV?.(handleExportCSV);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleExportCSV]);

  const handleCompanyClick = useCallback(
    (companyId: number) => {
      router.push(`/company/${companyId}`);
    },
    [router]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      const totalPages =
        pagination.pageTotal ||
        (pagination.nextPage != null
          ? Math.max(pagination.nextPage, pagination.curPage + 1)
          : 1);
      if (loading || page < 1 || page > totalPages || page === pagination.curPage) {
        return;
      }

      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      void fetchCompanies(page, currentFilters);
    },
    [fetchCompanies, currentFilters, loading, pagination.curPage, pagination.pageTotal]
  );

  const pageCompanyIds = useMemo(
    () =>
      sortedCompanies
        .map((company) => Number(company.id))
        .filter((id) => Number.isFinite(id) && id > 0),
    [sortedCompanies]
  );

  const pageSelectionState = useMemo(() => {
    if (pageCompanyIds.length === 0) {
      return { allSelected: false, someSelected: false };
    }
    let selectedOnPage = 0;
    for (const id of pageCompanyIds) {
      if (selectedCompanyIds.has(id)) selectedOnPage += 1;
    }
    return {
      allSelected: selectedOnPage === pageCompanyIds.length,
      someSelected: selectedOnPage > 0 && selectedOnPage < pageCompanyIds.length,
    };
  }, [pageCompanyIds, selectedCompanyIds]);

  const tableRows = useMemo(
    () =>
      sortedCompanies.map((company, index) => {
        const displayCompany = company;

        const isRowSelected = selectedCompanyIds.has(company.id);
        return (
          <tr
            key={company.id || index}
            className={isRowSelected ? "company-table-row-selected" : undefined}
          >
            <td
              className="company-table-select-cell"
              style={{
                minWidth: 44,
                width: 44,
                textAlign: "center",
                background: isRowSelected ? "#EFF6FF" : "#fff",
              }}
            >
              <input
                type="checkbox"
                checked={isRowSelected}
                onChange={() => onToggleCompanySelection(company.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select ${company.name || "company"}`}
              />
            </td>
            {selectedColumns.map((column) => (
              <td
                key={`${company.id || index}-${column.key}`}
                className={getTableColumnClassName(column)}
                style={{
                  minWidth: column.minWidth,
                  ...getStickyColumnStyle(
                    column.key,
                    column.minWidth,
                    false,
                    isRowSelected
                  ),
                }}
              >
                {loadingColumnKeys.has(column.key) ? (
                  <div
                    className="loading-skeleton"
                    style={{ width: "80%", height: 18, minWidth: 48 }}
                    aria-label="Loading column data"
                  />
                ) : (
                  column.render(displayCompany, {
                    index,
                    onCompanyClick: handleCompanyClick,
                  })
                )}
              </td>
            ))}
            {onEditCompany && (
              <td>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEditCompany(company.id);
                  }}
                  className="edit-company-btn"
                  title="Edit company"
                >
                  Edit
                </button>
              </td>
            )}
          </tr>
        );
      }),
    [
      sortedCompanies,
      handleCompanyClick,
      onEditCompany,
      selectedColumns,
      selectedCompanyIds,
      onToggleCompanySelection,
      loadingColumnKeys,
      getStickyColumnStyle,
      getTableColumnClassName,
    ]
  );


  const style = `
    .loading-skeleton {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s ease-in-out infinite;
      border-radius: 4px;
    }
    .company-table-col-loading {
      background: linear-gradient(90deg, #e2e8f0 25%, #cbd5e1 50%, #e2e8f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s ease-in-out infinite;
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .company-section {
      width: 100%;
      padding: 16px 28px;
    }
    .company-stats {
      background: #fff;
      padding: 16px;
      box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1);
      border-radius: 8px;
      margin-bottom: 12px;
    }
    .stats-title {
      font-size: 18px;
      font-weight: 700;
      color: #1a202c;
      margin: 0 0 12px 0;
    }
    .stats-column {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
    }
    .stats-item {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .stats-item:last-child {
      border-bottom: none;
    }
    .stats-label {
      font-size: 14px;
      color: #4a5568;
      font-weight: 500;
    }
    .stats-value {
      font-size: 16px;
      color: #000;
      font-weight: 600;
    }
    .company-table {
      width: max-content;
      min-width: 100%;
      background: #fff;
      padding: 16px;
      box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1);
      border-radius: 8px;
      border-collapse: collapse;
      table-layout: auto;
    }
    .company-table-scroll {
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      width: 100%;
      max-height: min(72vh, calc(100vh - 240px));
      border-radius: 8px;
      box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1);
      background: #fff;
    }
    .company-table-scroll .company-table {
      box-shadow: none;
      border-radius: 0;
      margin: 0;
    }
    .company-columns-button {
      border: 1px solid #e2e8f0;
      background: #fff;
      color: #1a202c;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .company-columns-button.primary {
      border-color: #0075df;
      color: #0075df;
    }
    .company-table-cell-wrap {
      white-space: normal !important;
      word-break: break-word;
      overflow-wrap: break-word;
      max-width: 320px;
    }
    .company-table-select-cell {
      position: sticky;
      left: 0;
      z-index: 3;
      background: #fff;
      box-shadow: 1px 0 0 #e2e8f0;
    }
    .company-table thead .company-table-select-cell {
      z-index: 6;
    }
    .company-table td.company-table-sticky-frozen,
    .company-table td.company-table-sticky-logo {
      background: #fff;
    }
    .edit-company-btn {
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 500;
      color: #0075df;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      cursor: pointer;
      white-space: nowrap;
    }
    .edit-company-btn:hover {
      background: #dbeafe;
      color: #0369a1;
    }
    .company-table th,
    .company-table td {
      padding: 8px 12px;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid #e2e8f0;
      word-wrap: break-word;
      overflow-wrap: break-word;
      min-width: 120px;
    }
    .company-table th {
      font-weight: 600;
      color: #1a202c;
      font-size: 14px;
      background: #f9fafb;
      border-bottom: 2px solid #e2e8f0;
      position: sticky;
      top: 0;
      z-index: 4;
    }
    .company-table-th-sortable {
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
    }
    .company-table-th-sortable:hover {
      background: #f1f5f9;
    }
    .company-table-th-draggable {
      cursor: grab;
    }
    .company-table-th-draggable:active {
      cursor: grabbing;
    }
    .company-table-th-dragging {
      opacity: 0.55;
    }
    .company-table-th-drag-over {
      box-shadow: inset 0 -3px 0 #0370aa;
      background: #eff6ff;
    }
    .company-table-sort-indicator {
      margin-left: 4px;
      font-size: 10px;
      color: #64748b;
    }
    .company-table-pin-indicator {
      display: inline-flex;
      align-items: center;
      margin-left: 4px;
      color: #94a3b8;
      vertical-align: middle;
    }
    .company-table-sticky-logo {
      min-width: 88px;
      max-width: 88px;
      width: 88px;
      text-align: left;
      vertical-align: top;
    }
    .company-table td.company-table-sticky-logo .company-logo-cell {
      width: 60px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }
    .company-table td.company-table-sticky-logo .company-logo-placeholder {
      width: 60px;
      height: 40px;
      background-color: #f7fafc;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: #718096;
    }
    .company-table th.company-table-col-follow,
    .company-table td.company-table-col-follow {
      text-align: left;
      min-width: 120px;
      max-width: 140px;
    }
    .company-table th.company-table-col-follow {
      z-index: 4;
      background: #f9fafb;
    }
    .company-table td.company-table-col-follow {
      position: relative;
      z-index: 0;
    }
    .company-follow-cell {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      text-align: left;
      position: relative;
      z-index: 0;
    }
    .company-table-row-selected {
      background: #EFF6FF;
    }
    .company-table tr.company-table-row-selected > td.company-table-sticky-frozen,
    .company-table tr.company-table-row-selected > td.company-table-sticky-logo,
    .company-table tr.company-table-row-selected > td.company-table-select-cell {
      background: #EFF6FF;
    }
    .company-table thead th.company-table-sticky-frozen,
    .company-table thead th.company-table-sticky-logo {
      z-index: 7;
      background: #f9fafb;
    }
    .company-table td {
      font-size: 14px;
      color: #000;
      line-height: 1.5;
    }
    .company-logo {
      width: 60px;
      height: 40px;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      vertical-align: middle;
      border-radius: 8px;
    }
    .company-name {
      color: #0075df;
      text-decoration: underline;
      cursor: pointer;
      font-weight: 500;
    }
    .company-description {
      line-height: 1.4;
    }
    .company-description-truncated {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .expand-description {
      color: #0075df;
      text-decoration: underline;
      cursor: pointer;
      font-size: 12px;
      margin-top: 4px;
      display: block;
    }
    .sectors-list {
      max-width: 300px;
      line-height: 1.3;
    }
    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
    }
    .error {
      text-align: center;
      padding: 20px;
      color: #e53e3e;
      background-color: #fed7d7;
      border-radius: 6px;
      margin-bottom: 16px;
    }
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
      padding: 8px;
    }
    .pagination-button {
      padding: 8px 12px;
      border: none;
      background: none;
      color: #000;
      cursor: pointer;
      font-size: 14px;
      font-weight: 400;
      transition: color 0.2s;
      text-decoration: none;
    }
    .pagination-button:hover {
      color: #0075df;
    }
    .pagination-button.active {
      color: #0075df;
      text-decoration: underline;
      font-weight: 500;
    }
    .pagination-button:disabled {
      opacity: 0.3;
      cursor: not-allowed;
      color: #666;
    }
    .pagination-nav {
      font-weight: 500;
      white-space: nowrap;
    }
    .pagination-ellipsis {
      padding: 8px 12px;
      color: #000;
      font-size: 14px;
    }
    .export-button { 
      background-color: #22c55e; 
      color: white; 
      font-weight: 600; 
      padding: 12px 24px; 
      border-radius: 8px; 
      border: none; 
      cursor: pointer; 
      margin: 16px 0; 
      font-size: 14px;
      transition: background-color 0.2s;
    }
    .export-button:hover { 
      background-color: #16a34a; 
    }
    .export-button:disabled {
      background-color: #9ca3af;
      cursor: not-allowed;
    }
    
    /* Mobile Card Layout */
    .company-cards {
      display: none;
      flex-direction: column;
      gap: 12px;
      padding: 12px;
    }
    .company-card {
      background: #fff;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
    }
    .company-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .company-card-logo {
      width: 50px;
      height: 35px;
      object-fit: contain;
      border-radius: 6px;
      flex-shrink: 0;
    }
    .company-card-logo-placeholder {
      width: 50px;
      height: 35px;
      background-color: #f7fafc;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      color: #718096;
      flex-shrink: 0;
    }
    .company-card-name {
      color: #0075df;
      text-decoration: underline;
      cursor: pointer;
      font-weight: 600;
      font-size: 16px;
      line-height: 1.3;
      flex: 1;
    }
    .company-card-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .company-card-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 14px;
      line-height: 1.4;
    }
    .company-card-label {
      color: #4a5568;
      font-weight: 500;
      min-width: 80px;
      flex-shrink: 0;
    }
    .company-card-value {
      color: #000;
      text-align: right;
      flex: 1;
      word-break: break-word;
    }
    .company-card-description {
      color: #000;
      line-height: 1.4;
      margin-top: 8px;
      font-size: 14px;
    }
    .company-card-description-truncated {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .company-card-expand {
      color: #0075df;
      text-decoration: underline;
      cursor: pointer;
      font-size: 12px;
      margin-top: 4px;
      display: block;
    }
    
    @media (max-width: 768px) {
      .company-table {
        display: none;
      }
      .company-cards {
        display: flex;
      }
      .pagination {
        gap: 4px;
      }
      .pagination-button {
        padding: 8px 10px;
      }
      .pagination-nav {
        flex: 1 1 88px;
        max-width: 120px;
      }
      .stats-column {
        grid-template-columns: 1fr !important;
        gap: 6px !important;
      }
      .filters-grid {
        display: grid !important;
        grid-template-columns: 1fr !important;
        gap: 16px !important;
      }
      .filters-card {
        padding: 12px !important;
      }
      .filters-card {
        padding: 12px !important;
      }
      .filters-heading {
        font-size: 18px !important;
        margin-bottom: 8px !important;
      }
      .filters-sub-heading {
        font-size: 14px !important;
        margin-bottom: 6px !important;
      }
      .filters-input {
        max-width: 100% !important;
      }
      .filters-button {
        max-width: 100% !important;
      }
    }
    
    @media (min-width: 769px) {
      .company-cards {
        display: none;
      }
      .company-table {
        display: table;
      }
    }
  `;

  const columnsModalLayer = [
    showColumnsModal &&
      React.createElement("div", {
        key: "columns-backdrop",
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 199,
          cursor: "default",
        },
        onClick: () => setShowColumnsModal(false),
        "aria-hidden": true,
      }),
    showColumnsModal &&
      React.createElement(ColumnsControlRoom, {
        key: "columns-panel",
        initial: columnVisibilityInitial,
        initialOrder: selectedColumnKeys,
        filterPinnedColumnKeys,
        onCancel: () => setShowColumnsModal(false),
        onApply: handleApplyColumnVisibility,
      }),
  ];

  const showInitialLoadingSkeleton = loading && companies.length === 0;

  if (showInitialLoadingSkeleton) {
    const skeletonRow = (i: number) =>
      React.createElement(
        "tr",
        { key: i },
        React.createElement(
          "td",
          null,
          React.createElement("div", {
            className: "loading-skeleton",
            style: { width: "48px", height: "36px" },
          })
        ),
        React.createElement(
          "td",
          null,
          React.createElement("div", {
            className: "loading-skeleton",
            style: { width: "90%", height: "18px" },
          })
        ),
        React.createElement(
          "td",
          null,
          React.createElement("div", {
            className: "loading-skeleton",
            style: { width: "100%", height: "40px" },
          })
        ),
        React.createElement(
          "td",
          null,
          React.createElement("div", {
            className: "loading-skeleton",
            style: { width: "80%", height: "18px" },
          })
        ),
        React.createElement(
          "td",
          null,
          React.createElement("div", {
            className: "loading-skeleton",
            style: { width: "80%", height: "18px" },
          })
        ),
        React.createElement(
          "td",
          null,
          React.createElement("div", {
            className: "loading-skeleton",
            style: { width: "60%", height: "18px" },
          })
        ),
        React.createElement(
          "td",
          null,
          React.createElement("div", {
            className: "loading-skeleton",
            style: { width: "50px", height: "18px" },
          })
        ),
        React.createElement(
          "td",
          null,
          React.createElement("div", {
            className: "loading-skeleton",
            style: { width: "70%", height: "18px" },
          })
        ),
        ...(onEditCompany
          ? [
              React.createElement("td", { key: "edit" }, null),
            ]
          : [])
      );

    const skeletonCard = (i: number) =>
      React.createElement(
        "div",
        { className: "company-card", key: i },
        React.createElement(
          "div",
          { className: "company-card-header" },
          React.createElement("div", {
            className: "loading-skeleton",
            style: { width: "50px", height: "35px" },
          }),
          React.createElement("div", {
            className: "loading-skeleton",
            style: { width: "65%", height: "18px" },
          })
        ),
        React.createElement("div", {
          className: "loading-skeleton",
          style: { width: "100%", height: "72px" },
        })
      );

    return React.createElement(
      "div",
      { className: "company-section", ref: sectionRef },
      React.createElement(
        "div",
        { className: "company-cards" },
        ...[...Array(6)].map((_, i) => skeletonCard(i))
      ),
      React.createElement(
        "table",
        { className: "company-table" },
        React.createElement(
          "thead",
          null,
          React.createElement(
            "tr",
            null,
            React.createElement("th", null, "Logo"),
            React.createElement("th", null, "Name"),
            React.createElement("th", null, "Description"),
            React.createElement("th", null, "Primary Sectors"),
            React.createElement("th", null, "Secondary Sectors"),
            React.createElement("th", null, "Ownership"),
            React.createElement("th", null, "LinkedIn"),
            React.createElement("th", null, "HQ"),
            ...(onEditCompany
              ? [React.createElement("th", { key: "edit" }, "")]
              : [])
          )
        ),
        React.createElement(
          "tbody",
          null,
          ...[...Array(10)].map((_, i) => skeletonRow(i))
        )
      ),
      ...columnsModalLayer,
      React.createElement("style", {
        dangerouslySetInnerHTML: { __html: style },
      })
    );
  }

  if (error) {
    return React.createElement(
      "div",
      { className: "company-section", ref: sectionRef },
      React.createElement("div", { className: "error" }, error),
      ...columnsModalLayer,
      React.createElement("style", {
        dangerouslySetInnerHTML: { __html: style },
      })
    );
  }

  if (companies.length === 0 && isPortfolioOnlyFilter) {
    return React.createElement(
      "div",
      { className: "company-section", ref: sectionRef },
      React.createElement(FollowedOnlyEmptyState, { entity: "companies" }),
      ...columnsModalLayer,
      React.createElement("style", {
        dangerouslySetInnerHTML: { __html: style },
      })
    );
  }

  return React.createElement(
    "div",
    { className: "company-section", ref: sectionRef },
    ...columnsModalLayer,
    selectedCompanyIds.size > 0 &&
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 10,
            padding: "10px 14px",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 8,
            fontSize: 13,
            color: "#1e3a8a",
          },
        },
        React.createElement(
          "span",
          { style: { fontWeight: 600 } },
          `${selectedCompanyIds.size.toLocaleString()} selected`
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: onClearSelection,
            style: {
              background: "transparent",
              border: "none",
              color: "#2563eb",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
            },
          },
          "Clear selection"
        )
      ),
    React.createElement(
      "div",
      { className: "company-cards" },
      sortedCompanies.map((company, index) =>
        React.createElement(CompanyCard, {
          key: company.id || index,
          company: company,
          index: index,
        })
      )
    ),
    React.createElement(
      "div",
      { className: "company-table-scroll", ref: tableScrollRef },
      React.createElement(
        "table",
        { className: "company-table" },
        React.createElement(
          "thead",
          null,
          React.createElement(
            "tr",
            null,
            React.createElement(
              "th",
              {
                key: "select",
                className: "company-table-select-cell",
                style: { minWidth: 44, width: 44, textAlign: "center" },
              },
              React.createElement("input", {
                type: "checkbox",
                checked: pageSelectionState.allSelected,
                ref: (el: HTMLInputElement | null) => {
                  if (el) {
                    el.indeterminate = pageSelectionState.someSelected;
                  }
                },
                onChange: () => onTogglePageSelection(pageCompanyIds),
                "aria-label": "Select all companies on this page",
              })
            ),
            ...selectedColumns.map((column) => {
              const sortKind = getColumnSortKind(column.key);
              const isActive = sortState?.key === column.key;
              const isDraggable = !isFrozenColumnKey(column.key);
              const isDragging = headerDragKey === column.key;
              const isDragOver =
                headerDragOverKey === column.key && headerDragKey !== column.key;
              return React.createElement(
                "th",
                {
                  key: column.key,
                  className: getTableColumnClassName(column, [
                    sortKind ? "company-table-th-sortable" : undefined,
                    isDraggable ? "company-table-th-draggable" : undefined,
                    isDragging ? "company-table-th-dragging" : undefined,
                    isDragOver ? "company-table-th-drag-over" : undefined,
                  ]),
                  style: {
                    minWidth: column.minWidth,
                    ...getStickyColumnStyle(column.key, column.minWidth, true),
                  },
                  draggable: isDraggable,
                  onDragStart: isDraggable
                    ? (event: React.DragEvent<HTMLTableCellElement>) => {
                        headerDidDragRef.current = false;
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", column.key);
                        setHeaderDragKey(column.key);
                        setHeaderDragOverKey(null);
                      }
                    : undefined,
                  onDragOver: (event: React.DragEvent<HTMLTableCellElement>) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setHeaderDragOverKey(column.key);
                  },
                  onDrop: (event: React.DragEvent<HTMLTableCellElement>) => {
                    event.preventDefault();
                    const dragKey =
                      event.dataTransfer.getData("text/plain") || headerDragKey;
                    if (dragKey) {
                      headerDidDragRef.current = true;
                      handleReorderTableColumns(dragKey, column.key);
                    }
                    setHeaderDragKey(null);
                    setHeaderDragOverKey(null);
                  },
                  onDragEnd: () => {
                    setHeaderDragKey(null);
                    setHeaderDragOverKey(null);
                  },
                  onClick: sortKind
                    ? () => {
                        if (headerDidDragRef.current) {
                          headerDidDragRef.current = false;
                          return;
                        }
                        handleSortColumn(column.key);
                      }
                    : undefined,
                  "aria-sort": sortKind
                    ? isActive
                      ? sortState?.dir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                    : undefined,
                },
                column.key === "follow"
                  ? React.createElement(
                      "span",
                      {
                        className: "company-follow-header-label",
                        style: { display: "block", textAlign: "left" },
                      },
                      column.label
                    )
                  : column.label,
                loadingColumnKeys.has(column.key) &&
                  React.createElement(
                    "span",
                    {
                      className: "company-table-col-loading",
                      style: {
                        display: "inline-block",
                        marginLeft: 6,
                        width: 36,
                        height: 10,
                        verticalAlign: "middle",
                        borderRadius: 4,
                      },
                      "aria-hidden": true,
                    }
                  ),
                isFilterPinnedColumnKey(column.key) &&
                  React.createElement(
                    "span",
                    {
                      className: "company-table-pin-indicator",
                      title: FILTER_PINNED_TOOLTIP,
                      "aria-label": FILTER_PINNED_TOOLTIP,
                    },
                    React.createElement(
                      "svg",
                      {
                        width: 11,
                        height: 11,
                        viewBox: "0 0 12 12",
                        fill: "none",
                        "aria-hidden": true,
                      },
                      React.createElement("rect", {
                        x: 2.25,
                        y: 5.25,
                        width: 7.5,
                        height: 5.5,
                        rx: 1.1,
                        stroke: "currentColor",
                        strokeWidth: 1.2,
                      }),
                      React.createElement("path", {
                        d: "M4 5.25V3.75a2 2 0 014 0v1.5",
                        stroke: "currentColor",
                        strokeWidth: 1.2,
                        strokeLinecap: "round",
                      })
                    )
                  ),
                sortKind &&
                  React.createElement(
                    "span",
                    { className: "company-table-sort-indicator" },
                    isActive ? (sortState?.dir === "asc" ? " ▲" : " ▼") : " ⇅"
                  )
              );
            }),
            ...(onEditCompany
              ? [React.createElement("th", { key: "edit" }, "Edit")]
              : [])
          )
        ),
        React.createElement("tbody", null, tableRows)
      )
    ),
    showPhantomScroll &&
      React.createElement(
        "div",
        {
          ref: phantomScrollRef,
          style: {
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: 14,
            overflowX: "auto",
            overflowY: "hidden",
            zIndex: 50,
            background: "rgba(255,255,255,0.95)",
            boxShadow: "0 -1px 6px rgba(0,0,0,0.10)",
            borderTop: "1px solid #e2e8f0",
          },
        },
        React.createElement("div", {
          style: { width: tableScrollWidth, height: 1 },
        })
      ),
    React.createElement(
      "div",
      { style: { display: "flex", justifyContent: "center", padding: "12px 8px" } },
      React.createElement(CompactPagination, {
        curPage: pagination.curPage,
        pageTotal:
          pagination.pageTotal ||
          (pagination.nextPage != null
            ? Math.max(pagination.nextPage, pagination.curPage + 1)
            : 1),
        onPageChange: handlePageChange,
        disabled: loading,
      })
    ),
    React.createElement(ExportLimitModal, {
      isOpen: showExportLimitModal,
      onClose: () => setShowExportLimitModal(false),
      exportsLeft: exportsLeft,
      totalExports: EXPORT_LIMIT,
    }),
    React.createElement("style", {
      dangerouslySetInnerHTML: { __html: style },
    })
  );
};

import { CompaniesEditContext } from "./CompaniesEditContext";

// Main Page Component
function CompaniesPageInner() {
  const {
    companies,
    loading,
    error,
    pagination,
    ownershipCounts,
    fetchCompanies,
    setRequestColumns,
    currentFilters,
  } = useCompaniesAPI();

  const [isPortfolioOnlyFilter, setIsPortfolioOnlyFilter] = useState(false);

  const handleSearch = useCallback(
    (listFilters: Filters, countsFilters: Filters, portfolioOnly?: boolean) => {
      setIsPortfolioOnlyFilter(Boolean(portfolioOnly));
      fetchCompanies(1, listFilters, countsFilters);
    },
    [fetchCompanies]
  );

  const [filterPinnedColumnKeys, setFilterPinnedColumnKeys] = useState<string[]>(
    []
  );

  const handleFilterColumnsChange = useCallback(
    ({
      filterIds,
      ownershipTabActive,
    }: {
      filterIds: string[];
      ownershipTabActive: boolean;
    }) => {
      setFilterPinnedColumnKeys(
        getColumnKeysForActiveFilters(filterIds, ownershipTabActive)
      );
    },
    []
  );

  const [initialSearch, setInitialSearch] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const s = params?.get?.("search") || undefined;
      setInitialSearch(s);
    }
  }, []);

  // Lifted state for Columns modal + Export CSV (shared between header and table)
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [columnsCount, setColumnsCount] = useState(DEFAULT_COMPANY_COLUMN_KEYS.length);
  const exportCSVRef = useRef<(() => void) | null>(null);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<number>>(() => new Set());
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);

  const filtersKey = useMemo(
    () => JSON.stringify(currentFilters ?? {}),
    [currentFilters]
  );

  useEffect(() => {
    setSelectedCompanyIds(new Set());
  }, [filtersKey]);

  const toggleCompanySelection = useCallback((id: number) => {
    setSelectedCompanyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePageSelection = useCallback((ids: number[]) => {
    setSelectedCompanyIds((prev) => {
      const next = new Set(prev);
      const allSelected = ids.length > 0 && ids.every((id) => next.has(id));
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCompanyIds(new Set());
  }, []);

  const selectedCompanyIdList = useMemo(
    () => Array.from(selectedCompanyIds),
    [selectedCompanyIds]
  );

  return (
    <div className="min-h-screen">
      <Header />
      <CompanyDashboard
        onSearch={handleSearch}
        onFilterColumnsChange={handleFilterColumnsChange}
        initialSearch={initialSearch}
        ownershipCounts={ownershipCounts}
        onColumnsClick={() => setShowColumnsModal((v) => !v)}
        onExportCSVClick={() => exportCSVRef.current?.()}
        onAddToPortfolioClick={() => setShowBulkAddModal(true)}
        selectedCount={selectedCompanyIds.size}
        columnsCount={columnsCount}
        columnsActive={showColumnsModal}
      />
      <CompanySection
        companies={companies}
        loading={loading}
        error={error}
        pagination={pagination}
        fetchCompanies={fetchCompanies}
        setRequestColumns={setRequestColumns}
        currentFilters={currentFilters}
        filterPinnedColumnKeys={filterPinnedColumnKeys}
        onEditCompany={React.useContext(CompaniesEditContext)}
        externalShowColumnsModal={showColumnsModal}
        externalSetShowColumnsModal={setShowColumnsModal}
        onColumnsCountChange={setColumnsCount}
        onRegisterExportCSV={(fn) => { exportCSVRef.current = fn; }}
        selectedCompanyIds={selectedCompanyIds}
        onToggleCompanySelection={toggleCompanySelection}
        onTogglePageSelection={togglePageSelection}
        onClearSelection={clearSelection}
        isPortfolioOnlyFilter={isPortfolioOnlyFilter}
      />
      <BulkAddToPortfolioModal
        isOpen={showBulkAddModal}
        onClose={() => setShowBulkAddModal(false)}
        companyIds={selectedCompanyIdList}
        onComplete={clearSelection}
      />
      <Footer />
    </div>
  );
}

export default function CompaniesPage() {
  return <CompaniesPageInner />;
}

//