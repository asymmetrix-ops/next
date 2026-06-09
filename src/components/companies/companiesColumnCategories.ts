export type CompanyColumnType =
  | "text"
  | "paragraph"
  | "url"
  | "number"
  | "currency"
  | "percent"
  | "date"
  | "logo"
  | "follow";

export interface CompanyColumnMeta {
  /** Modal / persistence id */
  id: string;
  /** Table column key used in Companies Search */
  columnKey: string;
  label: string;
  type: CompanyColumnType;
  locked?: boolean;
  defaultVisible: boolean;
  badge?: string;
}

export interface CompanyColumnCategory {
  id: string;
  name: string;
  description?: string;
  columns: CompanyColumnMeta[];
}

export const COMPANIES_COLUMN_CATEGORIES: CompanyColumnCategory[] = [
  {
    id: "identity",
    name: "Identity",
    columns: [
      {
        id: "logo",
        columnKey: "logo",
        label: "Logo",
        type: "logo",
        locked: true,
        defaultVisible: true,
      },
      {
        id: "name",
        columnKey: "name",
        label: "Name",
        type: "text",
        locked: true,
        defaultVisible: true,
      },
      {
        id: "website",
        columnKey: "website",
        label: "Website",
        type: "url",
        defaultVisible: false,
      },
    ],
  },
  {
    id: "lists",
    name: "Lists",
    description: "Track companies you follow across one or more lists.",
    columns: [
      {
        id: "follow",
        columnKey: "follow",
        label: "My Portfolio",
        type: "follow",
        defaultVisible: false,
        badge: "New",
      },
    ],
  },
  {
    id: "default",
    name: "Default",
    columns: [
      {
        id: "description",
        columnKey: "description",
        label: "Description",
        type: "paragraph",
        defaultVisible: true,
      },
      {
        id: "primary_sectors",
        columnKey: "primary_sectors",
        label: "Primary Sector(s)",
        type: "text",
        defaultVisible: true,
      },
      {
        id: "sectors",
        columnKey: "secondary_sectors",
        label: "Secondary Sector(s)",
        type: "text",
        defaultVisible: true,
      },
      {
        id: "ownership",
        columnKey: "ownership",
        label: "Ownership",
        type: "text",
        defaultVisible: true,
      },
      {
        id: "linkedin_members",
        columnKey: "linkedin_members",
        label: "LinkedIn Members",
        type: "number",
        defaultVisible: true,
      },
      {
        id: "hq",
        columnKey: "hq",
        label: "HQ",
        type: "text",
        defaultVisible: true,
      },
    ],
  },
  {
    id: "overview",
    name: "Overview",
    columns: [
      {
        id: "year_founded",
        columnKey: "year_founded",
        label: "Year Founded",
        type: "date",
        defaultVisible: false,
      },
      {
        id: "city",
        columnKey: "city",
        label: "City",
        type: "text",
        defaultVisible: false,
      },
      {
        id: "state",
        columnKey: "state",
        label: "State",
        type: "text",
        defaultVisible: false,
      },
      {
        id: "linkedin_url",
        columnKey: "linkedin_url",
        label: "LinkedIn URL",
        type: "url",
        defaultVisible: false,
      },
      {
        id: "linkedin_growth",
        columnKey: "linkedin_growth",
        label: "LinkedIn Growth",
        type: "percent",
        defaultVisible: false,
      },
      {
        id: "investors",
        columnKey: "investors",
        label: "Investors",
        type: "text",
        defaultVisible: false,
      },
      {
        id: "years_since",
        columnKey: "years_since_last_investment",
        label: "Years Since Last Investment",
        type: "number",
        defaultVisible: false,
      },
      {
        id: "lifecycle",
        columnKey: "lifecycle_stage",
        label: "Lifecycle Stage",
        type: "text",
        defaultVisible: false,
      },
      {
        id: "product_type",
        columnKey: "product_type",
        label: "Product Type",
        type: "text",
        defaultVisible: false,
      },
      {
        id: "data_collection",
        columnKey: "data_collection_method",
        label: "Data Collection Method",
        type: "text",
        defaultVisible: false,
      },
      {
        id: "revenue_model",
        columnKey: "revenue_model",
        label: "Revenue Model",
        type: "text",
        defaultVisible: false,
      },
      {
        id: "transaction_status",
        columnKey: "transaction_status",
        label: "Transaction Status",
        type: "text",
        defaultVisible: false,
      },
    ],
  },
  {
    id: "financial",
    name: "Financial metrics",
    columns: [
      {
        id: "revenue_m",
        columnKey: "revenue_m",
        label: "Revenue (m)",
        type: "currency",
        defaultVisible: false,
      },
      {
        id: "ebitda_m",
        columnKey: "ebitda_m",
        label: "EBITDA (m)",
        type: "currency",
        defaultVisible: false,
      },
      {
        id: "enterprise_value",
        columnKey: "enterprise_value",
        label: "Enterprise Value (m)",
        type: "currency",
        defaultVisible: false,
      },
      {
        id: "revenue_multiple",
        columnKey: "revenue_multiple",
        label: "Revenue Multiple",
        type: "number",
        defaultVisible: false,
      },
      {
        id: "revenue_growth",
        columnKey: "revenue_growth",
        label: "Revenue Growth",
        type: "percent",
        defaultVisible: false,
      },
      {
        id: "ebitda_margin",
        columnKey: "ebitda_margin",
        label: "EBITDA Margin",
        type: "percent",
        defaultVisible: false,
      },
      {
        id: "rule_of_40",
        columnKey: "rule_of_40",
        label: "Rule of 40",
        type: "number",
        defaultVisible: false,
      },
    ],
  },
  {
    id: "subscription",
    name: "Subscription metrics",
    columns: [
      {
        id: "recurring_revenue",
        columnKey: "arr_pc",
        label: "Recurring Revenue",
        type: "currency",
        defaultVisible: false,
      },
      {
        id: "arr",
        columnKey: "arr_m",
        label: "ARR (m)",
        type: "currency",
        defaultVisible: false,
      },
      {
        id: "churn",
        columnKey: "churn_pc",
        label: "Churn",
        type: "percent",
        defaultVisible: false,
      },
      {
        id: "grr",
        columnKey: "grr_pc",
        label: "GRR",
        type: "percent",
        defaultVisible: false,
      },
      {
        id: "nrr",
        columnKey: "nrr",
        label: "NRR",
        type: "percent",
        defaultVisible: false,
      },
      {
        id: "new_clients_rev",
        columnKey: "new_client_growth_pc",
        label: "New Clients Revenue Growth",
        type: "percent",
        defaultVisible: false,
      },
      {
        id: "upsell",
        columnKey: "upsell_pc",
        label: "Upsell",
        type: "percent",
        defaultVisible: false,
      },
      {
        id: "cross_sell",
        columnKey: "cross_sell_pc",
        label: "Cross-sell",
        type: "percent",
        defaultVisible: false,
      },
      {
        id: "price_increase",
        columnKey: "price_increase_pc",
        label: "Price Increase",
        type: "percent",
        defaultVisible: false,
      },
      {
        id: "revenue_expansion",
        columnKey: "rev_expansion_pc",
        label: "Revenue Expansion",
        type: "percent",
        defaultVisible: false,
      },
    ],
  },
  {
    id: "other",
    name: "Other metrics",
    columns: [
      {
        id: "ebit",
        columnKey: "ebit_m",
        label: "EBIT (m)",
        type: "currency",
        defaultVisible: false,
      },
      {
        id: "num_clients",
        columnKey: "no_of_clients",
        label: "Number of Clients",
        type: "number",
        defaultVisible: false,
      },
      {
        id: "rev_per_client",
        columnKey: "rev_per_client",
        label: "Revenue per Client",
        type: "currency",
        defaultVisible: false,
      },
      {
        id: "num_employees",
        columnKey: "no_employees",
        label: "Number of Employees",
        type: "number",
        defaultVisible: false,
      },
      {
        id: "rev_per_employee",
        columnKey: "rev_per_employee",
        label: "Revenue per Employee",
        type: "currency",
        defaultVisible: false,
      },
      {
        id: "financial_year",
        columnKey: "financial_year",
        label: "Financial Year",
        type: "date",
        defaultVisible: false,
      },
    ],
  },
];

