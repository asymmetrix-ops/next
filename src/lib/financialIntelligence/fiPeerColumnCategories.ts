import {
  FIN_COLUMN_CATEGORIES,
  FIN_COLUMN_DEFAULT_VISIBILITY,
  FIN_COLUMN_ORDER,
  FIN_COLUMN_TOTAL,
} from "@/app/financials-tsx/financials-columns";
import type {
  CompanyColumnCategory,
  CompanyColumnMeta,
} from "@/components/companies/companiesColumnCategories";

function mapColumnType(type: string): CompanyColumnMeta["type"] {
  if (type === "currency") return "currency";
  if (type === "percent") return "percent";
  if (type === "number") return "number";
  if (type === "date") return "date";
  return "text";
}

export const FI_PEER_COLUMN_CATEGORIES: CompanyColumnCategory[] =
  FIN_COLUMN_CATEGORIES.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    columns: category.columns.map((column) => ({
      id: column.id,
      columnKey: column.id,
      label: column.label,
      type: mapColumnType(column.type),
      locked: column.locked,
      defaultVisible: column.defaultVisible ?? false,
    })),
  }));

export const DEFAULT_FI_PEER_COLUMN_IDS = FIN_COLUMN_ORDER.filter(
  (id) => FIN_COLUMN_DEFAULT_VISIBILITY[id]
);

export { FIN_COLUMN_TOTAL as FI_PEER_COLUMN_TOTAL };

export function columnIdsToVisibility(
  selectedIds: string[]
): Record<string, boolean> {
  const selected = new Set(selectedIds);
  const out: Record<string, boolean> = {};
  for (const category of FIN_COLUMN_CATEGORIES) {
    for (const column of category.columns) {
      out[column.id] = column.locked ? true : selected.has(column.id);
    }
  }
  return out;
}

export function resolvePeerColumnIdsFromModal(
  visible: Record<string, boolean>,
  order?: string[]
): string[] {
  const ids = order?.length
    ? order.filter((id) => visible[id])
    : FIN_COLUMN_ORDER.filter((id) => visible[id]);

  if (!ids.includes("company")) {
    return ids;
  }

  return ["company", ...ids.filter((id) => id !== "company")];
}
