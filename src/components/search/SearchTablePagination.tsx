"use client";

import React from "react";
import CompactPagination from "@/components/ui/CompactPagination";

type SearchTablePaginationProps = {
  curPage: number;
  pageTotal?: number;
  nextPage?: number | null;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

export function SearchTablePagination({
  curPage,
  pageTotal,
  nextPage,
  onPageChange,
  disabled = false,
}: SearchTablePaginationProps) {
  const resolvedPageTotal =
    pageTotal && pageTotal > 0
      ? pageTotal
      : nextPage != null
        ? Math.max(nextPage, curPage + 1)
        : 1;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "12px 8px",
      }}
    >
      <CompactPagination
        curPage={curPage}
        pageTotal={resolvedPageTotal}
        onPageChange={onPageChange}
        disabled={disabled}
      />
    </div>
  );
}
