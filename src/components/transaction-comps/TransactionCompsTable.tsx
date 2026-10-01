"use client";

import React from "react";
import { ALL_TRANSACTION_COMPS_COLUMN_META } from "./transactionCompsColumns";
import {
  NUMERIC_COLUMNS,
  SORT_BY_COLUMN,
  renderTransactionCompCell,
} from "./transactionCompsCells";
import type { TransactionCompRow } from "./transactionCompsTypes";

const LABELS = new Map(ALL_TRANSACTION_COMPS_COLUMN_META.map((c) => [c.columnKey, c.label]));

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

  return (
    <div className={`relative isolate overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
      <table className="min-w-full border-separate border-spacing-0 text-sm text-gray-800">
        <thead>
          <tr>
            {columnKeys.map((key, i) => {
              const apiSort = SORT_BY_COLUMN[key];
              const active = apiSort === sortBy;
              return (
                <th
                  key={key}
                  className={`whitespace-nowrap border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 ${
                    NUMERIC_COLUMNS.has(key) ? "text-right" : "text-left"
                  } ${i === 0 ? "sticky left-0 z-20 min-w-[280px]" : ""}`}
                >
                  <div className={`flex items-center gap-3 ${NUMERIC_COLUMNS.has(key) ? "justify-end" : ""}`}>
                    {i === 0 && (
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = !allSelected && someSelected;
                        }}
                        onChange={(e) => onToggleAll(e.target.checked)}
                      />
                    )}
                    {apiSort ? (
                      <button type="button" onClick={() => onSort(apiSort)} className="uppercase hover:text-gray-800">
                        {LABELS.get(key)}
                        {active ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                      </button>
                    ) : (
                      LABELS.get(key)
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const selected = selectedIds.has(row.company_id);
            return (
              <tr key={`${row.company_id}-${row.corporate_event?.id ?? ""}`} className="group">
                {columnKeys.map((key, i) => (
                  <td
                    key={key}
                    className={`border-b border-gray-100 px-4 py-3 align-middle ${
                      NUMERIC_COLUMNS.has(key) ? "whitespace-nowrap text-right tabular-nums" : key === "corporate_events" ? "min-w-[280px]" : ""
                    } ${selected ? "bg-blue-50" : "bg-white group-hover:bg-gray-50"} ${
                      i === 0 ? "sticky left-0 z-10 min-w-[280px]" : ""
                    }`}
                  >
                    {i === 0 ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${row.company_name}`}
                          checked={selected}
                          onChange={() => onToggleRow(row.company_id)}
                          className={`transition-opacity ${
                            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                          }`}
                        />
                        {renderTransactionCompCell(row, key)}
                      </div>
                    ) : (
                      renderTransactionCompCell(row, key)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columnKeys.length} className="px-4 py-12 text-center text-gray-500">
                No transactions match your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {loading && rows.length === 0 && (
        <div className="px-4 py-12 text-center text-gray-500">Loading transaction comps…</div>
      )}
    </div>
  );
}
