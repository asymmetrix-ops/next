"use client";

import React from "react";
import type { PaginationState } from "@/types/investor";
import CompactPagination from "@/components/ui/CompactPagination";

interface PaginationProps {
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  pagination,
  onPageChange,
  disabled = false,
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      marginTop: 16,
      padding: 16,
    }}
  >
    <CompactPagination
      curPage={pagination.curPage}
      pageTotal={pagination.pageTotal}
      onPageChange={onPageChange}
      disabled={disabled}
    />
  </div>
);

export default React.memo(Pagination);
