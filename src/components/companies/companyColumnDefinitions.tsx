"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ALL_COMPANIES_COLUMN_META } from "./companiesColumnCategories";
import { getFieldAliasesForColumn, LIST_JSON_COLUMN_KEYS } from "./companiesColumnFields";
import { formatCompanyColumnDisplay } from "@/lib/companyTableData";
import { formatWebsiteLabel, normalizeWebsiteUrl } from "@/lib/websiteUrl";
import { normalizeLinkedInProfileUrl } from "@/lib/linkedinUrl";
import { InlineFollowButton } from "@/components/InlineFollowButton";

export type CompanyRow = {
  id: number;
  name: string;
  description?: string;
  primary_sectors?: unknown;
  secondary_sectors?: unknown;
  ownership_type_id?: number;
  ownership?: string;
  country?: string;
  linkedin_logo?: string;
  linkedin_members?: number;
  linkedin_members_latest?: number;
  linkedin_members_old?: number;
  [key: string]: unknown;
};

export type CompanyColumnRenderContext = {
  index: number;
  onCompanyClick: (companyId: number) => void;
};

export interface CompanyColumnDefinition {
  key: string;
  label: string;
  group: string;
  wrap?: boolean;
  minWidth?: number;
  render: (
    company: CompanyRow,
    context: CompanyColumnRenderContext
  ) => React.ReactNode;
}

export const COMPANIES_COLUMNS_STORAGE_KEY = "companies-search-column-keys-v1";
export const SECTOR_ALL_COMPANIES_COLUMNS_STORAGE_KEY = "sector-all-companies-column-keys-v1";

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

const readInvestorsFromCompany = (company: CompanyRow): unknown[] => {
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

const readCompanyValue = (company: CompanyRow, aliases: string[]): unknown => {
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
        className={
          isExpanded ? "company-description-full" : "company-description-truncated"
        }
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
      makeTextColumn("subscription_revenue_pc", "Subscription Revenue %", "Subscription Metrics"),
      makeTextColumn("subscription_revenue_m", "Subscription Revenue (m)", "Subscription Metrics"),
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

export const ALL_COMPANY_COLUMNS = COMPANY_COLUMN_GROUPS.flatMap((group) => group.cols);

export const DEFAULT_SECTOR_ALL_COMPANY_COLUMN_KEYS = [
  "logo",
  "name",
  "description",
  "primary_sectors",
  "secondary_sectors",
  "linkedin_members",
  "hq",
] as const;

