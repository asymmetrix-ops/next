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
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { locationsService } from "@/lib/locationsService";
import {
  CompaniesCSVExporter,
  CompanyCSVRow as BaseCompanyCSVRow,
} from "@/utils/companiesCSVExport";
import { ExportLimitModal } from "@/components/ExportLimitModal";
import { checkExportLimit, EXPORT_LIMIT } from "@/utils/exportLimitCheck";
import { fetchCompaniesServer, fetchCompaniesCountsServer, CompaniesFilters as ServerFilters } from "./actions";
import { ColumnsControlRoom } from "@/components/companies/ColumnsControlRoom";
import {
  CompaniesFilterBar,
  FilterBarState,
  FilterDef,
  FilterCategory,
} from "@/components/companies/CompaniesFilterBar";
import {
  CANONICAL_COMPANY_COLUMN_KEYS,
  DEFAULT_VISIBLE_COMPANY_COLUMN_KEYS,
  PROD_DEFAULT_COMPANY_COLUMN_KEYS,
  FROZEN_COLUMN_KEYS,
  enforceColumnKeyOrder,
  getEffectiveFrozenColumnKeys,
  columnKeysToVisibility,
  visibilityToColumnKeys,
  reorderColumnKeys,
} from "@/components/companies/companiesColumnCategories";
import {
  buildColumnLinkedFilterDefs,
  EXTRA_FILTER_DEFS,
  FILTER_PINNED_TOOLTIP,
  getColumnKeysForActiveFilters,
} from "@/components/companies/companiesColumnFilterMap";
import {
  compareSortValues,
  getColumnSortKind,
  getSortValueForColumn,
} from "@/components/companies/companiesTableSort";
import {
  fetchCompanyTableDataByIds,
  selectedColumnsNeedTableData,
} from "@/lib/companyTableData";

// Feature flags (master only)
const ENABLE_COMPANIES_KEYWORD_SEARCH = false;

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
  description: string;
  primary_sectors: SectorRef[];
  secondary_sectors: SectorRef[];
  ownership_type_id: number;
  ownership: string;
  country: string;
  linkedin_logo: string;
  linkedin_members_latest: number;
  linkedin_members_old: number;
  linkedin_members: number;
  last_investment?: {
    display?: string | null;
    date?: string | null;
    days_since?: number | string | null;
  } | null;
}

interface Country {
  locations_Country: string;
}

interface Province {
  State__Province__County: string;
}

interface City {
  City: string;
}

interface PrimarySector {
  id: number;
  sector_name: string;
}

interface SecondarySector {
  id: number;
  sector_name: string;
}

interface HybridBusinessFocus {
  id: number;
  business_focus: string;
}

interface OwnershipType {
  id: number;
  ownership: string;
}

interface Filters {
  countries: string[];
  provinces: string[];
  cities: string[];
  continentalRegions?: string[];
  subRegions?: string[];
  primarySectors: number[]; // Changed from string[] to number[]
  secondarySectors: number[]; // Changed from string[] to number[]
  hybridBusinessFocuses: number[];
  exclude_business_focus?: boolean | null;
  ownershipTypes: number[]; // Changed from string[] to number[]
  linkedinMembersMin: number | null;
  linkedinMembersMax: number | null;
  lastInvestmentYearsMin: number | null;
  lastInvestmentYearsMax: number | null;
  searchQuery: string;
  keywordSearch: string;
  // Financial Metrics
  revenueMin: number | null;
  revenueMax: number | null;
  ebitdaMin: number | null;
  ebitdaMax: number | null;
  enterpriseValueMin: number | null;
  enterpriseValueMax: number | null;
  revenueMultipleMin: number | null;
  revenueMultipleMax: number | null;
  revenueGrowthMin: number | null;
  revenueGrowthMax: number | null;
  ebitdaMarginMin: number | null;
  ebitdaMarginMax: number | null;
  ruleOf40Min: number | null;
  ruleOf40Max: number | null;
  // Subscription Metrics
  arrMin: number | null;
  arrMax: number | null;
  arrPcMin: number | null;
  arrPcMax: number | null;
  churnMin: number | null;
  churnMax: number | null;
  grrMin: number | null;
  grrMax: number | null;
  nrrMin: number | null;
  nrrMax: number | null;
  newClientsRevenueGrowthMin: number | null;
  newClientsRevenueGrowthMax: number | null;
  // LinkedIn Growth Metrics
  minGrowthPercent: number | null;
  maxGrowthPercent: number | null;
  timeFrame: string;
  transactionStatus?: string[];
  portfolio_only?: boolean;
}

