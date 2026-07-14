"use client";

import React from "react";

export const SEARCH_TABLE_SELECT_COLUMN_WIDTH = 44;

export type SearchTableSelectionProps = {
  selectedEntityIds?: Set<number>;
  onToggleEntitySelection?: (id: number) => void;
  onTogglePageSelection?: (ids: number[]) => void;
  onClearSelection?: () => void;
};

export function isSearchTableSelectionEnabled(
  props: SearchTableSelectionProps
): boolean {
  return Boolean(
    props.selectedEntityIds &&
      props.onToggleEntitySelection &&
      props.onTogglePageSelection
  );
}

export function SearchTableSelectHeader({
  pageIds,
  pageSelectionState,
  onTogglePageSelection,
  ariaLabel = "Select all on this page",
}: {
  pageIds: number[];
  pageSelectionState: { allSelected: boolean; someSelected: boolean };
  onTogglePageSelection: (ids: number[]) => void;
  ariaLabel?: string;
}) {
  return (
    <th
      className="company-table-select-cell"
      style={{
        minWidth: SEARCH_TABLE_SELECT_COLUMN_WIDTH,
        width: SEARCH_TABLE_SELECT_COLUMN_WIDTH,
        textAlign: "center",
      }}
    >
      <input
        type="checkbox"
        checked={pageSelectionState.allSelected}
        ref={(el) => {
          if (el) el.indeterminate = pageSelectionState.someSelected;
        }}
        onChange={() => onTogglePageSelection(pageIds)}
        aria-label={ariaLabel}
      />
    </th>
  );
}

export function SearchTableSelectCell({
  entityId,
  selected,
  onToggle,
  ariaLabel,
}: {
  entityId: number;
  selected: boolean;
  onToggle: (id: number) => void;
  ariaLabel?: string;
}) {
  return (
    <td
      className="company-table-select-cell"
      style={{
        minWidth: SEARCH_TABLE_SELECT_COLUMN_WIDTH,
        width: SEARCH_TABLE_SELECT_COLUMN_WIDTH,
        textAlign: "center",
        background: selected ? "#EFF6FF" : undefined,
      }}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(entityId)}
        onClick={(e) => e.stopPropagation()}
        aria-label={ariaLabel ?? "Select row"}
      />
    </td>
  );
}