export const ALL_COMPANIES_COLUMN_META = COMPANIES_COLUMN_CATEGORIES.flatMap(
  (category) => category.columns
);

export const CANONICAL_COMPANY_COLUMN_KEYS = ALL_COMPANIES_COLUMN_META.map(
  (column) => column.columnKey
);

/** Current PROD default visible columns (reset in customise modal). */
export const PROD_DEFAULT_COMPANY_COLUMN_KEYS = [
  "logo",
  "name",
  "description",
  "primary_sectors",
  "secondary_sectors",
  "ownership",
  "linkedin_members",
  "hq",
] as const;

/** Always visible, frozen in table — first columns, not hideable. */
export const FROZEN_COLUMN_KEYS = ["logo", "name"] as const;

export const DEFAULT_VISIBLE_COMPANY_COLUMN_KEYS: string[] = [
  ...PROD_DEFAULT_COMPANY_COLUMN_KEYS,
];

export function getEffectiveFrozenColumnKeys(
  filterPinnedKeys: string[] = []
): string[] {
  const seen = new Set<string>(FROZEN_COLUMN_KEYS);
  const ordered: string[] = [...FROZEN_COLUMN_KEYS];
  for (const key of filterPinnedKeys) {
    if (CANONICAL_COMPANY_COLUMN_KEYS.includes(key) && !seen.has(key)) {
      seen.add(key);
      ordered.push(key);
    }
  }
  return ordered;
}

