"use client";

import React from "react";
import { SEARCH_TABLE_STYLES } from "@/components/search/searchTableStyles";
import { ALL_TRANSACTION_COMPS_COLUMN_META } from "./transactionCompsColumns";
import {
  NUMERIC_COLUMNS,
  SORT_BY_COLUMN,
  renderTransactionCompCell,
} from "./transactionCompsCells";
import type { TransactionCompRow } from "./transactionCompsTypes";

const LABELS = new Map(ALL_TRANSACTION_COMPS_COLUMN_META.map((c) => [c.columnKey, c.label]));

/** Width of the checkbox column; the frozen Company column sticks right after it. */
const SELECT_COL_WIDTH = 44;
const COMPANY_COL_WIDTH = 260;

const MIN_WIDTH: Record<string, number> = {
  company: COMPANY_COL_WIDTH,
  corporate_events: 300,
  acquirer_investor: 200,
  sector: 200,
};

/**
 * Same table chrome as the Companies list (`company-table*` classes from
 * SEARCH_TABLE_STYLES): dedicated hover-checkbox column + frozen first column.
 */
export function TransactionCompsTable({
  rows,
  columnKeys,
  loading,
  selectedIds,
  sortBy,
  sortDir,
  onSort,
  onToggleRow,
  onToggleAll,
}: {
  rows: TransactionCompRow[];
  columnKeys: string[];
  loading: boolean;
  selectedIds: Set<number>;
  sortBy: string;
  sortDir: "asc" | "desc";
  onSort: (apiSortBy: string) => void;
  onToggleRow: (id: number) => void;
  onToggleAll: (checked: boolean) => void;
}) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.company_id));
  const someSelected = rows.some((r) => selectedIds.has(r.company_id));

  const stickyStyle = (key: string, header: boolean, selected = false): React.CSSProperties | undefined =>
    key === "company"
      ? {
          position: "sticky",
          left: SELECT_COL_WIDTH,
          zIndex: header ? 7 : 3,
          boxShadow: "2px 0 4px rgba(15, 23, 42, 0.06)",
          background: header ? "#F5F7FD" : selected ? "#EFF6FF" : "#fff",
        }
      : undefined;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SEARCH_TABLE_STYLES }} />
      <div className="company-table-scroll" style={{ opacity: loading ? 0.6 : 1, transition: "opacity 0.15s" }}>
        <table className="company-table">
          <thead>
            <tr>
              <th
                className="company-table-select-cell"
                style={{ minWidth: SELECT_COL_WIDTH, width: SELECT_COL_WIDTH, textAlign: "center" }}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = !allSelected && someSelected;
                  }}
                  onChange={(e) => onToggleAll(e.target.checked)}
                  aria-label="Select all companies on this page"
                />
              </th>
              {columnKeys.map((key) => {
                const apiSort = SORT_BY_COLUMN[key];
                const active = apiSort === sortBy;
                return (
                  <th
                    key={key}
                    className={[
                      apiSort ? "company-table-th-sortable" : "",
                      key === "company" ? "company-table-sticky-frozen" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{
                      minWidth: MIN_WIDTH[key],
                      textAlign: NUMERIC_COLUMNS.has(key) ? "right" : undefined,
                      ...stickyStyle(key, true),
                    }}
                    onClick={apiSort ? () => onSort(apiSort) : undefined}
                  >
                    {LABELS.get(key)}
                    {active && (
                      <span className="company-table-sort-indicator">
                        {sortDir === "asc" ? " ↑" : " ↓"}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selected = selectedIds.has(row.company_id);
              return (
                <tr
                  key={`${row.company_id}-${row.corporate_event?.id ?? ""}`}
                  className={selected ? "company-table-row-selected" : undefined}
                >
                  <td
                    className="company-table-select-cell"
                    style={{
                      minWidth: SELECT_COL_WIDTH,
                      width: SELECT_COL_WIDTH,
                      textAlign: "center",
                      background: selected ? "#EFF6FF" : "#fff",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleRow(row.company_id)}
                      aria-label={`Select ${row.company_name}`}
                    />
                  </td>
                  {columnKeys.map((key) => (
                    <td
                      key={key}
                      className={key === "company" ? "company-table-sticky-frozen" : undefined}
                      style={{
                        minWidth: MIN_WIDTH[key],
                        textAlign: NUMERIC_COLUMNS.has(key) ? "right" : undefined,
                        fontVariantNumeric: NUMERIC_COLUMNS.has(key) ? "tabular-nums" : undefined,
                        ...stickyStyle(key, false, selected),
                      }}
                    >
                      {renderTransactionCompCell(row, key)}
                    </td>
                  ))}
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columnKeys.length + 1} style={{ textAlign: "center", padding: 48, color: "#6B7488" }}>
                  No transactions match your filters.
                </td>
              </tr>
            )}
            {loading && rows.length === 0 && (
              <tr>
                <td colSpan={columnKeys.length + 1} style={{ textAlign: "center", padding: 48, color: "#6B7488" }}>
                  Loading transaction comps…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
