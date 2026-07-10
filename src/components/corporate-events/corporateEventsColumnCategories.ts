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
          id: "target_hq",
          columnKey: "target_hq",
          label: "Target HQ",
          type: "text",
          defaultVisible: false,
        },
        {
          id: "parties",
          columnKey: "parties",
          label: "Parties",
          type: "paragraph",
          defaultVisible: true,
        },
        {
          id: "deal_type",
          columnKey: "deal_type",
          label: "Deal Type",
          type: "text",
          defaultVisible: true,
        },
        {
          id: "funding_stage",
          columnKey: "funding_stage",
          label: "Funding Stage",
          type: "text",
          defaultVisible: false,
        },
        {
          id: "investment_amount",
          columnKey: "investment_amount",
          label: "Amount (m)",
          type: "number",
          defaultVisible: true,
        },
        {
          id: "enterprise_value",
          columnKey: "enterprise_value",
          label: "EV (m)",
          type: "number",
          defaultVisible: false,
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
        {
          id: "secondary_sectors",
          columnKey: "secondary_sectors",
          label: "Secondary Sectors",
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

export const PROD_DEFAULT_CORPORATE_EVENT_COLUMN_KEYS = [
  "description",
  "announcement_date",
  "target",
  "parties",
  "deal_type",
  "investment_amount",
  "advisors",
  "primary_sectors",
  "secondary_sectors",
] as const;

export const FROZEN_CORPORATE_EVENT_COLUMN_KEYS = ["description"] as const;

export const DEFAULT_VISIBLE_CORPORATE_EVENT_COLUMN_KEYS: string[] = [
  ...PROD_DEFAULT_CORPORATE_EVENT_COLUMN_KEYS,
];

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
  const seedKeys =
    keys.length > 0 ? keys : [...PROD_DEFAULT_CORPORATE_EVENT_COLUMN_KEYS];
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

  for (const key of seedKeys) {
    if (
      CANONICAL_CORPORATE_EVENT_COLUMN_KEYS.includes(key) &&
      !seen.has(key) &&
      !frozenSet.has(key)
    ) {
      seen.add(key);
      ordered.push(key);
    }
  }

  const hasUnfrozenColumn = ordered.some((key) => !frozenSet.has(key));
  if (!hasUnfrozenColumn) {
    return enforceCorporateEventColumnKeyOrder(
      [...PROD_DEFAULT_CORPORATE_EVENT_COLUMN_KEYS],
      filterPinnedKeys
    );
  }

  return ordered;
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
