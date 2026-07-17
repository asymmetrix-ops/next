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
  const selected =
    mode === "all_columns"
      ? allColumns
      : getVisibleExportColumns(config.visibleColumnKeys, allColumns);

  if (mode !== "all_columns" || !config.extraLeadingColumns?.length) {
    return selected;
  }

  const seen = new Set<string>();
  const leading: ExportColumnDef[] = [];
  for (const column of config.extraLeadingColumns) {
    if (seen.has(column.key)) continue;
    seen.add(column.key);
    leading.push(column);
  }

  const rest = selected.filter((column) => !seen.has(column.key));
  return [...leading, ...rest];
}
