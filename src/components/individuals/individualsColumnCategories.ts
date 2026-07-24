export type IndividualColumnType = "text" | "follow";

export interface IndividualColumnMeta {
  id: string;
  columnKey: string;
  label: string;
  type: IndividualColumnType;
  locked?: boolean;
  defaultVisible: boolean;
}

export interface IndividualColumnCategory {
  id: string;
  name: string;
  columns: IndividualColumnMeta[];
}

export const INDIVIDUALS_COLUMN_CATEGORIES: IndividualColumnCategory[] = [
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
      },
    ],
  },
  {
    id: "overview",
    name: "Overview",
    columns: [
      {
        id: "current_company",
        columnKey: "current_company",
        label: "Current Companies",
        type: "text",
        defaultVisible: true,
      },
      {
        id: "current_roles",
        columnKey: "current_roles",
        label: "Current Roles",
        type: "text",
        defaultVisible: true,
      },
      {
        id: "location",
        columnKey: "location",
        label: "Location",
        type: "text",
        defaultVisible: true,
      },
    ],
  },
];

export const ALL_INDIVIDUALS_COLUMN_META = INDIVIDUALS_COLUMN_CATEGORIES.flatMap(
  (category) => category.columns
);

export const CANONICAL_INDIVIDUAL_COLUMN_KEYS = ALL_INDIVIDUALS_COLUMN_META.map(
  (column) => column.columnKey
);

export const PROD_DEFAULT_INDIVIDUAL_COLUMN_KEYS = [
  "name",
  "current_company",
  "current_roles",
  "location",
] as const;

export const FROZEN_INDIVIDUAL_COLUMN_KEYS = ["name"] as const;

export const DEFAULT_VISIBLE_INDIVIDUAL_COLUMN_KEYS: string[] = [
  ...PROD_DEFAULT_INDIVIDUAL_COLUMN_KEYS,
];

export function getEffectiveFrozenIndividualColumnKeys(
  filterPinnedKeys: string[] = []
): string[] {
  const seen = new Set<string>(FROZEN_INDIVIDUAL_COLUMN_KEYS);
  const ordered: string[] = [...FROZEN_INDIVIDUAL_COLUMN_KEYS];
  for (const key of filterPinnedKeys) {
    if (CANONICAL_INDIVIDUAL_COLUMN_KEYS.includes(key) && !seen.has(key)) {
      seen.add(key);
      ordered.push(key);
    }
  }
  return ordered;
}

export function enforceIndividualColumnKeyOrder(
  keys: string[],
  filterPinnedKeys: string[] = []
): string[] {
  const frozenKeys = getEffectiveFrozenIndividualColumnKeys(filterPinnedKeys);
  const frozenSet = new Set(frozenKeys);
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const key of frozenKeys) {
    if (CANONICAL_INDIVIDUAL_COLUMN_KEYS.includes(key) && !seen.has(key)) {
      seen.add(key);
      ordered.push(key);
    }
  }

  for (const key of keys) {
    if (
      CANONICAL_INDIVIDUAL_COLUMN_KEYS.includes(key) &&
      !seen.has(key) &&
      !frozenSet.has(key)
    ) {
      seen.add(key);
      ordered.push(key);
    }
  }

  return ordered.length > 0 ? ordered : [...PROD_DEFAULT_INDIVIDUAL_COLUMN_KEYS];
}

export const individualColumnKeysToVisibility = (
  keys: string[]
): Record<string, boolean> => {
  const visibleKeys = new Set(keys);
  const out: Record<string, boolean> = {};
  for (const column of ALL_INDIVIDUALS_COLUMN_META) {
    out[column.id] = column.locked ? true : visibleKeys.has(column.columnKey);
  }
  return out;
};

export const individualVisibilityToColumnKeys = (
  visible: Record<string, boolean>,
  previousOrder: string[] = []
): string[] => {
  const visibleKeys = new Set(
    ALL_INDIVIDUALS_COLUMN_META.filter((column) => visible[column.id]).map(
      (column) => column.columnKey
    )
  );

  const ordered: string[] = [];
  previousOrder.forEach((key) => {
    if (visibleKeys.has(key) && !ordered.includes(key)) {
      ordered.push(key);
    }
  });

  CANONICAL_INDIVIDUAL_COLUMN_KEYS.forEach((key) => {
    if (visibleKeys.has(key) && !ordered.includes(key)) {
      ordered.push(key);
    }
  });

  const base =
    ordered.length > 0 ? ordered : [...PROD_DEFAULT_INDIVIDUAL_COLUMN_KEYS];
  return enforceIndividualColumnKeyOrder(base);
};

export function reorderIndividualColumnKeys(
  keys: string[],
  dragKey: string,
  dropKey: string,
  filterPinnedKeys: string[] = []
): string[] {
  const frozenKeys = getEffectiveFrozenIndividualColumnKeys(filterPinnedKeys);
  const frozenSet = new Set(frozenKeys);
  const ordered = enforceIndividualColumnKeyOrder(keys, filterPinnedKeys);
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
  return enforceIndividualColumnKeyOrder(next, filterPinnedKeys);
}
