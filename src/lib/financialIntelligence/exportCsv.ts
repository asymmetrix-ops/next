import type { FinRow } from "@/app/financials-tsx/types";
import {
  FI_PEER_COLUMN_CATEGORIES,
  FI_PEER_COLUMN_ORDER,
} from "@/lib/financialIntelligence/fiPeerColumnCategories";
import { buildCsvContent, downloadCsvContent } from "@/lib/listExport/csv";
import type { Currency, FXRates } from "@/lib/fxRates";
import { convertCurrency } from "@/lib/fxRates";
import type { FiPeerAggregateMode } from "./types";

interface FiPeerExportColumn {
  id: string;
  label: string;
  type: string;
}

function getFiPeerExportColumns(): FiPeerExportColumn[] {
  const metaById = new Map<string, { label: string; type: string }>();
  for (const category of FI_PEER_COLUMN_CATEGORIES) {
    for (const column of category.columns) {
      metaById.set(column.id, { label: column.label, type: column.type });
    }
  }

  return FI_PEER_COLUMN_ORDER.map((id) => ({
    id,
    label: metaById.get(id)?.label ?? id,
    type: metaById.get(id)?.type ?? "text",
  }));
}

function finRowValue(row: FinRow, key: string): unknown {
  if (key in row) return row[key as keyof FinRow];
  return undefined;
}

function convertMillionsValue(
  value: number,
  displayCurrency: Currency,
  fxRates: FXRates | null
): number {
  if (displayCurrency === "USD" || !fxRates) return value;
  return convertCurrency(value, displayCurrency, fxRates) ?? value;
}

function formatExportCurrencyMillions(
  value: unknown,
  symbol: string,
  displayCurrency: Currency,
  fxRates: FXRates | null
): string {
  if (value == null || value === "") return "";
  const num = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(num)) return "";

  const converted = convertMillionsValue(num, displayCurrency, fxRates);
  const abs = Math.abs(converted);

  if (abs >= 1000) {
    const billions = converted / 1000;
    const decimals = billions % 1 === 0 ? 0 : 1;
    return `${symbol}${billions.toFixed(decimals)}b`;
  }

  if (abs % 1 === 0) {
    return `${symbol}${Math.round(converted).toLocaleString("en-US")}m`;
  }

  return `${symbol}${converted.toLocaleString("en-US", { maximumFractionDigits: 1 })}m`;
}

function formatExportPerUnitCurrency(
  value: unknown,
  symbol: string,
  displayCurrency: Currency,
  fxRates: FXRates | null
): string {
  if (value == null || value === "") return "";
  const num = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(num)) return "";

  const converted = convertMillionsValue(num, displayCurrency, fxRates);
  if (Math.abs(converted) >= 1_000_000) {
    return `${symbol}${Math.round(converted / 1_000_000)}m`;
  }
  if (Math.abs(converted) >= 1000) {
    return `${symbol}${Math.round(converted / 1000)}k`;
  }
  return `${symbol}${Math.round(converted).toLocaleString("en-US")}`;
}

function formatExportPercent(value: unknown, withSign = false): string {
  if (value == null || value === "") return "";
  const num = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(num)) return "";
  const sign = withSign && num > 0 ? "+" : "";
  return `${sign}${Math.round(num)}%`;
}

function formatExportNumber(value: unknown): string {
  if (value == null || value === "") return "";
  const num = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(num)) return "";
  return String(num);
}

function formatExportCount(value: unknown): string {
  if (value == null || value === "") return "";
  const num = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(num)) return "";
  return Math.round(num).toLocaleString("en-US");
}

function formatFinRowExportCell(
  column: FiPeerExportColumn,
  row: FinRow,
  displayCurrency: Currency,
  currencySymbol: string,
  fxRates: FXRates | null
): string {
  const value = finRowValue(row, column.id);

  switch (column.id) {
    case "company":
      return row.name?.trim() || "";
    case "sector":
      return [row.primary, row.secondary].filter(Boolean).join(" / ");
    case "hq":
      return row.hq?.trim() || row.country?.trim() || "";
    case "ownership":
      return row.ownership || "";
    case "financial_year":
      return row.financial_year?.trim() || "";
    case "rev_growth":
      return formatExportPercent(value, true);
    case "rev_per_client":
    case "rev_per_employee":
      return formatExportPerUnitCurrency(value, currencySymbol, displayCurrency, fxRates);
    default:
      break;
  }

  if (column.type === "currency") {
    return formatExportCurrencyMillions(value, currencySymbol, displayCurrency, fxRates);
  }
  if (column.type === "percent") {
    return formatExportPercent(value);
  }
  if (column.type === "number") {
    const num = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(num)) return "";
    if (
      column.id === "rev_multiple" ||
      column.id === "ev_revenue" ||
      column.id === "ev_ebitda" ||
      column.id === "ev_ebit"
    ) {
      return `${Math.round(num)}x`;
    }
    return formatExportNumber(value);
  }

  if (column.id === "fte" || column.id === "num_clients" || column.id === "num_employees") {
    return formatExportCount(value);
  }

  return value == null ? "" : String(value);
}

export interface BenchmarkCsvInput {
  targetRow: FinRow;
  aggregateRow: FinRow;
  peerRows: FinRow[];
  displayCurrency: Currency;
  currencySymbol: string;
  fxRates: FXRates | null;
  peerAggregateMode?: FiPeerAggregateMode;
  exportedAt?: Date;
}

export function buildBenchmarkCsv(input: BenchmarkCsvInput): string {
  const {
    targetRow,
    aggregateRow,
    peerRows,
    displayCurrency,
    currencySymbol,
    fxRates,
    exportedAt = new Date(),
  } = input;

  const columns = getFiPeerExportColumns();
  const headers = columns.map((column) => column.label);
  const orderedRows = [targetRow, aggregateRow, ...peerRows];

  const dataRows = orderedRows.map((row) =>
    columns.map((column) =>
      formatFinRowExportCell(column, row, displayCurrency, currencySymbol, fxRates)
    )
  );

  const metadata = [
    ["Financial Benchmark Export"],
    ["Exported At", exportedAt.toISOString()],
    ["Display Currency", displayCurrency],
    ["Peer Aggregate", input.peerAggregateMode === "mean" ? "Mean" : "Median"],
    ["Row Order", "Target company, sector aggregate, peers"],
    [],
  ].map((cells) => cells.join(","));

  const tableCsv = buildCsvContent(headers, dataRows);
  const metaBlock = metadata.join("\r\n");
  return tableCsv.replace(/^\uFEFF/, `\uFEFF${metaBlock}\r\n`);
}

export function exportBenchmarkToCsv(input: BenchmarkCsvInput): void {
  const slug = input.targetRow.name
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  const filename = `financial-benchmark-${slug || "export"}`;
  downloadCsvContent(buildBenchmarkCsv(input), filename);
}
