import { runGenericListExport } from "./runListExport";
import type { ExportCellValue } from "./exportCellValue";
import type { ExportColumnDef, ListExportRequest } from "./types";
import { TRANSACTION_COMPS_COLUMN_CATEGORIES } from "@/components/transaction-comps/transactionCompsColumns";
import { transactionCompCsvValue } from "@/components/transaction-comps/transactionCompsCells";
import type { TransactionCompRow } from "@/components/transaction-comps/transactionCompsTypes";

const EXTRA_LEADING_COLUMNS: ExportColumnDef[] = [
  { key: "id", label: "ID", categoryName: "Identity", type: "number" },
];

function cellValue(row: TransactionCompRow, column: ExportColumnDef): ExportCellValue {
  if (column.key === "id") return row.company_id;
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
        columns: c.columns,
      })),
      visibleColumnKeys,
      extraLeadingColumns: EXTRA_LEADING_COLUMNS,
    },
    rows: rows as unknown as Record<string, unknown>[],
    getEntityName: (row) => String((row as unknown as TransactionCompRow).company_name),
    getCellValue: (row, column) => String(cellValue(row as unknown as TransactionCompRow, column) ?? ""),
    getCellExportValue: (row, column) => cellValue(row as unknown as TransactionCompRow, column),
  });
}
