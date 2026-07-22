import type { ExportColumnDef } from "./types";

const DEFAULT_EXCLUDED_TYPES = new Set(["follow"]);

export function getAllExportColumnsFromCategories(
  categories: Array<{
    name: string;
    columns: Array<{
      columnKey: string;
      label: string;
      type: string;
    }>;
  }>,
  excludeTypes: Set<string> = DEFAULT_EXCLUDED_TYPES
): ExportColumnDef[] {
  const columns: ExportColumnDef[] = [];
  for (const category of categories) {
    for (const column of category.columns) {
      if (excludeTypes.has(column.type)) continue;
      columns.push({
        key: column.columnKey,
        label: column.label,
        categoryName: category.name,
        type: column.type,
      });
    }
  }
  return columns;
}

export function getVisibleExportColumns(
  visibleColumnKeys: string[],
  allColumns: ExportColumnDef[]
): ExportColumnDef[] {
  const byKey = new Map(allColumns.map((column) => [column.key, column]));
  return visibleColumnKeys
    .map((key) => byKey.get(key))
    .filter((column): column is ExportColumnDef => Boolean(column));
}

/**
 * Inserts extra identity columns in reference order:
 * ID, Name, Website, Asymmetrix URL, …
 */
function mergeExtraLeadingColumns(
  columns: ExportColumnDef[],
  extraLeadingColumns: ExportColumnDef[]
): ExportColumnDef[] {
  if (!extraLeadingColumns.length) return columns;

  const byKey = new Map(extraLeadingColumns.map((column) => [column.key, column]));
  const idCol = byKey.get("id");
  const urlCol = byKey.get("asymmetrix_url");
  const otherExtras = extraLeadingColumns.filter(
    (column) => column.key !== "id" && column.key !== "asymmetrix_url"
  );

  const seen = new Set<string>();
  const result: ExportColumnDef[] = [];

  const push = (column: ExportColumnDef | undefined) => {
    if (!column || seen.has(column.key)) return;
    seen.add(column.key);
    result.push(column);
  };

  // Reference Identity order: ID → Name → Website → Asymmetrix URL
  push(idCol);
  for (const column of columns) {
    if (column.key === "name" || column.key === "website") {
      push(column);
      if (column.key === "website") push(urlCol);
    }
  }
  // If name/website missing, still place URL after ID
  push(urlCol);

  for (const column of otherExtras) push(column);
  for (const column of columns) push(column);

  return result;
}

/**
 * Visible export: always lead with ID then Name (regardless of the user's
 * column visibility/order in-app), followed by whichever other columns the
 * user currently has visible, in their existing relative order.
 */
function withLeadingIdAndName(
  selected: ExportColumnDef[],
  allColumns: ExportColumnDef[],
  extraLeadingColumns: ExportColumnDef[] = []
): ExportColumnDef[] {
  const idCol = extraLeadingColumns.find((column) => column.key === "id");
  const nameCol =
    selected.find((column) => column.key === "name") ??
    allColumns.find((column) => column.key === "name");

  const seen = new Set<string>();
  const result: ExportColumnDef[] = [];

  const push = (column: ExportColumnDef | undefined) => {
    if (!column || seen.has(column.key)) return;
    seen.add(column.key);
    result.push(column);
  };

  push(idCol);
  push(nameCol);
  for (const column of selected) push(column);

  return result;
}

export function buildExportColumnList(
  mode: "all_columns" | "visible_columns",
  config: {
    categories: Array<{
      name: string;
      columns: Array<{
        columnKey: string;
        label: string;
        type: string;
      }>;
    }>;
    visibleColumnKeys: string[];
    extraLeadingColumns?: ExportColumnDef[];
  }
): ExportColumnDef[] {
  const allColumns = getAllExportColumnsFromCategories(config.categories);

  if (mode === "all_columns") {
    if (config.extraLeadingColumns?.length) {
      return mergeExtraLeadingColumns(allColumns, config.extraLeadingColumns);
    }
    return allColumns;
  }

  const selected = getVisibleExportColumns(config.visibleColumnKeys, allColumns);
  return withLeadingIdAndName(selected, allColumns, config.extraLeadingColumns);
}
