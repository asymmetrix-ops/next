export type InvestorColumnType =
  | "text"
  | "paragraph"
  | "url"
  | "number"
  | "date"
  | "follow";

export interface InvestorColumnMeta {
  id: string;
  columnKey: string;
  label: string;
  type: InvestorColumnType;
  locked?: boolean;
  defaultVisible: boolean;
  badge?: string;
}

export interface InvestorColumnCategory {
  id: string;
  name: string;
  description?: string;
  columns: InvestorColumnMeta[];
}

export const INVESTORS_COLUMN_CATEGORIES: InvestorColumnCategory[] = [
  {
    id: "identity",
    name: "Identity",
    columns: [
      {
        id: "name",
        columnKey: "name",
        label: "Name",
        type: "text",
        locked: true,
        defaultVisible: true,
      },
    ],
  },
  {
    id: "lists",
    name: "Lists",
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
        id: "type",
        columnKey: "type",
        label: "Type",
        type: "text",
        defaultVisible: true,
      },
      {
        id: "description",
        columnKey: "description",
        label: "Description",
        type: "paragraph",
        defaultVisible: true,
      },
      {
        id: "portfolio_companies",
        columnKey: "portfolio_companies",
        label: "Current D&A Portfolio Companies",
        type: "number",
        defaultVisible: true,
      },
      {
        id: "primary_sectors",
        columnKey: "primary_sectors",
        label: "D&A Primary Sectors",
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
        id: "country",
        columnKey: "country",
        label: "Country",
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
        id: "hq",
        columnKey: "hq",
        label: "HQ",
        type: "text",
        defaultVisible: false,
      },
      {
        id: "website",
        columnKey: "website",
        label: "Website",
        type: "url",
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
        id: "year_founded",
        columnKey: "year_founded",
        label: "Year Founded",
        type: "date",
        defaultVisible: false,
      },
      {
        id: "total_investments",
        columnKey: "total_investments",
        label: "Total Investments",
        type: "number",
        defaultVisible: false,
      },
      {
        id: "years_since_last_investment",
        columnKey: "years_since_last_investment",
        label: "Time since last investment",
        type: "text",
        defaultVisible: false,
      },
      {
        id: "sub_region",
        columnKey: "sub_region",
        label: "Sub-Region",
        type: "text",
        defaultVisible: false,
      },
      {
        id: "state",
        columnKey: "state",
        label: "State/Province",
        type: "text",
        defaultVisible: false,
      },
      {
        id: "city",
        columnKey: "city",
        label: "City",
        type: "text",
        defaultVisible: false,
      },
    ],
  },
];

/** Reference all-columns export layout (Directory + Investors sheets). */
export const INVESTORS_EXPORT_CATEGORIES: InvestorColumnCategory[] = [
  {
    id: "identity",
    name: "Identity",
    columns: [
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
    id: "overview",
    name: "Overview",
    columns: [
      {
        id: "description",
        columnKey: "description",
        label: "Description",
        type: "paragraph",
        defaultVisible: true,
      },
      {
        id: "events_advised",
        columnKey: "events_advised",
        label: "# Corporate Events Advised",
        type: "number",
        defaultVisible: true,
      },
      {
        id: "primary_sectors",
        columnKey: "primary_sectors",
        label: "Advised D&A Sectors",
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
        id: "country",
        columnKey: "country",
        label: "Country",
        type: "text",
        defaultVisible: true,
      },
    ],
  },
];

export const ALL_INVESTORS_COLUMN_META = INVESTORS_COLUMN_CATEGORIES.flatMap(
  (category) => category.columns
);

export const CANONICAL_INVESTOR_COLUMN_KEYS = ALL_INVESTORS_COLUMN_META.map(
  (column) => column.columnKey
);

export const PROD_DEFAULT_INVESTOR_COLUMN_KEYS = [
  "name",
  "type",
  "description",
  "portfolio_companies",
  "primary_sectors",
  "linkedin_members",
  "country",
] as const;

export const FROZEN_INVESTOR_COLUMN_KEYS = ["name"] as const;

export const DEFAULT_VISIBLE_INVESTOR_COLUMN_KEYS: string[] = [
  ...PROD_DEFAULT_INVESTOR_COLUMN_KEYS,
];

export function getEffectiveFrozenInvestorColumnKeys(
  filterPinnedKeys: string[] = []
): string[] {
  const seen = new Set<string>(FROZEN_INVESTOR_COLUMN_KEYS);
  const ordered: string[] = [...FROZEN_INVESTOR_COLUMN_KEYS];
  for (const key of filterPinnedKeys) {
    if (CANONICAL_INVESTOR_COLUMN_KEYS.includes(key) && !seen.has(key)) {
      seen.add(key);
      ordered.push(key);
    }
  }
  return ordered;
}

export function enforceInvestorColumnKeyOrder(
  keys: string[],
  filterPinnedKeys: string[] = []
): string[] {
  const normalizedKeys = keys.filter((key) => key !== "logo");
  const frozenKeys = getEffectiveFrozenInvestorColumnKeys(filterPinnedKeys);
  const frozenSet = new Set(frozenKeys);
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const key of frozenKeys) {
    if (CANONICAL_INVESTOR_COLUMN_KEYS.includes(key) && !seen.has(key)) {
      seen.add(key);
      ordered.push(key);
    }
  }

  for (const key of normalizedKeys) {
    if (
      CANONICAL_INVESTOR_COLUMN_KEYS.includes(key) &&
      !seen.has(key) &&
      !frozenSet.has(key)
    ) {
      seen.add(key);
      ordered.push(key);
    }
  }

  return ordered.length > 0 ? ordered : [...PROD_DEFAULT_INVESTOR_COLUMN_KEYS];
}

export const investorColumnKeysToVisibility = (
  keys: string[]
): Record<string, boolean> => {
  const visibleKeys = new Set(keys);
  const out: Record<string, boolean> = {};
  for (const column of ALL_INVESTORS_COLUMN_META) {
    out[column.id] = column.locked
      ? true
      : visibleKeys.has(column.columnKey);
  }
  return out;
};

export const investorVisibilityToColumnKeys = (
  visible: Record<string, boolean>,
  previousOrder: string[] = []
): string[] => {
  const visibleKeys = new Set(
    ALL_INVESTORS_COLUMN_META.filter((column) => visible[column.id]).map(
      (column) => column.columnKey
    )
  );

  const ordered: string[] = [];
  previousOrder.forEach((key) => {
    if (visibleKeys.has(key) && !ordered.includes(key)) {
      ordered.push(key);
    }
  });

  CANONICAL_INVESTOR_COLUMN_KEYS.forEach((key) => {
    if (visibleKeys.has(key) && !ordered.includes(key)) {
      ordered.push(key);
    }
  });

  const base =
    ordered.length > 0 ? ordered : [...PROD_DEFAULT_INVESTOR_COLUMN_KEYS];
  return enforceInvestorColumnKeyOrder(base);
};

export function reorderInvestorColumnKeys(
  keys: string[],
  dragKey: string,
  dropKey: string,
  filterPinnedKeys: string[] = []
): string[] {
  const frozenKeys = getEffectiveFrozenInvestorColumnKeys(filterPinnedKeys);
  const frozenSet = new Set(frozenKeys);
  const ordered = enforceInvestorColumnKeyOrder(keys, filterPinnedKeys);
  if (dragKey === dropKey) return ordered;
  if (frozenSet.has(dragKey)) return ordered;

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
  return enforceInvestorColumnKeyOrder(next, filterPinnedKeys);
}
