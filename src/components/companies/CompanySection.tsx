"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { McpGuestSalesConversionModal } from "@/components/mcp-guest/McpGuestSalesConversionPanel";
import { MCP_GUEST_ALLOWED_PATH } from "@/lib/mcpGuest";
import { FollowedOnlyEmptyState } from "@/components/FollowedOnlyEmptyState";
import { InlineFollowButton } from "@/components/InlineFollowButton";
import {
  CompaniesCSVExporter,
  CompanyCSVRow as BaseCompanyCSVRow,
} from "@/utils/companiesCSVExport";
import { ExportLimitModal } from "@/components/ExportLimitModal";
import { checkExportLimit, EXPORT_LIMIT } from "@/utils/exportLimitCheck";
import type { CompaniesFilters } from "@/app/companies/actions";
import { COMPANIES_API_BASE, companySearchPayloadToSearchParams } from "@/lib/companiesFilterPayload";
import { ColumnsControlRoom } from "@/components/companies/ColumnsControlRoom";
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
import { FILTER_PINNED_TOOLTIP } from "@/components/companies/companiesColumnFilterMap";
import {
  compareSortValues,
  getColumnSortKind,
  getSortValueForColumn,
} from "@/components/companies/companiesTableSort";
import { formatWebsiteLabel, normalizeWebsiteUrl } from "@/lib/websiteUrl";
import { readLogoFromRecord } from "@/lib/companyLogo";
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
import type { CompaniesOwnershipCounts } from "@/components/companies/companiesFilterConfig";
import { SEARCH_TABLE_STYLES } from "@/components/search/searchTableStyles";
import { SEARCH_IDENTITY_COLUMN_KEYS } from "@/components/search/searchTableUtils";
import { SearchEntityIdentityCell } from "@/components/search/SearchEntityIdentityCell";
import { SearchEntityLongText } from "@/components/search/SearchEntityDescription";
import { SearchEntityMultiValueCell } from "@/components/search/SearchEntityMultiValueCell";
import type { SearchMultiValueItem } from "@/components/search/searchMultiValueUtils";
import { buildSectorItemsFromUnknown } from "@/components/search/searchEntityLinkUtils";
import { BulkPortfolioActionToolbar } from "@/components/search/BulkPortfolioActionToolbar";
import { useSectorNameIdMaps } from "@/components/search/useSectorNameIdMaps";
import type { SectorNameIdMaps } from "@/components/search/useSectorNameIdMaps";
import CompactPagination from "@/components/ui/CompactPagination";

interface CompanyCSVRow extends BaseCompanyCSVRow {
  Revenue?: string;
  EBITDA?: string;
  "Enterprise Value"?: string;
  "Revenue Multiple"?: string;
  "Revenue Growth"?: string;
  "EBITDA Margin"?: string;
  "Rule of 40"?: string;
  Churn?: string;
  GRR?: string;
  NRR?: string;
  "New Clients Revenue Growth"?: string;
}

export type SectorRef =
  | string
  | {
      id?: number;
      sector_name?: string;
      name?: string;
    };

export interface Company {
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

export type Filters = CompaniesFilters;

export const createDefaultFilters = (): Filters => ({
  filters_sql: null,
  has_financial_filters: false,
  has_year_filter: false,
  query: null,
  columns: [],
});

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
  Revenue_m?: number | string;
  EBITDA_m?: number | string;
  EV?: number | string;
  Revenue_multiple?: number | string;
  Rev_Growth_PC?: number | string;
  EBITDA_margin?: number | string;
  Rule_of_40?: number | string;
  Churn_pc?: number | string;
  GRR_pc?: number | string;
  NRR?: number | string;
  New_client_growth_pc?: number | string;
  Financial_Year?: number | string;
}

const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return "0";
  return num.toLocaleString();
};

const isExportCompanyJson = (value: unknown): value is ExportCompanyJson => {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.name === "string" ||
    typeof obj.description === "string" ||
    typeof obj.country === "string"
  );
};

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

const buildSectorItems = (
  sectors: unknown[] | undefined,
  kind: "primary" | "secondary",
  sectorMaps?: SectorNameIdMaps
): SearchMultiValueItem[] =>
  buildSectorItemsFromUnknown(sectors, kind, sectorMaps);

