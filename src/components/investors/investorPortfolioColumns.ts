import type { CompanyColumnCategory } from "@/components/companies/companiesColumnCategories";
import {
  COMPANIES_COLUMN_CATEGORIES,
  PROD_DEFAULT_COMPANY_COLUMN_KEYS,
} from "@/components/companies/companiesColumnCategories";

export const PORTFOLIO_INVESTMENT_STATUS_FILTER_ID = "portfolio_investment_status";

export const PORTFOLIO_FILTER_CATEGORY = {
  id: "portfolio",
  name: "Portfolio",
} as const;

import type { FilterDef } from "@/components/companies/CompaniesFilterBar";

export const PORTFOLIO_INVESTMENT_STATUS_FILTER_DEF: FilterDef = {
  id: PORTFOLIO_INVESTMENT_STATUS_FILTER_ID,
  label: "Investment status",
  fullLabel: "Investment status",
  category: PORTFOLIO_FILTER_CATEGORY.id,
  type: "Aa",
  editor: "segmented",
  options: ["All", "Current", "Past"],
};

export function parseInvestmentStatusFilter(
  value: unknown
): "all" | "current" | "past" {
  if (value === "Current") return "current";
  if (value === "Past") return "past";
  return "all";
}

export function parseInvestmentStatusFromFilterBar(
  filters: Array<{ id: string; value: unknown }>
): "all" | "current" | "past" {
  const item = filters.find((f) => f.id === PORTFOLIO_INVESTMENT_STATUS_FILTER_ID);
  return parseInvestmentStatusFilter(item?.value);
}

export const INVESTMENT_STATUS_COLUMN_KEY = "investment_status";

export const PORTFOLIO_DEFAULT_VISIBLE_COLUMN_KEYS = [
  "name",
  INVESTMENT_STATUS_COLUMN_KEY,
  "description",
  "primary_sectors",
  "secondary_sectors",
  "ownership",
  "linkedin_members",
  "hq",
] as const;

export const PORTFOLIO_INVESTMENT_STATUS_CATEGORY: CompanyColumnCategory = {
  id: "portfolio",
  name: "Portfolio",
  description: "Investor portfolio context — available on Investor Profile Portfolio tab only.",
  columns: [
    {
      id: INVESTMENT_STATUS_COLUMN_KEY,
      columnKey: INVESTMENT_STATUS_COLUMN_KEY,
      label: "Investment status",
      type: "text",
      defaultVisible: true,
    },
  ],
};

export const PORTFOLIO_COLUMN_CATEGORIES: CompanyColumnCategory[] = [
  ...COMPANIES_COLUMN_CATEGORIES.slice(0, 1),
  PORTFOLIO_INVESTMENT_STATUS_CATEGORY,
  ...COMPANIES_COLUMN_CATEGORIES.slice(1),
];

export const PORTFOLIO_TABLE_COLUMN = {
  key: INVESTMENT_STATUS_COLUMN_KEY,
  label: "Investment status",
  group: "Portfolio",
  minWidth: 140,
  render: (company: { investment_status?: unknown }) => {
    const raw = company.investment_status;
    if (raw === "Current" || raw === "Past") return raw;
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    return "—";
  },
};

export const PORTFOLIO_EXTRA_COLUMN_KEYS = [INVESTMENT_STATUS_COLUMN_KEY] as const;

export function isPortfolioOnlyColumnKey(key: string): boolean {
  return key === INVESTMENT_STATUS_COLUMN_KEY;
}

export function getPortfolioDefaultColumnKeys(): readonly string[] {
  return PORTFOLIO_DEFAULT_VISIBLE_COLUMN_KEYS;
}

export function getPortfolioProdDefaultColumnKeys(): readonly string[] {
  return [
    ...PROD_DEFAULT_COMPANY_COLUMN_KEYS.slice(0, 1),
    INVESTMENT_STATUS_COLUMN_KEY,
    ...PROD_DEFAULT_COMPANY_COLUMN_KEYS.slice(1),
  ];
}

export function portfolioVisibilityToColumnKeys(
  visible: Record<string, boolean>,
  categories: CompanyColumnCategory[],
  previousOrder: string[] = []
): string[] {
  const meta = categories.flatMap((category) => category.columns);
  const visibleKeys = new Set(
    meta
      .filter((column) => visible[column.id])
      .map((column) => column.columnKey)
  );

  const ordered: string[] = [];
  previousOrder.forEach((key) => {
    if (visibleKeys.has(key) && !ordered.includes(key)) {
      ordered.push(key);
    }
  });

  for (const column of meta) {
    if (visibleKeys.has(column.columnKey) && !ordered.includes(column.columnKey)) {
      ordered.push(column.columnKey);
    }
  }

  return ordered.length > 0
    ? ordered
    : [...PORTFOLIO_DEFAULT_VISIBLE_COLUMN_KEYS];
}
