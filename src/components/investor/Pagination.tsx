import React from "react";
import type { PaginationState } from "@/types/investor";

interface PaginationProps {
  pagination: PaginationState;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  pagination,
  onPageChange,
}) => {
  if (pagination.pageTotal <= 1) return null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "8px",
        marginTop: "16px",
        padding: "16px",
      }}
    >
      <button
        onClick={() => onPageChange(pagination.curPage - 1)}
        disabled={!pagination.prevPage}
        style={{
          padding: "8px 12px",
          backgroundColor: pagination.prevPage ? "#3b82f6" : "#e2e8f0",
          color: pagination.prevPage ? "white" : "#64748b",
          border: "none",
          borderRadius: "4px",
          cursor: pagination.prevPage ? "pointer" : "not-allowed",
          fontSize: "14px",
        }}
      >
        Previous
      </button>

      <span style={{ fontSize: "14px", color: "#64748b" }}>
        Page {pagination.curPage} of {pagination.pageTotal}
      </span>

      <button
        onClick={() => onPageChange(pagination.curPage + 1)}
        disabled={!pagination.nextPage}
        style={{
          padding: "8px 12px",
          backgroundColor: pagination.nextPage ? "#3b82f6" : "#e2e8f0",
          color: pagination.nextPage ? "white" : "#64748b",
          border: "none",
          borderRadius: "4px",
          cursor: pagination.nextPage ? "pointer" : "not-allowed",
          fontSize: "14px",
        }}
      >
        Next
      </button>
    </div>
  );
};

export default React.memo(Pagination);