export function enforceColumnKeyOrder(
  keys: string[],
  filterPinnedKeys: string[] = []
): string[] {
  const frozenKeys = getEffectiveFrozenColumnKeys(filterPinnedKeys);
  const frozenSet = new Set(frozenKeys);
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const key of frozenKeys) {
    if (CANONICAL_COMPANY_COLUMN_KEYS.includes(key) && !seen.has(key)) {
      seen.add(key);
      ordered.push(key);
    }
  }

  for (const key of keys) {
    if (
      CANONICAL_COMPANY_COLUMN_KEYS.includes(key) &&
      !seen.has(key) &&
      !frozenSet.has(key)
    ) {
      seen.add(key);
      ordered.push(key);
    }
  }

  return ordered.length > 0 ? ordered : [...PROD_DEFAULT_COMPANY_COLUMN_KEYS];
}

export const columnKeysToVisibility = (
  keys: string[]
): Record<string, boolean> => {
  const visibleKeys = new Set(keys);
  const out: Record<string, boolean> = {};
  for (const column of ALL_COMPANIES_COLUMN_META) {
    out[column.id] = column.locked
      ? true
      : visibleKeys.has(column.columnKey);
  }
  return out;
};

export const visibilityToColumnKeys = (
  visible: Record<string, boolean>,
  previousOrder: string[] = []
): string[] => {
  const visibleKeys = new Set(
    ALL_COMPANIES_COLUMN_META.filter((column) => visible[column.id]).map(
      (column) => column.columnKey
    )
  );

  const ordered: string[] = [];
  previousOrder.forEach((key) => {
    if (visibleKeys.has(key) && !ordered.includes(key)) {
      ordered.push(key);
    }
  });

  CANONICAL_COMPANY_COLUMN_KEYS.forEach((key) => {
    if (visibleKeys.has(key) && !ordered.includes(key)) {
      ordered.push(key);
    }
  });

  const base =
    ordered.length > 0 ? ordered : [...PROD_DEFAULT_COMPANY_COLUMN_KEYS];
  return enforceColumnKeyOrder(base);
};

/** Move one column before another; logo/name and filter-pinned columns cannot be dragged. */
export function reorderColumnKeys(
  keys: string[],
  dragKey: string,
  dropKey: string,
  filterPinnedKeys: string[] = []
): string[] {
  const frozenKeys = getEffectiveFrozenColumnKeys(filterPinnedKeys);
  const frozenSet = new Set(frozenKeys);
  const ordered = enforceColumnKeyOrder(keys, filterPinnedKeys);
  if (dragKey === dropKey) return ordered;
  if (frozenSet.has(dragKey)) {
    return ordered;
  }

  const fromIndex = ordered.indexOf(dragKey);
  if (fromIndex < 0) return ordered;

  let toIndex = ordered.indexOf(dropKey);
  if (toIndex < 0) return ordered;

  if (frozenSet.has(dropKey)) {
    toIndex = frozenKeys.reduce((max, frozenKey) => {
      const idx = ordered.indexOf(frozenKey);
      return idx >= 0 ? Math.max(max, idx) : max;
    }, -1);
    if (toIndex < 0) toIndex = 0;
    else toIndex += 1;
  }

  const next = [...ordered];
  const [item] = next.splice(fromIndex, 1);
  const insertAt = fromIndex < toIndex ? toIndex - 1 : toIndex;
  next.splice(insertAt, 0, item);
  return enforceColumnKeyOrder(next, filterPinnedKeys);
}
