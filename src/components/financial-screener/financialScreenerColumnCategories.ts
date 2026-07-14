export type FinancialScreenerColumnType =
  | "text"
  | "paragraph"
  | "url"
  | "number"
  | "currency"
  | "percent"
  | "multiple"
  | "company"
  | "logo";

export interface FinancialScreenerColumnMeta {
  id: string;
  columnKey: string;
  label: string;
  type: FinancialScreenerColumnType;
  locked?: boolean;
  defaultVisible: boolean;
}

export interface FinancialScreenerColumnCategory {
  id: string;
  name: string;
  description?: string;
  columns: FinancialScreenerColumnMeta[];
}

export const FINANCIAL_SCREENER_COLUMN_CATEGORIES: FinancialScreenerColumnCategory[] =
  [
    {
      id: "identity",
      name: "Identity",
      columns: [
        {
          id: "company",
          columnKey: "company",
          label: "Company",
          type: "company",
          locked: true,
          defaultVisible: true,
        },
        {
          id: "description",
          columnKey: "description",
          label: "Description",
          type: "paragraph",
          defaultVisible: false,
        },
        {
          id: "url",
          columnKey: "url",
          label: "Website",
          type: "url",
          defaultVisible: false,
        },
      ],
    },
    {
      id: "firmographics",
      name: "Firmographics",
      columns: [
        {
          id: "sector",
          columnKey: "sector",
          label: "Sector",
          type: "text",
          defaultVisible: true,
        },
        {
          id: "sub_sector",
          columnKey: "sub_sector",
          label: "Sub sector",
          type: "text",
          defaultVisible: false,
        },
        {
          id: "ownership",
          columnKey: "ownership",
          label: "Ownership",
          type: "text",
          defaultVisible: true,
        },
        {
          id: "fte",
          columnKey: "fte",
          label: "FTE",
          type: "number",
          defaultVisible: true,
        },
        {
          id: "hq",
          columnKey: "hq",
          label: "HQ",
          type: "text",
          defaultVisible: false,
        },
        {
          id: "financial_year",
          columnKey: "financial_year",
          label: "Financial Year",
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
          id: "revenue",
          columnKey: "revenue",
          label: "Revenue",
          type: "currency",
          defaultVisible: true,
        },
        {
          id: "revenue_growth",
          columnKey: "revenue_growth",
          label: "Rev growth",
          type: "percent",
          defaultVisible: true,
        },
        {
          id: "ebitda",
          columnKey: "ebitda",
          label: "EBITDA",
          type: "currency",
          defaultVisible: true,
        },
        {
          id: "ebitda_margin",
          columnKey: "ebitda_margin",
          label: "EBITDA margin",
          type: "percent",
          defaultVisible: true,
        },
        {
          id: "ebit",
          columnKey: "ebit",
          label: "EBIT",
          type: "currency",
          defaultVisible: true,
        },
        {
          id: "ev",
          columnKey: "ev",
          label: "EV",
          type: "currency",
          defaultVisible: true,
        },
        {
          id: "ev_revenue",
          columnKey: "ev_revenue",
          label: "EV / Revenue",
          type: "multiple",
          defaultVisible: true,
        },
        {
          id: "ev_ebit",
          columnKey: "ev_ebit",
          label: "EV / EBIT",
          type: "multiple",
          defaultVisible: true,
        },
        {
          id: "ev_ebitda",
          columnKey: "ev_ebitda",
          label: "EV / EBITDA",
          type: "multiple",
          defaultVisible: true,
        },
        {
          id: "rev_multiple",
          columnKey: "rev_multiple",
          label: "Rev multiple",
          type: "multiple",
          defaultVisible: true,
        },
      ],
    },
  ];

export const ALL_FINANCIAL_SCREENER_COLUMN_META =
  FINANCIAL_SCREENER_COLUMN_CATEGORIES.flatMap((category) => category.columns);

export const CANONICAL_FINANCIAL_SCREENER_COLUMN_KEYS =
  ALL_FINANCIAL_SCREENER_COLUMN_META.map((column) => column.columnKey);

export const PROD_DEFAULT_FINANCIAL_SCREENER_COLUMN_KEYS = [
  "company",
  "sector",
  "ownership",
  "fte",
  "revenue",
  "revenue_growth",
  "ebitda",
  "ebitda_margin",
  "ebit",
  "ev",
  "ev_revenue",
  "ev_ebit",
  "ev_ebitda",
  "rev_multiple",
] as const;

export const FROZEN_FINANCIAL_SCREENER_COLUMN_KEYS = ["company"] as const;

export const DEFAULT_VISIBLE_FINANCIAL_SCREENER_COLUMN_KEYS: string[] = [
  ...PROD_DEFAULT_FINANCIAL_SCREENER_COLUMN_KEYS,
];

const META_BY_KEY = new Map(
  ALL_FINANCIAL_SCREENER_COLUMN_META.map((column) => [column.columnKey, column])
);

export function columnKeysToVisibility(
  keys: string[]
): Record<string, boolean> {
  const visibleSet = new Set(keys);
  const result: Record<string, boolean> = {};
  for (const column of ALL_FINANCIAL_SCREENER_COLUMN_META) {
    result[column.id] =
      column.locked === true || visibleSet.has(column.columnKey);
  }
  return result;
}

export function visibilityToColumnKeys(
  visible: Record<string, boolean>
): string[] {
  const keys: string[] = [];
  for (const column of ALL_FINANCIAL_SCREENER_COLUMN_META) {
    if (column.locked || visible[column.id]) {
      keys.push(column.columnKey);
    }
  }
  return enforceColumnKeyOrder(keys);
}

export function enforceColumnKeyOrder(keys: string[]): string[] {
  const keySet = new Set(keys);
  const ordered: string[] = [];
  for (const key of CANONICAL_FINANCIAL_SCREENER_COLUMN_KEYS) {
    if (keySet.has(key)) ordered.push(key);
  }
  return ordered;
}

export function reorderColumnKeys(
  keys: string[],
  dragKey: string,
  dropKey: string
): string[] {
  if (dragKey === dropKey) return keys;
  const fromIndex = keys.indexOf(dragKey);
  const toIndex = keys.indexOf(dropKey);
  if (fromIndex < 0 || toIndex < 0) return keys;
  const next = [...keys];
  const [item] = next.splice(fromIndex, 1);
  const insertAt = fromIndex < toIndex ? toIndex - 1 : toIndex;
  next.splice(insertAt, 0, item);
  return next;
}

export function getEffectiveFrozenColumnKeys(
  filterPinnedColumnKeys: string[]
): string[] {
  const frozen: string[] = [...FROZEN_FINANCIAL_SCREENER_COLUMN_KEYS];
  for (const key of filterPinnedColumnKeys) {
    if (!frozen.includes(key)) frozen.push(key);
  }
  return frozen;
}

export function getColumnMeta(columnKey: string): FinancialScreenerColumnMeta | undefined {
  return META_BY_KEY.get(columnKey);
}
