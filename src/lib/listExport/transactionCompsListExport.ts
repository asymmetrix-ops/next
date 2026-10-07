import { runGenericListExport } from "./runListExport";
import type { ExportCellValue } from "./exportCellValue";
import type { ExportColumnDef, ListExportRequest } from "./types";
import { TRANSACTION_COMPS_COLUMN_CATEGORIES } from "@/components/transaction-comps/transactionCompsColumns";
import { transactionCompCsvValue } from "@/components/transaction-comps/transactionCompsCells";
import type { TransactionCompRow } from "@/components/transaction-comps/transactionCompsTypes";

const EXTRA_LEADING_COLUMNS: ExportColumnDef[] = [
  { key: "id", label: "ID", categoryName: "Identity", type: "number" },
];

/** Export-only columns: the period each multiple is based on, kept next to the multiple. */
const BASIS_COLUMNS: Record<string, { columnKey: string; label: string; type: string }> = {
  ev_revenue: { columnKey: "ev_revenue_basis", label: "EV / Revenue basis", type: "text" },
  ev_ebitda: { columnKey: "ev_ebitda_basis", label: "EV / EBITDA basis", type: "text" },
};

const withBasisColumns = <T extends { columnKey: string }>(columns: T[]) =>
  columns.flatMap((c) => (BASIS_COLUMNS[c.columnKey] ? [c, BASIS_COLUMNS[c.columnKey] as unknown as T] : [c]));

function cellValue(row: TransactionCompRow, column: ExportColumnDef): ExportCellValue {
  if (column.key === "id") return row.company_id;
  if (column.key === "ev_revenue_basis") return row.ev_revenue_basis ?? null;
  if (column.key === "ev_ebitda_basis") return row.ev_ebitda_basis ?? null;
  const v = transactionCompCsvValue(row, column.key);
  return v === "" ? null : v;
}

export async function exportTransactionCompsList(
  request: ListExportRequest,
  rows: TransactionCompRow[],
  visibleColumnKeys: string[]
): Promise<void> {
  if (rows.length === 0) return;
  await runGenericListExport({
    request,
    config: {
      entitySheetName: "Transaction Comps",
      filePrefix: "TransactionComps",
      categories: TRANSACTION_COMPS_COLUMN_CATEGORIES.map((c) => ({
        name: c.name,
        columns: withBasisColumns(c.columns),
      })),
      visibleColumnKeys: visibleColumnKeys.flatMap((k) =>
        BASIS_COLUMNS[k] ? [k, BASIS_COLUMNS[k].columnKey] : [k]
      ),
      extraLeadingColumns: EXTRA_LEADING_COLUMNS,
    },
    rows: rows as unknown as Record<string, unknown>[],
    getEntityName: (row) => String((row as unknown as TransactionCompRow).company_name),
    getCellValue: (row, column) => String(cellValue(row as unknown as TransactionCompRow, column) ?? ""),
    getCellExportValue: (row, column) => cellValue(row as unknown as TransactionCompRow, column),
  });
}
