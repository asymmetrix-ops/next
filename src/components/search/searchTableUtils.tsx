import type React from "react";

export const SEARCH_IDENTITY_COLUMN_KEYS = new Set(["name", "company"]);

export function getSearchTableColumnClassName(
  column: { key: string; wrap?: boolean },
  frozenKeys: readonly string[],
  extraClasses: Array<string | undefined> = []
): string | undefined {
  const classes = [
    column.wrap ? "company-table-cell-wrap" : undefined,
    frozenKeys.includes(column.key) ? "company-table-sticky-frozen" : undefined,
    SEARCH_IDENTITY_COLUMN_KEYS.has(column.key) ? "company-table-col-name" : undefined,
    column.key === "follow" ? "company-table-col-follow" : undefined,
    ...extraClasses,
  ].filter(Boolean);

  return classes.length > 0 ? classes.join(" ") : undefined;
}

export function buildStickyColumnOffsets(
  frozenKeys: readonly string[],
  columns: Array<{ key: string; minWidth?: number }>,
  leadingOffset = 0
): Map<string, number> {
  const offsets = new Map<string, number>();
  let left = leadingOffset;

  for (const key of frozenKeys) {
    offsets.set(key, left);
    const col = columns.find((item) => item.key === key);
    left += col?.minWidth ?? 120;
  }

  return offsets;
}

export function getStickyColumnStyle(
  columnKey: string,
  stickyColumnOffsets: Map<string, number>,
  minWidth?: number,
  header = false,
  selected = false
): React.CSSProperties | undefined {
  const left = stickyColumnOffsets.get(columnKey);
  if (left == null) return undefined;

  return {
    position: "sticky",
    left,
    zIndex: header ? 7 : 3,
    minWidth,
    background: header ? "#f8fafc" : selected ? "#EFF6FF" : "#fff",
    boxShadow: "1px 0 0 #e2e8f0",
  };
}

export function SearchTablePinIndicator({ title }: { title: string }) {
  return (
    <span
      className="company-table-pin-indicator"
      title={title}
      aria-label={title}
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <rect
          x="2.25"
          y="5.25"
          width="7.5"
          height="5.5"
          rx="1.1"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M4 5.25V3.75a2 2 0 014 0v1.5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