const renderSectorLinks = (
  sectors: unknown[] | undefined,
  kind: "primary" | "secondary",
  sectorMaps?: SectorNameIdMaps,
  guestMode = false,
  onLinkClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void
): React.ReactNode => (
  <SearchEntityMultiValueCell
    items={
      guestMode
        ? buildSectorItems(sectors, kind, sectorMaps).map((item) =>
            item.href ? { ...item, href: "#" } : item
          )
        : buildSectorItems(sectors, kind, sectorMaps)
    }
    onLinkClick={guestMode ? onLinkClick : undefined}
  />
);

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

const buildInvestorItems = (
  investors: unknown[],
  guestMode = false
): SearchMultiValueItem[] =>
  investors.flatMap((investor, index) => {
    const { name, id } = getInvestorInfo(investor);
    if (!name) return [];
    return [
      {
        name,
        href: guestMode
          ? "#"
          : id != null
            ? `/investors/${id}`
            : undefined,
        key: `investor-${id ?? name}-${index}`,
      },
    ];
  });

const renderInvestorLinks = (
  investors: unknown[],
  guestMode = false,
  onLinkClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void
): React.ReactNode => (
  <SearchEntityMultiValueCell
    items={buildInvestorItems(investors, guestMode)}
    onLinkClick={guestMode ? onLinkClick : undefined}
  />
);

type CompanyColumnRenderContext = {
  index: number;
  onCompanyClick: (companyId: number) => void;
  onGuestConversionClick?: () => void;
  readOnlyGuestMode?: boolean;
  sectorMaps?: SectorNameIdMaps;
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
      const parsed = parseListField(raw);
      if (parsed.length === 0) return toPlainText(raw);

      const multiItems = parsed.flatMap((item, index) => {
        const name = toPlainText(item);
        if (!name || name === "-") return [];
        return [{ name, key: `${key}-${index}-${name}` }];
      });

      if (multiItems.length > 0) {
        return <SearchEntityMultiValueCell items={multiItems} />;
      }
      return toPlainText(raw);
    }
    const columnType = COLUMN_TYPE_BY_KEY.get(key) ?? "text";
    if (columnType === "paragraph") {
      return <SearchEntityLongText text={toPlainText(raw)} />;
    }
    if (columnType === "text" || columnType === "url") {
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
        key: "name",
        label: "Name",
        group: "Identity",
        wrap: true,
        minWidth: 280,
        render: (company, { onCompanyClick, readOnlyGuestMode }) => {
          const hqRaw = readCompanyValue(company, [
            ...getFieldAliasesForColumn("hq"),
          ]);
          const subtitle =
            hqRaw != null && String(hqRaw).trim() && String(hqRaw).trim() !== "-"
              ? String(hqRaw).trim()
              : undefined;

          return (
            <SearchEntityIdentityCell
              name={company.name || "-"}
              logo={readLogoFromRecord(company, getFieldAliasesForColumn("logo"))}
              subtitle={subtitle}
              href={readOnlyGuestMode ? "#" : `/company/${company.id}`}
              readOnly={false}
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
            />
          );
        },
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
        render: (company) => (
          <SearchEntityLongText text={company.description || "-"} />
        ),
      },
      {
        key: "primary_sectors",
        label: "Primary Sector(s)",
        group: "Default",
        wrap: true,
        minWidth: 190,
        render: (company, { sectorMaps, readOnlyGuestMode, onGuestConversionClick }) =>
          renderSectorLinks(
            parseListField(company.primary_sectors),
            "primary",
            sectorMaps,
            readOnlyGuestMode,
            onGuestConversionClick ? () => onGuestConversionClick() : undefined
          ),
      },
      {
        key: "secondary_sectors",
        label: "Secondary Sector(s)",
        group: "Default",
        wrap: true,
        minWidth: 190,
        render: (company, { sectorMaps, readOnlyGuestMode, onGuestConversionClick }) =>
          renderSectorLinks(
            parseListField(company.secondary_sectors),
            "secondary",
            sectorMaps,
            readOnlyGuestMode,
            onGuestConversionClick ? () => onGuestConversionClick() : undefined
          ),
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
        render: (company, { readOnlyGuestMode, onGuestConversionClick }) =>
          renderInvestorLinks(
            readInvestorsFromCompany(company),
            readOnlyGuestMode,
            onGuestConversionClick ? () => onGuestConversionClick() : undefined
          ),
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
      {
        key: "has_mcp",
        label: "MCP",
        group: "Overview",
        minWidth: 72,
        render: (company) => {
          const raw = readCompanyValue(company, [...getFieldAliasesForColumn("has_mcp")]);
          if (raw === true) return "Yes";
          if (raw === false) return "No";
          return "-";
        },
      },
      makeTextColumn("created_at", "Date Added", "Overview", {
        minWidth: 120,
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
  readOnlyGuestMode = false,
  sectorMaps,
  onGuestConversionClick,
}: {
  company: Company;
  index: number;
  readOnlyGuestMode?: boolean;
  sectorMaps?: SectorNameIdMaps;
  onGuestConversionClick?: () => void;
}) => {
  const router = useRouter();

  const description = company.description || "-";

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
      (() => {
        const logoSrc = readLogoFromRecord(company, getFieldAliasesForColumn("logo"));
        return logoSrc
          ? React.createElement("img", {
              src: logoSrc,
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
            );
      })(),
      React.createElement(
        readOnlyGuestMode ? "button" : "a",
        {
          className: "company-card-name",
          type: readOnlyGuestMode ? "button" : undefined,
          ...(readOnlyGuestMode
            ? {
                style: {
                  textDecoration: "none",
                  color: "#0075df",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  textAlign: "left" as const,
                },
                onClick: () => onGuestConversionClick?.(),
              }
            : {
                href: `/company/${company.id}`,
                style: { textDecoration: "none", color: "#0075df" },
                onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
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
                  router.push(`/company/${company.id}`);
                },
              }),
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
            ? renderSectorLinks(
                computedPrimarySectors as unknown[],
                "primary",
                sectorMaps,
                readOnlyGuestMode,
                onGuestConversionClick ? () => onGuestConversionClick() : undefined
              )
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
            ? renderSectorLinks(
                parseListField(company.secondary_sectors),
                "secondary",
                sectorMaps,
                readOnlyGuestMode,
                onGuestConversionClick ? () => onGuestConversionClick() : undefined
              )
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
        React.createElement(SearchEntityLongText, { text: description })
      )
    )
  );
};
const CompanyCard = React.memo(CompanyCardBase);
CompanyCard.displayName = "CompanyCard";