const createDefaultFilters = (): Filters => ({
  countries: [],
  provinces: [],
  cities: [],
  continentalRegions: [],
  subRegions: [],
  primarySectors: [],
  secondarySectors: [],
  hybridBusinessFocuses: [],
  exclude_business_focus: null,
  ownershipTypes: [],
  linkedinMembersMin: null,
  linkedinMembersMax: null,
  lastInvestmentYearsMin: null,
  lastInvestmentYearsMax: null,
  searchQuery: "",
  keywordSearch: "",
  revenueMin: null,
  revenueMax: null,
  ebitdaMin: null,
  ebitdaMax: null,
  enterpriseValueMin: null,
  enterpriseValueMax: null,
  revenueMultipleMin: null,
  revenueMultipleMax: null,
  revenueGrowthMin: null,
  revenueGrowthMax: null,
  ebitdaMarginMin: null,
  ebitdaMarginMax: null,
  ruleOf40Min: null,
  ruleOf40Max: null,
  arrMin: null,
  arrMax: null,
  arrPcMin: null,
  arrPcMax: null,
  churnMin: null,
  churnMax: null,
  grrMin: null,
  grrMax: null,
  nrrMin: null,
  nrrMax: null,
  newClientsRevenueGrowthMin: null,
  newClientsRevenueGrowthMax: null,
  minGrowthPercent: null,
  maxGrowthPercent: null,
  timeFrame: "",
  transactionStatus: [],
  portfolio_only: false,
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


// API service
type CompaniesOwnershipCounts = {
  totalCount: number;
  publicCompanies: number;
  peOwnedCompanies: number;
  vcOwnedCompanies: number;
  privateCompanies: number;
  subsidiaryCompanies: number;
  acquiredCompanies: number;
  otherCompanies: number;
};

const EMPTY_OWNERSHIP_COUNTS: CompaniesOwnershipCounts = {
  totalCount: 0,
  publicCompanies: 0,
  peOwnedCompanies: 0,
  vcOwnedCompanies: 0,
  privateCompanies: 0,
  subsidiaryCompanies: 0,
  acquiredCompanies: 0,
  otherCompanies: 0,
};

const useCompaniesAPI = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastRequestIdRef = useRef(0);
  const lastCountsRequestIdRef = useRef(0);
  const countsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentFiltersRef = useRef<Filters | undefined>(undefined);
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
    async (page: number = 1, filters?: Filters) => {
      const requestId = ++lastRequestIdRef.current;
      setLoading(true);
      setError(null);

      if (filters !== undefined) {
        currentFiltersRef.current = filters;
        setCurrentFilters(filters);
      }

      const filtersToUse =
        filters !== undefined ? filters : currentFiltersRef.current;

      try {
        const serverFilters: ServerFilters = (() => {
          if (!filtersToUse) return {};
          const serverFiltersBase = {
            countries: filtersToUse.countries,
            provinces: filtersToUse.provinces,
            cities: filtersToUse.cities,
            continentalRegions: filtersToUse.continentalRegions,
            subRegions: filtersToUse.subRegions,
            primarySectors: filtersToUse.primarySectors,
            secondarySectors: filtersToUse.secondarySectors,
            hybridBusinessFocuses: filtersToUse.hybridBusinessFocuses,
            exclude_business_focus: filtersToUse.exclude_business_focus,
            ownershipTypes: filtersToUse.ownershipTypes,
            linkedinMembersMin: filtersToUse.linkedinMembersMin,
            linkedinMembersMax: filtersToUse.linkedinMembersMax,
            lastInvestmentYearsMin: filtersToUse.lastInvestmentYearsMin,
            lastInvestmentYearsMax: filtersToUse.lastInvestmentYearsMax,
            searchQuery: filtersToUse.searchQuery,
            keywordSearch: ENABLE_COMPANIES_KEYWORD_SEARCH
              ? filtersToUse.keywordSearch
              : "",
            revenueMin: filtersToUse.revenueMin,
            revenueMax: filtersToUse.revenueMax,
            ebitdaMin: filtersToUse.ebitdaMin,
            ebitdaMax: filtersToUse.ebitdaMax,
            enterpriseValueMin: filtersToUse.enterpriseValueMin,
            enterpriseValueMax: filtersToUse.enterpriseValueMax,
            revenueMultipleMin: filtersToUse.revenueMultipleMin,
            revenueMultipleMax: filtersToUse.revenueMultipleMax,
            revenueGrowthMin: filtersToUse.revenueGrowthMin,
            revenueGrowthMax: filtersToUse.revenueGrowthMax,
            ebitdaMarginMin: filtersToUse.ebitdaMarginMin,
            ebitdaMarginMax: filtersToUse.ebitdaMarginMax,
            ruleOf40Min: filtersToUse.ruleOf40Min,
            ruleOf40Max: filtersToUse.ruleOf40Max,
            arrMin: filtersToUse.arrMin,
            arrMax: filtersToUse.arrMax,
            arrPcMin: filtersToUse.arrPcMin,
            arrPcMax: filtersToUse.arrPcMax,
            churnMin: filtersToUse.churnMin,
            churnMax: filtersToUse.churnMax,
            grrMin: filtersToUse.grrMin,
            grrMax: filtersToUse.grrMax,
            nrrMin: filtersToUse.nrrMin,
            nrrMax: filtersToUse.nrrMax,
            newClientsRevenueGrowthMin: filtersToUse.newClientsRevenueGrowthMin,
            newClientsRevenueGrowthMax: filtersToUse.newClientsRevenueGrowthMax,
            minGrowthPercent: filtersToUse.minGrowthPercent,
            maxGrowthPercent: filtersToUse.maxGrowthPercent,
            timeFrame: filtersToUse.timeFrame,
            transactionStatus: filtersToUse.transactionStatus,
            portfolio_only: filtersToUse.portfolio_only,
          };
          return serverFiltersBase;
        })();

        if (page === 1) {
          scheduleCountsFetch({
            ...serverFilters,
            ownershipTypes: [],
          });
        }

        const data = await fetchCompaniesServer(page, serverFilters);

        if (!data) {
          throw new Error("Failed to fetch companies - authentication required");
        }

        if (requestId === lastRequestIdRef.current) {
          setCompanies(data.result1?.items || []);
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

  // Initial fetch on mount
  useEffect(() => {
    fetchCompanies(1, createDefaultFilters());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return {
    companies,
    loading,
    error,
    pagination,
    ownershipCounts,
    fetchCompanies,
    currentFilters,
  };
};

// Company Logo Component
const CompanyLogo = ({ logo, name }: { logo: string; name: string }) => {
  if (logo) {
    return (
      <Image
        src={`data:image/jpeg;base64,${logo}`}
        alt={`${name} logo`}
        width={60}
        height={40}
        className="company-logo"
        style={{ objectFit: "contain" }}
      />
    );
  }

  return (
    <div
      style={{
        width: "60px",
        height: "40px",
        backgroundColor: "#f7fafc",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "10px",
        color: "#718096",
      }}
    >
      No Logo
    </div>
  );
};

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
  if (!Array.isArray(sectors) || sectors.length === 0) return "N/A";

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

  return nodes.length > 0 ? nodes : "N/A";
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

const toPlainText = (value: unknown): string => {
  if (value == null || value === "") return "N/A";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString() : "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value.trim() || "N/A";
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
    return text || "N/A";
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
    return "N/A";
  }
  return String(value);
};

const yearsToDays = (years: number | null | undefined): number | null => {
  if (years == null || !Number.isFinite(years)) return null;
  return Math.round(years * 365);
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

const makeTextColumn = (
  key: string,
  label: string,
  group: string,
  aliases: string[],
  options: Pick<CompanyColumnDefinition, "wrap" | "minWidth"> = {}
): CompanyColumnDefinition => ({
  key,
  label,
  group,
  ...options,
  render: (company) => toPlainText(readCompanyValue(company, aliases)),
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
            {company.name || "N/A"}
          </a>
        ),
      },
      makeTextColumn("website", "Website", "Identity", ["url", "website", "Website"], {
        wrap: true,
        minWidth: 220,
      }),
    ],
  },
  {
    group: "Lists",
    cols: [
      makeTextColumn("follow", "Follow", "Lists", [
        "follow_status",
        "is_followed",
        "followed",
      ]),
      makeTextColumn("list_count", "Lists", "Lists", [
        "list_count",
        "lists_count",
        "portfolio_list_count",
      ], { minWidth: 90 }),
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
          <CompanyDescription description={company.description || "N/A"} index={index} />
        ),
      },
      {
        key: "primary_sectors",
        label: "Primary Sector(s)",
        group: "Default",
        wrap: true,
        minWidth: 190,
        render: (company) =>
          renderSectorLinks(
            Array.isArray(company.primary_sectors) ? company.primary_sectors : [],
            "primary"
          ),
      },
      {
        key: "secondary_sectors",
        label: "Sectors",
        group: "Default",
        wrap: true,
        minWidth: 190,
        render: (company) =>
          renderSectorLinks(
            Array.isArray(company.secondary_sectors) ? company.secondary_sectors : [],
            "secondary"
          ),
      },
      makeTextColumn("ownership", "Ownership", "Default", [
        "ownership",
        "ownership_type",
        "_ownership_type.ownership",
      ]),
      makeTextColumn("linkedin_members", "LinkedIn Members", "Default", [
        "li_emp",
        "linkedin_members",
        "linkedin_employee",
      ], { minWidth: 130 }),
      makeTextColumn("country", "Country", "Default", [
        "country",
        "hq_country",
        "_locations.Country",
      ]),
    ],
  },
  {
    group: "Overview",
    cols: [
      makeTextColumn("year_founded", "Year Founded", "Overview", [
        "year_founded",
        "year_founded_label",
        "_years.Year",
      ]),
      makeTextColumn("hq", "HQ", "Overview", ["loc", "hq", "location", "_locations"], {
        wrap: true,
        minWidth: 220,
      }),
      makeTextColumn("city", "City", "Overview", ["city", "hq_city", "_locations.City"]),
      makeTextColumn("state", "State/Province", "Overview", [
        "province",
        "state",
        "hq_state",
        "_locations.State__Province__County",
      ]),
      makeTextColumn("linkedin_url", "LinkedIn URL", "Overview", [
        "linkedin_url",
        "LinkedIn_URL",
        "linkedin_data.LinkedIn_URL",
      ], { wrap: true, minWidth: 220 }),
      makeTextColumn("linkedin_growth", "LinkedIn Growth (%)", "Overview", [
        "linkedin_growth_pc",
        "li_growth_pc",
        "linkedin_growth_1y_pct",
        "growth_percent",
      ]),
      makeTextColumn("investors", "Investors", "Overview", [
        "investor_names",
        "investors",
        "_companies_investors",
      ], { wrap: true, minWidth: 220 }),
      makeTextColumn(
        "years_since_last_investment",
        "Years Since Last Investment",
        "Overview",
        ["last_investment.display", "last_investment"],
        { minWidth: 190 }
      ),
      makeTextColumn("lifecycle_stage", "Lifecycle Stage", "Overview", [
        "Lifecycle_stage.Lifecycle_stage",
        "lifecycle_stage",
      ]),
      makeTextColumn("product_type", "Product Type", "Overview", ["Product_Type"], {
        wrap: true,
        minWidth: 220,
      }),
      makeTextColumn("data_collection_method", "Data Collection Method", "Overview", [
        "Data_Collection_Method",
      ], { wrap: true, minWidth: 220 }),
      makeTextColumn("revenue_model", "Revenue Model", "Overview", [
        "Revenue_Model_",
        "Revenue_Model",
      ], { wrap: true, minWidth: 220 }),
      makeTextColumn("transaction_status", "Transaction Status", "Overview", [
        "transaction_status",
        "transactionStatus",
      ], { wrap: true, minWidth: 200 }),
    ],
  },
  {
    group: "Financial Metrics",
    cols: [
      makeTextColumn("revenue_m", "Revenue (m)", "Financial Metrics", [
        "revenue_m",
        "Revenue_m",
        "revenues.revenues_m",
      ]),
      makeTextColumn("ebitda_m", "EBITDA (m)", "Financial Metrics", [
        "ebitda_m",
        "EBITDA_m",
        "EBITDA.EBITDA_m",
      ]),
      makeTextColumn("enterprise_value", "Enterprise Value (m)", "Financial Metrics", [
        "ev",
        "EV",
        "ev_data.ev_value",
      ]),
      makeTextColumn("revenue_multiple", "Revenue Multiple", "Financial Metrics", [
        "revenue_multiple",
        "Revenue_multiple",
      ]),
      makeTextColumn("revenue_growth", "Revenue Growth", "Financial Metrics", [
        "rev_growth_pc",
        "Rev_Growth_PC",
      ]),
      makeTextColumn("ebitda_margin", "EBITDA Margin", "Financial Metrics", [
        "ebitda_margin",
        "EBITDA_margin",
      ]),
      makeTextColumn("rule_of_40", "Rule of 40", "Financial Metrics", [
        "rule_of_40",
        "Rule_of_40",
      ]),
    ],
  },
  {
    group: "Subscription Metrics",
    cols: [
      makeTextColumn("arr_pc", "Recurring Revenue", "Subscription Metrics", [
        "arr_pc",
        "ARR_pc",
      ]),
      makeTextColumn("arr_m", "ARR (m)", "Subscription Metrics", ["arr_m", "ARR_m"]),
      makeTextColumn("churn_pc", "Churn", "Subscription Metrics", [
        "churn_pc",
        "Churn_pc",
      ]),
      makeTextColumn("grr_pc", "GRR", "Subscription Metrics", ["grr_pc", "GRR_pc"]),
      makeTextColumn("nrr", "NRR", "Subscription Metrics", ["nrr", "NRR"]),
      makeTextColumn(
        "new_client_growth_pc",
        "New Clients Revenue Growth",
        "Subscription Metrics",
        ["new_client_growth_pc", "New_client_growth_pc"]
      ),
      makeTextColumn("upsell_pc", "Upsell", "Subscription Metrics", ["upsell_pc"]),
      makeTextColumn("cross_sell_pc", "Cross-sell", "Subscription Metrics", [
        "cross_sell_pc",
      ]),
      makeTextColumn("price_increase_pc", "Price Increase", "Subscription Metrics", [
        "price_increase_pc",
      ]),
      makeTextColumn("rev_expansion_pc", "Revenue Expansion", "Subscription Metrics", [
        "rev_expansion_pc",
      ]),
    ],
  },
  {
    group: "Other Metrics",
    cols: [
      makeTextColumn("ebit_m", "EBIT (m)", "Other Metrics", ["EBIT_m", "ebit_m"]),
      makeTextColumn("no_of_clients", "Number of Clients", "Other Metrics", [
        "No_of_clients",
        "no_of_clients",
      ]),
      makeTextColumn("rev_per_client", "Revenue per Client", "Other Metrics", [
        "Revenue_per_client",
        "rev_per_client",
      ]),
      makeTextColumn("no_employees", "Number of Employees", "Other Metrics", [
        "No_Employees",
        "no_employees",
        "linkedin_members",
      ]),
      makeTextColumn("rev_per_employee", "Revenue per Employee", "Other Metrics", [
        "Revenue_per_employee",
        "rev_per_employee",
      ]),
      makeTextColumn("financial_year", "Financial Year", "Other Metrics", [
        "Financial_Year",
        "financial_year",
      ]),
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
    if (ALL_COMPANY_COLUMN_KEYS.includes(key) && !seen.has(key)) {
      seen.add(key);
      valid.push(key);
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

  const description = company.description || "N/A";
  const isLong = description.length > 250;

  // Just use the primary sectors from the API - no derivation needed
  const computedPrimarySectors = React.useMemo(() => {
    return Array.isArray(company.primary_sectors)
      ? company.primary_sectors
      : [];
  }, [company.primary_sectors]);

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
        company.name || "N/A"
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
            : "N/A"
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
          Array.isArray(company.secondary_sectors) &&
          company.secondary_sectors.length > 0
            ? renderSectorLinks(company.secondary_sectors as unknown[], "secondary")
            : "N/A"
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
          company.ownership || "N/A"
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
          "Country:"
        ),
        React.createElement(
          "span",
          { className: "company-card-value" },
          company.country || "N/A"
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

// ── Filter helpers ─────────────────────────────────────────────────────────

const FILTER_CATEGORIES: FilterCategory[] = [
  { id: "location",     name: "Location" },
  { id: "sectors",      name: "Sectors" },
  { id: "company",      name: "Company details" },
  { id: "financial",    name: "Financial metrics" },
  { id: "subscription", name: "Subscription metrics" },
  { id: "other",        name: "Other metrics" },
];

function buildCompaniesFilterDefs({
  continentalRegions,
  subRegions,
  countries,
  provinces,
  cities,
  primarySectors,
  secondarySectors,
  ownershipTypes,
}: {
  continentalRegions: string[];
  subRegions: string[];
  countries: Country[];
  provinces: Province[];
  cities: City[];
  primarySectors: PrimarySector[];
  secondarySectors: SecondarySector[];
  ownershipTypes: OwnershipType[];
}): FilterDef[] {
  const overrides: Record<string, Partial<FilterDef>> = {
    region: { options: continentalRegions },
    sub_region: { options: subRegions },
    country: { options: countries.map((c) => c.locations_Country) },
    state: { options: provinces.map((p) => p.State__Province__County) },
    city: { options: cities.map((c) => c.City) },
    primary_sector: { options: primarySectors.map((s) => s.sector_name) },
    secondary_sector: { options: secondarySectors.map((s) => s.sector_name) },
    ownership: { options: ownershipTypes.map((o) => o.ownership) },
    transaction: {
      options: [
        "Rumoured in Market",
        "Transaction anticipated within 18 months",
        "Reported in Market",
      ],
    },
    headcount: {
      min: 0,
      max: 100000,
      presets: [
        ["Small <100", 0, 100],
        ["Mid 100-1k", 100, 1000],
        ["Large 1k-10k", 1000, 10000],
        ["Enterprise 10k+", 10000, 100000],
      ],
    },
    headcount_growth: {
      unit: "%",
      min: -50,
      max: 200,
      presets: [
        ["≥10%", 10, 200],
        ["≥25%", 25, 200],
        ["≥50%", 50, 200],
        ["Declining", -50, 0],
      ],
    },
    years_since_inv: {
      unit: "yrs",
      min: 0,
      max: 20,
      presets: [
        ["0-2y", 0, 2],
        ["3-5y", 3, 5],
        ["5+y", 5, 20],
      ],
    },
    revenue: {
      unit: "$m",
      min: 0,
      max: 5000,
      presets: [
        ["<$10m", 0, 10],
        ["$10–50m", 10, 50],
        ["$50–500m", 50, 500],
        ["$500m+", 500, 5000],
      ],
    },
    ebitda: {
      unit: "$m",
      min: -100,
      max: 2000,
      presets: [
        ["Profitable", 0, 2000],
        ["$10m+", 10, 2000],
        ["$50m+", 50, 2000],
      ],
    },
    enterprise_value: {
      unit: "$m",
      min: 0,
      max: 50000,
      presets: [
        ["<$100m", 0, 100],
        ["$100m–$1b", 100, 1000],
        ["$1–10b", 1000, 10000],
        ["Mega", 10000, 50000],
      ],
    },
    rev_growth: {
      unit: "%",
      min: -50,
      max: 200,
      presets: [["≥10%", 10, 200], ["≥25%", 25, 200], ["≥50%", 50, 200]],
    },
    ebitda_margin: {
      unit: "%",
      min: -50,
      max: 80,
      presets: [["≥20%", 20, 80], ["≥30%", 30, 80], ["≥40%", 40, 80]],
    },
    rev_multiple: {
      unit: "x",
      min: 0,
      max: 30,
      presets: [["<3x", 0, 3], ["3–7x", 3, 7], ["7x+", 7, 30]],
    },
    rule_40: {
      unit: "%",
      min: 0,
      max: 150,
      presets: [["≥40%", 40, 150], ["≥60%", 60, 150]],
    },
    arr: {
      unit: "$m",
      min: 0,
      max: 5000,
      presets: [["$10m+", 10, 5000], ["$50m+", 50, 5000], ["$100m+", 100, 5000]],
    },
    arr_growth: {
      unit: "%",
      min: -20,
      max: 200,
      presets: [["≥20%", 20, 200], ["≥40%", 40, 200]],
    },
    churn: {
      unit: "%",
      min: 0,
      max: 50,
      presets: [["<5%", 0, 5], ["<10%", 0, 10]],
    },
    nrr: {
      unit: "%",
      min: 50,
      max: 200,
      presets: [["≥100%", 100, 200], ["≥110%", 110, 200], ["≥120%", 120, 200]],
    },
    grr: {
      unit: "%",
      min: 50,
      max: 100,
      presets: [["≥90%", 90, 100], ["≥95%", 95, 100]],
    },
    new_client_growth: {
      unit: "%",
      min: -20,
      max: 100,
      presets: [["≥10%", 10, 100], ["≥25%", 25, 100]],
    },
  };

  const extras: FilterDef[] = EXTRA_FILTER_DEFS.map((extra) => ({
    ...extra,
    ...overrides[extra.id],
  }));

  return [...extras, ...buildColumnLinkedFilterDefs(overrides)];
}

function buildFiltersFromState(
  state: FilterBarState,
  data: {
    primarySectors: PrimarySector[];
    secondarySectors: SecondarySector[];
    hybridBusinessFocuses: HybridBusinessFocus[];
    ownershipTypes: OwnershipType[];
  }
): Filters {
  const f = createDefaultFilters();
  f.searchQuery = state.searchText.trim();

  for (const item of state.filters) {
    const v = item.value;
    if (v == null) continue;
    switch (item.id) {
      case "region":
        f.continentalRegions = Array.isArray(v) ? (v as string[]) : [];
        break;
      case "sub_region":
        f.subRegions = Array.isArray(v) ? (v as string[]) : [];
        break;
      case "country":
        f.countries = Array.isArray(v) ? (v as string[]) : [];
        break;
      case "state":
        f.provinces = Array.isArray(v) ? (v as string[]) : [];
        break;
      case "city":
        f.cities = Array.isArray(v) ? (v as string[]) : [];
        break;
      case "primary_sector": {
        const names = Array.isArray(v) ? (v as string[]) : [];
        f.primarySectors = names
          .map((name) => data.primarySectors.find((s) => s.sector_name === name)?.id)
          .filter((id): id is number => id != null);
        break;
      }
      case "secondary_sector": {
        const names = Array.isArray(v) ? (v as string[]) : [];
        f.secondarySectors = names
          .map((name) => data.secondarySectors.find((s) => s.sector_name === name)?.id)
          .filter((id): id is number => id != null);
        break;
      }
      case "business_focus": {
        const seg = v as string;
        f.exclude_business_focus =
          seg === "Pure-play D&A" ? true : seg === "Has non-D&A" ? false : null;
        break;
      }
      case "ownership": {
        const names = Array.isArray(v) ? (v as string[]) : [];
        f.ownershipTypes = names
          .map((name) => data.ownershipTypes.find((o) => o.ownership === name)?.id)
          .filter((id): id is number => id != null);
        break;
      }
      case "transaction":
        f.transactionStatus = Array.isArray(v) ? (v as string[]) : [];
        break;
      case "headcount": {
        const rv = v as { min?: number; max?: number };
        f.linkedinMembersMin = rv.min ?? null;
        f.linkedinMembersMax = rv.max ?? null;
        break;
      }
      case "headcount_growth": {
        const rv = v as { min?: number; max?: number };
        f.minGrowthPercent = rv.min ?? null;
        f.maxGrowthPercent = rv.max ?? null;
        break;
      }
      case "years_since_inv": {
        const rv = v as { min?: number; max?: number };
        f.lastInvestmentYearsMin = rv.min ?? null;
        f.lastInvestmentYearsMax = rv.max ?? null;
        break;
      }
      case "followed":
        f.portfolio_only = v === true;
        break;
      case "revenue": {
        const rv = v as { min?: number; max?: number };
        f.revenueMin = rv.min ?? null;
        f.revenueMax = rv.max ?? null;
        break;
      }
      case "ebitda": {
        const rv = v as { min?: number; max?: number };
        f.ebitdaMin = rv.min ?? null;
        f.ebitdaMax = rv.max ?? null;
        break;
      }
      case "enterprise_value": {
        const rv = v as { min?: number; max?: number };
        f.enterpriseValueMin = rv.min ?? null;
        f.enterpriseValueMax = rv.max ?? null;
        break;
      }
      case "rev_growth": {
        const rv = v as { min?: number; max?: number };
        f.revenueGrowthMin = rv.min ?? null;
        f.revenueGrowthMax = rv.max ?? null;
        break;
      }
      case "ebitda_margin": {
        const rv = v as { min?: number; max?: number };
        f.ebitdaMarginMin = rv.min ?? null;
        f.ebitdaMarginMax = rv.max ?? null;
        break;
      }
      case "rev_multiple": {
        const rv = v as { min?: number; max?: number };
        f.revenueMultipleMin = rv.min ?? null;
        f.revenueMultipleMax = rv.max ?? null;
        break;
      }
      case "rule_40": {
        const rv = v as { min?: number; max?: number };
        f.ruleOf40Min = rv.min ?? null;
        f.ruleOf40Max = rv.max ?? null;
        break;
      }
      case "arr": {
        const rv = v as { min?: number; max?: number };
        f.arrMin = rv.min ?? null;
        f.arrMax = rv.max ?? null;
        break;
      }
      case "arr_growth": {
        const rv = v as { min?: number; max?: number };
        f.arrPcMin = rv.min ?? null;
        f.arrPcMax = rv.max ?? null;
        break;
      }
      case "churn": {
        const rv = v as { min?: number; max?: number };
        f.churnMin = rv.min ?? null;
        f.churnMax = rv.max ?? null;
        break;
      }
      case "nrr": {
        const rv = v as { min?: number; max?: number };
        f.nrrMin = rv.min ?? null;
        f.nrrMax = rv.max ?? null;
        break;
      }
      case "grr": {
        const rv = v as { min?: number; max?: number };
        f.grrMin = rv.min ?? null;
        f.grrMax = rv.max ?? null;
        break;
      }
      case "new_client_growth": {
        const rv = v as { min?: number; max?: number };
        f.newClientsRevenueGrowthMin = rv.min ?? null;
        f.newClientsRevenueGrowthMax = rv.max ?? null;
        break;
      }
    }
  }
  return f;
}

/** Xano ownership_type ids used by ownership tab filters. */
const OTHER_OWNERSHIP_TYPE_IDS = [
  6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 21, 22,
] as const;

type OwnershipTab =
  | "all"
  | "public"
  | "pe"
  | "vc"
  | "private"
  | "subsidiary"
  | "acquired"
  | "other";

const OWNERSHIP_TAB_CONFIG: Record<
  Exclude<OwnershipTab, "all">,
  {
    label: string;
    dot: string;
    countKey: keyof CompaniesOwnershipCounts;
    ownershipTypeIds: readonly number[];
  }
> = {
  public: {
    label: "Public",
    dot: "#7c3aed",
    countKey: "publicCompanies",
    ownershipTypeIds: [7],
  },
  pe: {
    label: "PE-owned",
    dot: "#0ea5e9",
    countKey: "peOwnedCompanies",
    ownershipTypeIds: [1],
  },
  vc: {
    label: "VC-owned",
    dot: "#10b981",
    countKey: "vcOwnedCompanies",
    ownershipTypeIds: [3],
  },
  private: {
    label: "Private",
    dot: "#f59e0b",
    countKey: "privateCompanies",
    ownershipTypeIds: [2],
  },
  subsidiary: {
    label: "Subsidiary",
    dot: "#6366f1",
    countKey: "subsidiaryCompanies",
    ownershipTypeIds: [5],
  },
  acquired: {
    label: "Acquired",
    dot: "#ec4899",
    countKey: "acquiredCompanies",
    ownershipTypeIds: [4],
  },
  other: {
    label: "Other",
    dot: "#78716c",
    countKey: "otherCompanies",
    ownershipTypeIds: OTHER_OWNERSHIP_TYPE_IDS,
  },
};

function applyOwnershipTabToFilters(
  filters: Filters,
  tab: OwnershipTab,
): void {
  if (tab === "all") return;
  filters.ownershipTypes = [...OWNERSHIP_TAB_CONFIG[tab].ownershipTypeIds];
}

// Filters Component
const CompanyDashboard = ({
  onSearch,
  onFilterColumnsChange,
  initialSearch,
  ownershipCounts = EMPTY_OWNERSHIP_COUNTS,
  onColumnsClick,
  onExportCSVClick,
  columnsCount = 0,
}: {
  onSearch?: (filters: Filters) => void;
  onFilterColumnsChange?: (payload: {
    filterIds: string[];
    ownershipTabActive: boolean;
  }) => void;
  initialSearch?: string;
  ownershipCounts?: CompaniesOwnershipCounts;
  onColumnsClick?: () => void;
  onExportCSVClick?: () => void;
  columnsCount?: number;
}) => {
  // Unified filter bar state — replaces all the individual selected-* state vars
  const [filterBarState, setFilterBarState] = useState<FilterBarState>({
    filters: [],
    viewId: null,
    searchText: initialSearch || "",
  });

  // Ownership quick-filter tab — independent of FilterBar chips
  const [activeOwnershipTab, setActiveOwnershipTab] = useState<OwnershipTab>("all");

  // Option data (fetched from API)
  const [countries, setCountries] = useState<Country[]>([]);
  const [continentalRegions, setContinentalRegions] = useState<string[]>([]);
  const [subRegions, setSubRegions] = useState<string[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [primarySectors, setPrimarySectors] = useState<PrimarySector[]>([]);
  const [secondarySectors, setSecondarySectors] = useState<SecondarySector[]>([]);
  const [hybridBusinessFocuses, setHybridBusinessFocuses] = useState<HybridBusinessFocus[]>([]);
  const [ownershipTypes, setOwnershipTypes] = useState<OwnershipType[]>([]);

  // ── Derived selected values for dependent fetches ───────────────────────
  const selectedCountries = useMemo(() => {
    const item = filterBarState.filters.find((f) => f.id === "country");
    return Array.isArray(item?.value) ? (item.value as string[]) : [];
  }, [filterBarState.filters]);

  const selectedProvinces = useMemo(() => {
    const item = filterBarState.filters.find((f) => f.id === "state");
    return Array.isArray(item?.value) ? (item.value as string[]) : [];
  }, [filterBarState.filters]);

  const selectedPrimaryNames = useMemo(() => {
    const item = filterBarState.filters.find((f) => f.id === "primary_sector");
    return Array.isArray(item?.value) ? (item.value as string[]) : [];
  }, [filterBarState.filters]);

  // ── Reference data fetching ───────────────────────────────────────────
  useEffect(() => {
    locationsService.getCountries().then(setCountries).catch(console.error);
    locationsService.getContinentalRegions().then(setContinentalRegions).catch(console.error);
    locationsService.getSubRegions().then(setSubRegions).catch(console.error);
    locationsService.getPrimarySectors().then(setPrimarySectors).catch(console.error);
    locationsService.getHybridBusinessFocuses().then(setHybridBusinessFocuses).catch(console.error);
    locationsService.getOwnershipTypes().then(setOwnershipTypes).catch(console.error);
  }, []);

  // Provinces depend on selected countries
  useEffect(() => {
    if (selectedCountries.length === 0) { setProvinces([]); return; }
    locationsService.getProvinces(selectedCountries).then(setProvinces).catch(console.error);
  }, [selectedCountries]);

  // Cities depend on selected countries + provinces
  useEffect(() => {
    if (selectedCountries.length === 0) { setCities([]); return; }
    locationsService.getCities(selectedCountries, selectedProvinces).then(setCities).catch(console.error);
  }, [selectedCountries, selectedProvinces]);

  // Secondary sectors depend on selected primary sectors
  useEffect(() => {
    if (selectedPrimaryNames.length === 0) { setSecondarySectors([]); return; }
    const ids = selectedPrimaryNames
      .map((name) => primarySectors.find((s) => s.sector_name === name)?.id)
      .filter((id): id is number => id != null);
    if (ids.length > 0) {
      locationsService.getSecondarySectors(ids).then(setSecondarySectors).catch(console.error);
    } else {
      setSecondarySectors([]);
    }
  }, [selectedPrimaryNames, primarySectors]);

  // ── Build dynamic filter defs from API data ────────────────────────────
  const filterDefs = useMemo(
    () =>
      buildCompaniesFilterDefs({
        continentalRegions,
        subRegions,
        countries,
        provinces,
        cities,
        primarySectors,
        secondarySectors,
        ownershipTypes,
      }),
    [continentalRegions, subRegions, countries, provinces, cities, primarySectors, secondarySectors, ownershipTypes]
  );

  const onFilterColumnsChangeRef = useRef(onFilterColumnsChange);
  onFilterColumnsChangeRef.current = onFilterColumnsChange;

  useEffect(() => {
    onFilterColumnsChangeRef.current?.({
      filterIds: filterBarState.filters.map((filter) => filter.id),
      ownershipTabActive: activeOwnershipTab !== "all",
    });
  }, [filterBarState.filters, activeOwnershipTab]);

  // ── Auto-search on filter state or ownership tab changes ──────────────
  const buildSearchFilters = useCallback((): Filters => {
    const filters = buildFiltersFromState(filterBarState, {
      primarySectors,
      secondarySectors,
      hybridBusinessFocuses,
      ownershipTypes,
    });
    applyOwnershipTabToFilters(filters, activeOwnershipTab);
    return filters;
  }, [
    filterBarState,
    activeOwnershipTab,
    primarySectors,
    secondarySectors,
    hybridBusinessFocuses,
    ownershipTypes,
  ]);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipInitialSearchRef = useRef(true);
  const buildSearchFiltersRef = useRef(buildSearchFilters);
  buildSearchFiltersRef.current = buildSearchFilters;
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  useEffect(() => {
    if (skipInitialSearchRef.current) {
      skipInitialSearchRef.current = false;
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      onSearchRef.current?.(buildSearchFiltersRef.current());
    }, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [filterBarState]);

  const skipInitialOwnershipTabRef = useRef(true);
  useEffect(() => {
    if (skipInitialOwnershipTabRef.current) {
      skipInitialOwnershipTabRef.current = false;
      return;
    }
    onSearchRef.current?.(buildSearchFiltersRef.current());
  }, [activeOwnershipTab]);

  // ── Ownership tabs data ────────────────────────────────────────────────
  const ownershipTabOrder: Exclude<OwnershipTab, "all">[] = [
    "public",
    "pe",
    "vc",
    "private",
    "subsidiary",
    "acquired",
    "other",
  ];

  const ownershipTabs: { id: OwnershipTab; label: string; count: number; dot: string }[] = [
    { id: "all", label: "All", count: ownershipCounts.totalCount, dot: "#64748b" },
    ...ownershipTabOrder.map((id) => ({
      id,
      label: OWNERSHIP_TAB_CONFIG[id].label,
      count: ownershipCounts[OWNERSHIP_TAB_CONFIG[id].countKey],
      dot: OWNERSHIP_TAB_CONFIG[id].dot,
    })),
  ];

  const matchCount =
    activeOwnershipTab === "all"
      ? ownershipCounts.totalCount
      : ownershipTabs.find((tab) => tab.id === activeOwnershipTab)?.count ??
        ownershipCounts.totalCount;

  return (
    <div style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
      <div style={{ width: "100%", padding: "20px 28px 0" }}>

        {/* ── Header row: eyebrow + title + action buttons ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: "#94a3b8",
                marginBottom: 5,
              }}
            >
              Companies
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 700,
                color: "#0f172a",
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                lineHeight: 1.2,
              }}
            >
              Company search
              <span style={{ fontSize: 16, fontWeight: 400, color: "#94a3b8" }}>
                {matchCount.toLocaleString()} matches
              </span>
            </h1>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 6 }}>
            <button
              onClick={onColumnsClick}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                height: 36, padding: "0 14px",
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 13, fontWeight: 500, color: "#374151",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                <path d="M0 1h14M0 5h10M0 9h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Columns {columnsCount}/{ALL_COMPANY_COLUMN_KEYS.length}
            </button>
            <button
              onClick={onExportCSVClick}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                height: 36, padding: "0 14px",
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 13, fontWeight: 500, color: "#374151",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true">
                <path d="M6 1v8M3 6l3 3 3-3M1 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Export CSV
            </button>
            <button
              style={{
                display: "flex", alignItems: "center", gap: 6,
                height: 36, padding: "0 16px",
                background: "#0f172a", color: "#fff",
                border: "none", borderRadius: 8,
                fontSize: 13, fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Add to portfolio
            </button>
          </div>
        </div>

        {/* ── Ownership quick-filter tabs ── */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {ownershipTabs.map((tab) => {
            const active = activeOwnershipTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveOwnershipTab(tab.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  height: 34, padding: "0 14px",
                  background: active ? "#0f172a" : "transparent",
                  color: active ? "#fff" : "#64748b",
                  border: "1px solid",
                  borderColor: active ? "#0f172a" : "transparent",
                  borderBottom: "none",
                  borderRadius: "8px 8px 0 0",
                  fontSize: 13, fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                  transition: "background 0.12s, color 0.12s",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: active ? "rgba(255,255,255,0.7)" : tab.dot,
                    flexShrink: 0,
                  }}
                />
                {tab.label}
                <span style={{ fontSize: 12, opacity: 0.75 }}>
                  {tab.count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Filter bar card ── */}
      <div
        style={{
          background: "#fff",
          borderTop: "1px solid #e2e8f0",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div style={{ width: "100%", padding: "10px 28px 12px" }}>
          <CompaniesFilterBar
            filterDefs={filterDefs}
            filterCategories={FILTER_CATEGORIES}
            state={filterBarState}
            onStateChange={setFilterBarState}
            totalCount={matchCount}
          />
        </div>
      </div>
    </div>
  );
};


// Main Companies Component
const CompanySection = ({
  companies,
  loading,
  error,
  pagination,
  ownershipCounts,
  fetchCompanies,
  currentFilters,
  filterPinnedColumnKeys = [],
  onEditCompany,
  externalShowColumnsModal,
  externalSetShowColumnsModal,
  onColumnsCountChange,
  onRegisterExportCSV,
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
  ownershipCounts: CompaniesOwnershipCounts;
  fetchCompanies: (page?: number, filters?: Filters) => Promise<void>;
  currentFilters: Filters | undefined;
  filterPinnedColumnKeys?: string[];
  onEditCompany?: (id: number) => void;
  externalShowColumnsModal?: boolean;
  externalSetShowColumnsModal?: (v: boolean) => void;
  onColumnsCountChange?: (count: number) => void;
  onRegisterExportCSV?: (fn: () => void) => void;
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
  const [columnPrefsLoaded, setColumnPrefsLoaded] = useState(false);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>(
    DEFAULT_COMPANY_COLUMN_KEYS
  );

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
  const [companyTableDataById, setCompanyTableDataById] = useState<
    Map<number, Record<string, unknown>>
  >(new Map());
  const [companyTableDataLoading, setCompanyTableDataLoading] = useState(false);
  const [headerDragKey, setHeaderDragKey] = useState<string | null>(null);
  const [headerDragOverKey, setHeaderDragOverKey] = useState<string | null>(null);
  const headerDidDragRef = useRef(false);

  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const phantomScrollRef = useRef<HTMLDivElement | null>(null);
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
    try {
      const saved = window.localStorage.getItem(COMPANIES_COLUMNS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSelectedColumnKeys(
            getValidColumnKeys(parsed.filter((key): key is string => typeof key === "string"))
          );
        }
      }
    } catch (error) {
      console.warn("Unable to load company column preferences:", error);
    } finally {
      setColumnPrefsLoaded(true);
    }
  }, []);

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
    const ids = companies
      .map((company) => Number(company.id))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (ids.length === 0 || !selectedColumnsNeedTableData(selectedColumnKeys)) {
      setCompanyTableDataById(new Map());
      setCompanyTableDataLoading(false);
      return;
    }

    let cancelled = false;
    const loadTableData = async () => {
      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) {
        setCompanyTableDataById(new Map());
        return;
      }

      setCompanyTableDataLoading(true);
      try {
        const rows = await fetchCompanyTableDataByIds(ids, token);
        if (!cancelled) {
          setCompanyTableDataById(rows);
        }
      } catch (error) {
        console.error("Error loading company table data:", error);
        if (!cancelled) {
          setCompanyTableDataById(new Map());
        }
      } finally {
        if (!cancelled) {
          setCompanyTableDataLoading(false);
        }
      }
    };

    void loadTableData();
    return () => {
      cancelled = true;
    };
  }, [companies, selectedColumnKeys]);

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
    }
  }, [selectedColumnKeys, sortState]);

  // Report selected columns count to parent (for header button label)
  useEffect(() => {
    onColumnsCountChange?.(selectedColumns.length);
  }, [selectedColumns.length, onColumnsCountChange]);


  const handleSortColumn = useCallback((columnKey: string) => {
    if (!getColumnSortKind(columnKey)) return;
    setSortState((current) => {
      if (current?.key !== columnKey) return { key: columnKey, dir: "asc" };
      return { key: columnKey, dir: current.dir === "asc" ? "desc" : "asc" };
    });
  }, []);

  const sortedCompanies = useMemo(() => {
    if (!sortState || !getColumnSortKind(sortState.key)) {
      return companies;
    }
    const { key, dir } = sortState;
    return [...companies].sort((companyA, companyB) => {
      const rowA = {
        ...companyA,
        ...(companyTableDataById.get(companyA.id) || {}),
      } as Record<string, unknown>;
      const rowB = {
        ...companyB,
        ...(companyTableDataById.get(companyB.id) || {}),
      } as Record<string, unknown>;
      return compareSortValues(
        getSortValueForColumn(rowA, key),
        getSortValueForColumn(rowB, key),
        dir
      );
    });
  }, [companies, companyTableDataById, sortState]);

  const getTableColumnClassName = (
    column: CompanyColumnDefinition,
    extra?: string | (string | undefined)[]
  ): string | undefined => {
    const extras = extra == null ? [] : Array.isArray(extra) ? extra : [extra];
    const classes = [
      ...extras,
      column.wrap ? "company-table-cell-wrap" : undefined,
      column.key === "logo" ? "company-table-sticky-logo" : undefined,
      column.key === "name" ? "company-table-sticky-name" : undefined,
    ].filter(Boolean);
    return classes.length > 0 ? classes.join(" ") : undefined;
  };

  const isFrozenColumnKey = (key: string) =>
    getEffectiveFrozenColumnKeys(filterPinnedColumnKeys).includes(key);

  const isFilterPinnedColumnKey = (key: string) =>
    filterPinnedColumnKeys.includes(key) &&
    !(FROZEN_COLUMN_KEYS as readonly string[]).includes(key);


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
      const params = new URLSearchParams();

      // Apply filters if present
      const f = currentFilters;
      if (f) {
        // Text inputs for new filters
        if ((f.continentalRegions || []).length > 0)
          params.append(
            "Continental_Region",
            (f.continentalRegions || []).join(",")
          );
        if ((f.subRegions || []).length > 0)
          params.append(
            "geographical_sub_region",
            (f.subRegions || []).join(",")
          );

        (f.countries || []).forEach((v) => params.append("Countries[]", v));
        (f.provinces || []).forEach((v) => params.append("Provinces[]", v));
        (f.cities || []).forEach((v) => params.append("Cities[]", v));
        (f.primarySectors || []).forEach((id) =>
          params.append("Primary_sectors_ids[]", String(id))
        );
        (f.secondarySectors || []).forEach((id) =>
          params.append("Secondary_sectors_ids[]", String(id))
        );
        (f.ownershipTypes || []).forEach((id) =>
          params.append("Ownership_types_ids[]", String(id))
        );
        (f.hybridBusinessFocuses || []).forEach((id) =>
          params.append("Hybrid_Data_ids[]", String(id))
        );
        const transactionStatuses = f.transactionStatus || [];
        if (transactionStatuses.length > 0) {
          transactionStatuses.forEach((status) => {
            params.append("transaction_status[]", status);
          });
        }
        params.append("portfolio_only", String(Boolean(f.portfolio_only)));

        // Helper function to only append if value exists
        const appendIfValue = (key: string, value: number | null | undefined) => {
          if (value != null && value !== undefined) {
            params.append(key, value.toString());
          }
        };

        // LinkedIn Members
        appendIfValue("Min_linkedin_members", f.linkedinMembersMin);
        appendIfValue("Max_linkedin_members", f.linkedinMembersMax);
        appendIfValue(
          "Last_investment_days_since_min",
          yearsToDays(f.lastInvestmentYearsMin)
        );
        appendIfValue(
          "Last_investment_days_since_max",
          yearsToDays(f.lastInvestmentYearsMax)
        );
        appendIfValue("min_growth_percent", f.minGrowthPercent);
        appendIfValue("max_growth_percent", f.maxGrowthPercent);
        if (f.timeFrame && f.timeFrame.trim()) {
          params.append("time_frame", f.timeFrame.trim());
        }

        // Financial Metrics min/max for export
        appendIfValue("Revenue_min", f.revenueMin);
        appendIfValue("Revenue_max", f.revenueMax);
        appendIfValue("EBITDA_min", f.ebitdaMin);
        appendIfValue("EBITDA_max", f.ebitdaMax);
        appendIfValue("Enterprise_Value_min", f.enterpriseValueMin);
        appendIfValue("Enterprise_Value_max", f.enterpriseValueMax);
        appendIfValue("Revenue_Multiple_min", f.revenueMultipleMin);
        appendIfValue("Revenue_Multiple_max", f.revenueMultipleMax);
        appendIfValue("Revenue_Growth_min", f.revenueGrowthMin);
        appendIfValue("Revenue_Growth_max", f.revenueGrowthMax);
        appendIfValue("EBITDA_Margin_min", f.ebitdaMarginMin);
        appendIfValue("EBITDA_Margin_max", f.ebitdaMarginMax);
        appendIfValue("Rule_of_40_min", f.ruleOf40Min);
        appendIfValue("Rule_of_40_max", f.ruleOf40Max);

        // Subscription Metrics min/max for export
        appendIfValue("ARR_min", f.arrMin);
        appendIfValue("ARR_max", f.arrMax);
        appendIfValue("ARR_pc_min", f.arrPcMin);
        appendIfValue("ARR_pc_max", f.arrPcMax);
        appendIfValue("Churn_min", f.churnMin);
        appendIfValue("Churn_max", f.churnMax);
        appendIfValue("GRR_min", f.grrMin);
        appendIfValue("GRR_max", f.grrMax);
        appendIfValue("NRR_min", f.nrrMin);
        appendIfValue("NRR_max", f.nrrMax);
        appendIfValue("New_Clients_Revenue_Growth_min", f.newClientsRevenueGrowthMin);
        appendIfValue("New_Clients_Revenue_Growth_max", f.newClientsRevenueGrowthMax);

        if (f.searchQuery && f.searchQuery.trim()) {
          params.append("query", f.searchQuery.trim());
        }

        // Keyword search (searches across descriptions)
        if (
          ENABLE_COMPANIES_KEYWORD_SEARCH &&
          f.keywordSearch &&
          f.keywordSearch.trim()
        ) {
          params.append("keywords_search", f.keywordSearch.trim());
        }
      }

      // First, fetch page 1 to get total page count
      const baseParams = new URLSearchParams(params.toString());
      baseParams.append("Offset", "1");
      baseParams.append("Per_page", "25");
      
      const firstPageUrl = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/Export_new_companies_csv?${baseParams.toString()}`;
      
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
          const pageParams = new URLSearchParams(params.toString());
          pageParams.append("Offset", page.toString());
          pageParams.append("Per_page", "25");
          
          const pageUrl = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/Export_new_companies_csv?${pageParams.toString()}`;
          
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
            Name: it.name ?? "N/A",
            Description: it.description ?? "N/A",
            "Primary Sector(s)": CompaniesCSVExporter.formatSectors(primary),
            Sectors: CompaniesCSVExporter.formatSectors(secondary),
            Ownership: it.ownership ?? "N/A",
            "LinkedIn Members": CompaniesCSVExporter.formatLinkedinMembers(
              typeof it.linkedin_members === "number"
                ? it.linkedin_members
                : Number(it.linkedin_members)
            ),
            Country: it.country ?? "N/A",
            "Company Link": companyLink || "N/A",
            "Company URL": it.company_link ?? "",
            // Financial Metrics - exact field names from API
            Revenue:
              it.Revenue_m != null && it.Revenue_m !== ""
                ? `${it.Revenue_m}M`
                : "N/A",
            EBITDA:
              it.EBITDA_m != null && it.EBITDA_m !== ""
                ? `${it.EBITDA_m}M`
                : "N/A",
            "Enterprise Value":
              it.EV != null && it.EV !== "" ? `${it.EV}M` : "N/A",
            "Revenue Multiple":
              it.Revenue_multiple != null && it.Revenue_multiple !== ""
                ? String(it.Revenue_multiple)
                : "N/A",
            "Revenue Growth":
              it.Rev_Growth_PC != null && it.Rev_Growth_PC !== ""
                ? `${it.Rev_Growth_PC}%`
                : "N/A",
            "EBITDA Margin":
              it.EBITDA_margin != null && it.EBITDA_margin !== ""
                ? `${it.EBITDA_margin}%`
                : "N/A",
            "Rule of 40":
              it.Rule_of_40 != null && it.Rule_of_40 !== ""
                ? String(it.Rule_of_40)
                : "N/A",
            // Subscription Metrics - exact field names from API
            "Recurring Revenue": CompaniesCSVExporter.formatPercent(arrPc),
            ARR: it.ARR_m != null && it.ARR_m !== "" ? `${it.ARR_m}M` : "N/A",
            Churn:
              it.Churn_pc != null && it.Churn_pc !== ""
                ? `${it.Churn_pc}%`
                : "N/A",
            GRR:
              it.GRR_pc != null && it.GRR_pc !== ""
                ? `${it.GRR_pc}%`
                : "N/A",
            NRR: it.NRR != null && it.NRR !== "" ? `${it.NRR}%` : "N/A",
            "New Clients Revenue Growth":
              it.New_client_growth_pc != null && it.New_client_growth_pc !== ""
                ? `${it.New_client_growth_pc}%`
                : "N/A",
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
        const toStringArray = (vals: unknown): string[] => {
          if (!Array.isArray(vals)) return [];
          return vals
            .map((v) => getSectorInfo(v).name)
            .map((n) => String(n ?? "").trim())
            .filter(Boolean);
        };
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
  }, [currentFilters, companies]);

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
      const totalPages = pagination.pageTotal || 1;
      if (loading || page < 1 || page > totalPages || page === pagination.curPage) {
        return;
      }

      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      void fetchCompanies(page, currentFilters);
    },
    [fetchCompanies, currentFilters, loading, pagination.curPage, pagination.pageTotal]
  );

  const tableRows = useMemo(
    () =>
      sortedCompanies.map((company, index) => {
        const tableData = companyTableDataById.get(company.id) || {};
        const displayCompany = {
          ...company,
          ...tableData,
        } as Company;

        return (
          <tr key={company.id || index}>
            {selectedColumns.map((column) => (
              <td
                key={`${company.id || index}-${column.key}`}
                className={getTableColumnClassName(column)}
                style={{ minWidth: column.minWidth }}
              >
                {column.render(displayCompany, {
                  index,
                  onCompanyClick: handleCompanyClick,
                })}
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
            <td style={{ textAlign: "center" }}>
              {company.id ? (
                <InlineFollowButton
                  followKey="followed_companies"
                  entityId={company.id}
                  label={String(displayCompany.name || "")}
                />
              ) : null}
            </td>
          </tr>
        );
      }),
    [
      sortedCompanies,
      companyTableDataById,
      handleCompanyClick,
      onEditCompany,
      selectedColumns,
    ]
  );

  const generatePaginationButtons = () => {
    const buttons: React.ReactNode[] = [];
    const maxVisible = 7;
    const totalPages = pagination.pageTotal || 0;
    const prevPage = pagination.prevPage ?? pagination.curPage - 1;
    const nextPage = pagination.nextPage ?? pagination.curPage + 1;

    if (totalPages <= 1) {
      return buttons;
    }

    buttons.push(
      <button
        key="previous"
        className="pagination-button pagination-nav"
        onClick={() => handlePageChange(prevPage)}
        disabled={pagination.curPage <= 1}
      >
        Previous
      </button>
    );

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(
          <button
            key={i}
            className={`pagination-button ${
              i === pagination.curPage ? "active" : ""
            }`}
            onClick={() => handlePageChange(i)}
          >
            {i}
          </button>
        );
      }
    } else {
      // Always show first page
      buttons.push(
        <button
          key={1}
          className={`pagination-button ${
            1 === pagination.curPage ? "active" : ""
          }`}
          onClick={() => handlePageChange(1)}
        >
          1
        </button>
      );

      if (pagination.curPage > 3) {
        buttons.push(
          <span key="ellipsis1" className="pagination-ellipsis">
            ...
          </span>
        );
      }

      // Show pages around current
      const start = Math.max(2, pagination.curPage - 1);
      const end = Math.min(totalPages - 1, pagination.curPage + 1);

      for (let i = start; i <= end; i++) {
        if (i > 1 && i < totalPages) {
          buttons.push(
            <button
              key={i}
              className={`pagination-button ${
                i === pagination.curPage ? "active" : ""
              }`}
              onClick={() => handlePageChange(i)}
            >
              {i}
            </button>
          );
        }
      }

      if (pagination.curPage < totalPages - 2) {
        buttons.push(
          <span key="ellipsis2" className="pagination-ellipsis">
            ...
          </span>
        );
      }

      // Always show last page
      if (totalPages > 1) {
        buttons.push(
          <button
            key={totalPages}
            className={`pagination-button ${
              totalPages === pagination.curPage ? "active" : ""
            }`}
            onClick={() => handlePageChange(totalPages)}
          >
            {totalPages}
          </button>
        );
      }
    }

    buttons.push(
      <button
        key="next"
        className="pagination-button pagination-nav"
        onClick={() => handlePageChange(nextPage)}
        disabled={pagination.curPage >= totalPages}
      >
        Next
      </button>
    );

    return buttons;
  };

  const style = `
    .loading-skeleton {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s ease-in-out infinite;
      border-radius: 4px;
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
      z-index: 2;
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
      position: sticky;
      left: 0;
      z-index: 3;
      background: #fff;
      box-shadow: 2px 0 4px rgba(15, 23, 42, 0.06);
      min-width: 88px;
      max-width: 88px;
      width: 88px;
    }
    .company-table-sticky-name {
      position: sticky;
      left: 88px;
      z-index: 3;
      background: #fff;
      box-shadow: 2px 0 4px rgba(15, 23, 42, 0.06);
    }
    .company-table thead th.company-table-sticky-logo,
    .company-table thead th.company-table-sticky-name {
      z-index: 5;
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

  if (loading) {
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
            React.createElement("th", null, "Country"),
            ...(onEditCompany
              ? [React.createElement("th", { key: "edit" }, "")]
              : []),
            React.createElement("th", { key: "follow", style: { textAlign: "center" } }, "Follow")
          )
        ),
        React.createElement(
          "tbody",
          null,
          ...[...Array(10)].map((_, i) => skeletonRow(i))
        )
      ),
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
      React.createElement("style", {
        dangerouslySetInnerHTML: { __html: style },
      })
    );
  }

  if (companies.length === 0 && currentFilters?.portfolio_only === true) {
    return React.createElement(
      "div",
      { className: "company-section", ref: sectionRef },
      React.createElement(FollowedOnlyEmptyState, { entity: "companies" }),
      React.createElement("style", {
        dangerouslySetInnerHTML: { __html: style },
      })
    );
  }

  return React.createElement(
    "div",
    { className: "company-section", ref: sectionRef },
    React.createElement(
      "div",
      { className: "company-stats", style: { display: "none" } },
      null,
      React.createElement(
        "div",
        { className: "stats-column" },
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 0",
              borderBottom: "1px solid #e2e8f0",
            },
          },
          React.createElement(
            "span",
            {
              style: {
                fontSize: "14px",
                color: "#4a5568",
                fontWeight: "500",
              },
            },
            "Companies: "
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: "16px",
                color: "#000",
                fontWeight: "600",
              },
            },
            pagination.itemsReceived.toLocaleString()
          )
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 0",
              borderBottom: "1px solid #e2e8f0",
            },
          },
          React.createElement(
            "span",
            {
              style: {
                fontSize: "14px",
                color: "#4a5568",
                fontWeight: "500",
              },
            },
            "Public companies: "
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: "16px",
                color: "#000",
                fontWeight: "600",
              },
            },
            ownershipCounts.publicCompanies.toLocaleString()
          )
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 0",
              borderBottom: "1px solid #e2e8f0",
            },
          },
          React.createElement(
            "span",
            {
              style: {
                fontSize: "14px",
                color: "#4a5568",
                fontWeight: "500",
              },
            },
            "PE-owned companies: "
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: "16px",
                color: "#000",
                fontWeight: "600",
              },
            },
            ownershipCounts.peOwnedCompanies.toLocaleString()
          )
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 0",
              borderBottom: "1px solid #e2e8f0",
            },
          },
          React.createElement(
            "span",
            {
              style: {
                fontSize: "14px",
                color: "#4a5568",
                fontWeight: "500",
              },
            },
            "VC-owned companies: "
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: "16px",
                color: "#000",
                fontWeight: "600",
              },
            },
            ownershipCounts.vcOwnedCompanies.toLocaleString()
          )
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 0",
              borderBottom: "none",
            },
          },
          React.createElement(
            "span",
            {
              style: {
                fontSize: "14px",
                color: "#4a5568",
                fontWeight: "500",
              },
            },
            "Private companies: "
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: "16px",
                color: "#000",
                fontWeight: "600",
              },
            },
            ownershipCounts.privateCompanies.toLocaleString()
          )
        )
      )
    ),
    showColumnsModal &&
      React.createElement(ColumnsControlRoom, {
        initial: columnVisibilityInitial,
        initialOrder: selectedColumnKeys,
        filterPinnedColumnKeys,
        onCancel: () => setShowColumnsModal(false),
        onApply: handleApplyColumnVisibility,
      }),
    companyTableDataLoading &&
      React.createElement(
        "div",
        { style: { fontSize: 12, color: "#94a3b8", marginBottom: 8 } },
        "Loading custom column data…"
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
                  style: { minWidth: column.minWidth },
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
                column.label,
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
              : []),
            React.createElement("th", { key: "follow", style: { textAlign: "center" } }, "Follow")
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
      { className: "pagination" },
      generatePaginationButtons()
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
    currentFilters,
  } = useCompaniesAPI();

  const handleSearch = useCallback(
    (filters: Filters) => {
      fetchCompanies(1, filters);
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

  return (
    <div className="min-h-screen">
      <Header />
      <CompanyDashboard
        onSearch={handleSearch}
        onFilterColumnsChange={handleFilterColumnsChange}
        initialSearch={initialSearch}
        ownershipCounts={ownershipCounts}
        onColumnsClick={() => setShowColumnsModal(true)}
        onExportCSVClick={() => exportCSVRef.current?.()}
        columnsCount={columnsCount}
      />
      <CompanySection
        companies={companies}
        loading={loading}
        error={error}
        pagination={pagination}
        ownershipCounts={ownershipCounts}
        fetchCompanies={fetchCompanies}
        currentFilters={currentFilters}
        filterPinnedColumnKeys={filterPinnedColumnKeys}
        onEditCompany={React.useContext(CompaniesEditContext)}
        externalShowColumnsModal={showColumnsModal}
        externalSetShowColumnsModal={setShowColumnsModal}
        onColumnsCountChange={setColumnsCount}
        onRegisterExportCSV={(fn) => { exportCSVRef.current = fn; }}
      />
      <Footer />
    </div>
  );
}

export default function CompaniesPage() {
  return <CompaniesPageInner />;
}

//