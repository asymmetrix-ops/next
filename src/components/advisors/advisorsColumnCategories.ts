export type AdvisorColumnType =
  | "text"
  | "paragraph"
  | "number"
  | "follow";

export interface AdvisorColumnMeta {
  id: string;
  columnKey: string;
  label: string;
  type: AdvisorColumnType;
  locked?: boolean;
  defaultVisible: boolean;
}

export interface AdvisorColumnCategory {
  id: string;
  name: string;
  columns: AdvisorColumnMeta[];
}

export const ADVISORS_COLUMN_CATEGORIES: AdvisorColumnCategory[] = [
  {
    id: "identity",
    name: "Identity",
    columns: [
      {
        id: "name",
        columnKey: "name",
        label: "Advisor",
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
        id: "events_advised",
        columnKey: "events_advised",
        label: "# Corporate Events Advised",
        type: "number",
        defaultVisible: true,
      },
      {
        id: "sectors",
        columnKey: "sectors",
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

export const ALL_ADVISORS_COLUMN_META = ADVISORS_COLUMN_CATEGORIES.flatMap(
  (category) => category.columns
);

export const CANONICAL_ADVISOR_COLUMN_KEYS = ALL_ADVISORS_COLUMN_META.map(
  (column) => column.columnKey
);

export const PROD_DEFAULT_ADVISOR_COLUMN_KEYS = [
  "name",
  "description",
  "events_advised",
  "sectors",
  "linkedin_members",
  "country",
] as const;

export const FROZEN_ADVISOR_COLUMN_KEYS = ["name"] as const;

export const DEFAULT_VISIBLE_ADVISOR_COLUMN_KEYS: string[] = [
  ...PROD_DEFAULT_ADVISOR_COLUMN_KEYS,
];

export function getEffectiveFrozenAdvisorColumnKeys(
  filterPinnedKeys: string[] = []
): string[] {
  const seen = new Set<string>(FROZEN_ADVISOR_COLUMN_KEYS);
  const ordered: string[] = [...FROZEN_ADVISOR_COLUMN_KEYS];
  for (const key of filterPinnedKeys) {
    if (CANONICAL_ADVISOR_COLUMN_KEYS.includes(key) && !seen.has(key)) {
      seen.add(key);
      ordered.push(key);
    }
  }
  return ordered;
}

export function enforceAdvisorColumnKeyOrder(
  keys: string[],
  filterPinnedKeys: string[] = []
): string[] {
  const normalizedKeys = keys.filter((key) => key !== "logo");
  const frozenKeys = getEffectiveFrozenAdvisorColumnKeys(filterPinnedKeys);
  const frozenSet = new Set(frozenKeys);
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const key of frozenKeys) {
    if (CANONICAL_ADVISOR_COLUMN_KEYS.includes(key) && !seen.has(key)) {
      seen.add(key);
      ordered.push(key);
    }
  }

  for (const key of normalizedKeys) {
    if (
      CANONICAL_ADVISOR_COLUMN_KEYS.includes(key) &&
      !seen.has(key) &&
      !frozenSet.has(key)
    ) {
      seen.add(key);
      ordered.push(key);
    }
  }

  return ordered.length > 0 ? ordered : [...PROD_DEFAULT_ADVISOR_COLUMN_KEYS];
}

export const advisorColumnKeysToVisibility = (
  keys: string[]
): Record<string, boolean> => {
  const visibleKeys = new Set(keys);
  const out: Record<string, boolean> = {};
  for (const column of ALL_ADVISORS_COLUMN_META) {
    out[column.id] = column.locked ? true : visibleKeys.has(column.columnKey);
  }
  return out;
};

export const advisorVisibilityToColumnKeys = (
  visible: Record<string, boolean>,
  previousOrder: string[] = []
): string[] => {
  const visibleKeys = new Set(
    ALL_ADVISORS_COLUMN_META.filter((column) => visible[column.id]).map(
      (column) => column.columnKey
    )
  );

  const ordered: string[] = [];
  previousOrder.forEach((key) => {
    if (visibleKeys.has(key) && !ordered.includes(key)) {
      ordered.push(key);
    }
  });

  CANONICAL_ADVISOR_COLUMN_KEYS.forEach((key) => {
    if (visibleKeys.has(key) && !ordered.includes(key)) {
      ordered.push(key);
    }
  });

  const base =
    ordered.length > 0 ? ordered : [...PROD_DEFAULT_ADVISOR_COLUMN_KEYS];
  return enforceAdvisorColumnKeyOrder(base);
};

export function reorderAdvisorColumnKeys(
  keys: string[],
  dragKey: string,
  dropKey: string,
  filterPinnedKeys: string[] = []
): string[] {
  const frozenKeys = getEffectiveFrozenAdvisorColumnKeys(filterPinnedKeys);
  const frozenSet = new Set(frozenKeys);
  const ordered = enforceAdvisorColumnKeyOrder(keys, filterPinnedKeys);
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
  return enforceAdvisorColumnKeyOrder(next, filterPinnedKeys);
}