export const CompanySection = ({
  companies,
  loading,
  error,
  pagination,
  ownershipCounts,
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
  embedded = false,
  readOnlyGuestMode = false,
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
  embedded?: boolean;
  readOnlyGuestMode?: boolean;
}) => {
  const router = useRouter();
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const sectionClassName = embedded
    ? "company-section company-section-embedded"
    : "company-section";
  const [showExportLimitModal, setShowExportLimitModal] = useState(false);
  const [showSalesConversion, setShowSalesConversion] = useState(false);

  const openSalesConversion = useCallback(() => {
    setShowSalesConversion(true);
  }, []);

  useEffect(() => {
    if (!readOnlyGuestMode || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("book") !== "1") return;

    setShowSalesConversion(true);
    params.delete("book");
    const nextQuery = params.toString();
    router.replace(
      nextQuery ? `${MCP_GUEST_ALLOWED_PATH}?${nextQuery}` : MCP_GUEST_ALLOWED_PATH
    );
  }, [readOnlyGuestMode, router]);
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
  const [headerDragKey, setHeaderDragKey] = useState<string | null>(null);
  const [headerDragOverKey, setHeaderDragOverKey] = useState<string | null>(null);
  const headerDidDragRef = useRef(false);
  const sectorMaps = useSectorNameIdMaps();

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
    if (readOnlyGuestMode) {
      setSelectedColumnKeys([...PROD_DEFAULT_COMPANY_COLUMN_KEYS]);
      setColumnPrefsLoaded(true);
      return;
    }
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
  }, [readOnlyGuestMode]);

  useEffect(() => {
    if (readOnlyGuestMode || !columnPrefsLoaded) return;
    try {
      window.localStorage.setItem(
        COMPANIES_COLUMNS_STORAGE_KEY,
        JSON.stringify(selectedColumnKeys)
      );
    } catch (error) {
      console.warn("Unable to save company column preferences:", error);
    }
  }, [readOnlyGuestMode, columnPrefsLoaded, selectedColumnKeys]);

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
          !prevKeys.has(key) && key !== "name"
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

    void fetchCompanies(1, currentFilters);
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
      left += col?.minWidth ?? 120;
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
        background: header ? "#f8fafc" : selected ? "#EFF6FF" : "#fff",
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
      SEARCH_IDENTITY_COLUMN_KEYS.has(column.key) ? "company-table-col-name" : undefined,
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
      const params = currentFilters
        ? companySearchPayloadToSearchParams(currentFilters)
        : new URLSearchParams();

      // First, fetch page 1 to get total page count
      const baseParams = new URLSearchParams(params.toString());
      baseParams.append("Offset", "1");
      baseParams.append("Per_page", "25");
      
      const firstPageUrl = `${COMPANIES_API_BASE}/Export_new_companies_csv?${baseParams.toString()}`;
      
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
          
          const pageUrl = `${COMPANIES_API_BASE}/Export_new_companies_csv?${pageParams.toString()}`;
          
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
  }, [currentFilters, companies]);

  // Register export function with parent so header Export CSV button works
  useEffect(() => {
    if (readOnlyGuestMode) return;
    onRegisterExportCSV?.(handleExportCSV);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleExportCSV, readOnlyGuestMode]);

  const handleCompanyClick = useCallback(
    (companyId: number) => {
      if (readOnlyGuestMode) {
        openSalesConversion();
        return;
      }
      router.push(`/company/${companyId}`);
    },
    [router, readOnlyGuestMode, openSalesConversion]
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
              {!readOnlyGuestMode && (
              <input
                type="checkbox"
                checked={isRowSelected}
                onChange={() => onToggleCompanySelection(company.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select ${company.name || "company"}`}
              />
              )}
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
                    onGuestConversionClick: openSalesConversion,
                    readOnlyGuestMode,
                    sectorMaps,
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
      readOnlyGuestMode,
      sectorMaps,
      openSalesConversion,
    ]
  );

  const style = SEARCH_TABLE_STYLES;

  const columnsModalLayer = [
    !readOnlyGuestMode &&
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
    !readOnlyGuestMode &&
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
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 10 } },
            React.createElement("div", {
              className: "loading-skeleton",
              style: { width: "40px", height: "40px", borderRadius: 4, flexShrink: 0 },
            }),
            React.createElement("div", {
              className: "loading-skeleton",
              style: { width: "70%", height: "14px" },
            })
          )
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
      { className: sectionClassName, ref: sectionRef },
      React.createElement(
        "div",
        { className: "company-cards" },
        ...[...Array(6)].map((_, i) => skeletonCard(i))
      ),
      React.createElement(
        "div",
        { className: "company-table-scroll" },
        React.createElement(
          "table",
          { className: "company-table" },
          React.createElement(
            "thead",
            null,
            React.createElement(
              "tr",
              null,
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
      { className: sectionClassName, ref: sectionRef },
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
      { className: sectionClassName, ref: sectionRef },
      React.createElement(FollowedOnlyEmptyState, { entity: "companies" }),
      ...columnsModalLayer,
      React.createElement("style", {
        dangerouslySetInnerHTML: { __html: style },
      })
    );
  }

  return React.createElement(
    "div",
    { className: sectionClassName, ref: sectionRef },
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
            "VC-backed companies: "
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
    ...columnsModalLayer,
    !readOnlyGuestMode &&
      selectedCompanyIds.size > 0 &&
      React.createElement(BulkPortfolioActionToolbar, {
        entityType: "company",
        entityIds: Array.from(selectedCompanyIds),
        onClearSelection,
      }),
    React.createElement(
      "div",
      { className: "company-cards" },
      sortedCompanies.map((company, index) =>
        React.createElement(CompanyCard, {
          key: company.id || index,
          company: company,
          index: index,
          readOnlyGuestMode,
          sectorMaps,
          onGuestConversionClick: openSalesConversion,
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
              !readOnlyGuestMode
                ? React.createElement("input", {
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
                : null
            ),
            ...selectedColumns.map((column) => {
              const sortKind = getColumnSortKind(column.key);
              const isActive = sortState?.key === column.key;
              const isDraggable =
                !readOnlyGuestMode && !isFrozenColumnKey(column.key);
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
    React.createElement(McpGuestSalesConversionModal, {
      open: showSalesConversion,
      onClose: () => setShowSalesConversion(false),
    }),
    React.createElement("style", {
      dangerouslySetInnerHTML: { __html: style },
    })
  );
};


export type CompanySectionProps = React.ComponentProps<typeof CompanySection>;
