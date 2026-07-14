/** Platform-wide feature visibility toggles. Flip when metrics are ready to ship. */
export const SHOW_ARR = false;

const ARR_COLUMN_KEYS = new Set([
  "arr_m",
  "arr",
  "arr_percent",
  "arr_pc",
  "recurring_revenue",
]);

const ARR_FILTER_IDS = new Set(["arr", "arr_m"]);

const ARR_METRIC_KEYS = new Set(["arr_m_usd", "arr_m", "arr_percent", "arr_pc"]);

export function isArrColumnKey(columnKey: string): boolean {
  return ARR_COLUMN_KEYS.has(columnKey);
}

export function isArrFilterId(filterId: string): boolean {
  return ARR_FILTER_IDS.has(filterId);
}

export function isArrMetricKey(key: string): boolean {
  return ARR_METRIC_KEYS.has(key);
}

export function withoutArrColumnKeys(keys: readonly string[]): string[] {
  if (SHOW_ARR) return [...keys];
  return keys.filter((key) => !isArrColumnKey(key));
}

export function filterArrFromCategories<
  T extends { id: string; columns?: Array<{ id?: string; columnKey?: string }> },
>(categories: T[]): T[] {
  if (SHOW_ARR) return categories;
  return categories
    .filter((category) => category.id !== "arr")
    .map((category) =>
      category.columns
        ? {
            ...category,
            columns: category.columns.filter(
              (column) =>
                !isArrColumnKey(column.columnKey ?? "") &&
                !isArrColumnKey(column.id ?? "")
            ),
          }
        : category
    )
    .filter((category) => !category.columns || category.columns.length > 0);
}

export function filterArrSubscriptionRows<
  T extends { k?: string; key?: string; id?: string; label?: string },
>(rows: T[]): T[] {
  if (SHOW_ARR) return rows;
  return rows.filter((row) => {
    const token = (row.k ?? row.key ?? row.id ?? row.label ?? "").toLowerCase();
    return (
      token !== "arr" &&
      !token.includes("arr (") &&
      !token.includes("arr growth") &&
      !token.includes("recurring rev")
    );
  });
}
