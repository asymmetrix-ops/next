export type CorporateEventColumnType =
  | "text"
  | "paragraph"
  | "number"
  | "date";

export interface CorporateEventColumnMeta {
  id: string;
  columnKey: string;
  label: string;
  type: CorporateEventColumnType;
  locked?: boolean;
  defaultVisible: boolean;
}

export interface CorporateEventColumnCategory {
  id: string;
  name: string;
  columns: CorporateEventColumnMeta[];
}

export const CORPORATE_EVENTS_COLUMN_CATEGORIES: CorporateEventColumnCategory[] =
  [
    {
      id: "identity",
      name: "Identity",
      columns: [
        {
          id: "description",
          columnKey: "description",
          label: "Event",
          type: "text",
          locked: true,
          defaultVisible: true,
        },
      ],
    },
    {
      id: "default",
      name: "Default",
      columns: [
        {
          id: "announcement_date",
          columnKey: "announcement_date",
          label: "Date",
          type: "date",
          defaultVisible: true,
        },
        {
          id: "target",
          columnKey: "target",
          label: "Target",
          type: "text",
          defaultVisible: true,
        },
        {
          id: "parties",
          columnKey: "parties",
          label: "Parties",
          type: "paragraph",
          defaultVisible: true,
        },
        {
          id: "details",
          columnKey: "details",
          label: "Details",
          type: "paragraph",
          defaultVisible: true,
        },
        {
          id: "advisors",
          columnKey: "advisors",
          label: "Advisors",
          type: "paragraph",
          defaultVisible: true,
        },
        {
          id: "primary_sectors",
          columnKey: "primary_sectors",
          label: "Primary Sectors",
          type: "paragraph",
          defaultVisible: true,
        },
      ],
    },
  ];

export const ALL_CORPORATE_EVENTS_COLUMN_META =
  CORPORATE_EVENTS_COLUMN_CATEGORIES.flatMap((category) => category.columns);

export const CANONICAL_CORPORATE_EVENT_COLUMN_KEYS =
  ALL_CORPORATE_EVENTS_COLUMN_META.map((column) => column.columnKey);

/** Maps removed column keys from older layouts to the consolidated list keys. */
const LEGACY_COLUMN_KEY_TO_CANONICAL: Record<string, string | null> = {
  target_hq: "target",
  deal_type: "details",
  funding_stage: "details",
  investment_amount: "details",
  enterprise_value: "details",
  secondary_sectors: null,
};

export const PROD_DEFAULT_CORPORATE_EVENT_COLUMN_KEYS = [
  "description",
  "announcement_date",
  "target",
  "parties",
  "details",
  "advisors",
  "primary_sectors",
] as const;

export const FROZEN_CORPORATE_EVENT_COLUMN_KEYS = ["description"] as const;

export const DEFAULT_VISIBLE_CORPORATE_EVENT_COLUMN_KEYS: string[] = [
  ...PROD_DEFAULT_CORPORATE_EVENT_COLUMN_KEYS,
];

export function migrateCorporateEventColumnKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const key of keys) {
    let canonical = key;
    if (!CANONICAL_CORPORATE_EVENT_COLUMN_KEYS.includes(key)) {
      const mapped = LEGACY_COLUMN_KEY_TO_CANONICAL[key];
      if (mapped == null) continue;
      canonical = mapped;
    }
    if (!seen.has(canonical)) {
      seen.add(canonical);
      ordered.push(canonical);
    }
  }

  return enforceCorporateEventColumnKeyOrder(
    ordered.length > 0 ? ordered : [...PROD_DEFAULT_CORPORATE_EVENT_COLUMN_KEYS]
  );
}

export function getEffectiveFrozenCorporateEventColumnKeys(
  filterPinnedKeys: string[] = []
): string[] {
  const seen = new Set<string>(FROZEN_CORPORATE_EVENT_COLUMN_KEYS);
  const ordered: string[] = [...FROZEN_CORPORATE_EVENT_COLUMN_KEYS];
  for (const key of filterPinnedKeys) {
    if (CANONICAL_CORPORATE_EVENT_COLUMN_KEYS.includes(key) && !seen.has(key)) {
      seen.add(key);
      ordered.push(key);
    }
  }
  return ordered;
}

export function enforceCorporateEventColumnKeyOrder(
  keys: string[],
  filterPinnedKeys: string[] = []
): string[] {
  const frozenKeys = getEffectiveFrozenCorporateEventColumnKeys(filterPinnedKeys);
  const frozenSet = new Set(frozenKeys);
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const key of frozenKeys) {
    if (CANONICAL_CORPORATE_EVENT_COLUMN_KEYS.includes(key) && !seen.has(key)) {
      seen.add(key);
      ordered.push(key);
    }
  }

  for (const key of keys) {
    if (
      CANONICAL_CORPORATE_EVENT_COLUMN_KEYS.includes(key) &&
      !seen.has(key) &&
      !frozenSet.has(key)
    ) {
      seen.add(key);
      ordered.push(key);
    }
  }

  return ordered.length > 0
    ? ordered
    : [...PROD_DEFAULT_CORPORATE_EVENT_COLUMN_KEYS];
}

export const corporateEventColumnKeysToVisibility = (
  keys: string[]
): Record<string, boolean> => {
  const visibleKeys = new Set(keys);
  const out: Record<string, boolean> = {};
  for (const column of ALL_CORPORATE_EVENTS_COLUMN_META) {
    out[column.id] = column.locked ? true : visibleKeys.has(column.columnKey);
  }
  return out;
};

export const corporateEventVisibilityToColumnKeys = (
  visible: Record<string, boolean>,
  previousOrder: string[] = []
): string[] => {
  const visibleKeys = new Set(
    ALL_CORPORATE_EVENTS_COLUMN_META.filter((column) => visible[column.id]).map(
      (column) => column.columnKey
    )
  );

  const ordered: string[] = [];
  previousOrder.forEach((key) => {
    if (visibleKeys.has(key) && !ordered.includes(key)) {
      ordered.push(key);
    }
  });

  CANONICAL_CORPORATE_EVENT_COLUMN_KEYS.forEach((key) => {
    if (visibleKeys.has(key) && !ordered.includes(key)) {
      ordered.push(key);
    }
  });

  return ordered;
};

/** Move one column before another; description and filter-pinned columns cannot be dragged. */
export function reorderCorporateEventColumnKeys(
  keys: string[],
  dragKey: string,
  dropKey: string,
  filterPinnedKeys: string[] = []
): string[] {
  const frozenKeys = getEffectiveFrozenCorporateEventColumnKeys(filterPinnedKeys);
  const frozenSet = new Set(frozenKeys);
  const ordered = enforceCorporateEventColumnKeyOrder(keys, filterPinnedKeys);
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
  return enforceCorporateEventColumnKeyOrder(next, filterPinnedKeys);
}
