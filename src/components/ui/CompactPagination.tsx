"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

interface CompactPaginationProps {
  curPage: number;
  pageTotal: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

const CompactPagination: React.FC<CompactPaginationProps> = ({
  curPage,
  pageTotal,
  onPageChange,
  disabled = false,
  className,
}) => {
  const [inputValue, setInputValue] = useState(String(curPage));
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input when curPage changes externally
  useEffect(() => {
    setInputValue(String(curPage));
    setError(false);
  }, [curPage]);

  const commit = useCallback(
    (raw: string) => {
      const parsed = parseInt(raw, 10);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > pageTotal) {
        setError(true);
        setInputValue(String(curPage));
        setTimeout(() => setError(false), 1200);
        return;
      }
      setError(false);
      if (parsed !== curPage) {
        onPageChange(parsed);
      }
    },
    [curPage, pageTotal, onPageChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // blur will trigger onBlur → commit; don't call commit here too
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "Escape") {
      setInputValue(String(curPage));
      setError(false);
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // If focus moved to one of our arrow buttons, skip commit —
    // the arrow's onClick will handle navigation instead.
    const related = e.relatedTarget as HTMLElement | null;
    if (related?.classList.contains("compact-pagination-arrow")) return;
    commit(inputValue);
  };

  if (pageTotal <= 1) return null;

  const isFirst = curPage <= 1;
  const isLast = curPage >= pageTotal;

  return (
    <div
      className={`compact-pagination${className ? ` ${className}` : ""}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "inherit",
        fontSize: 14,
        color: "#555",
        userSelect: "none",
      }}
    >
      {/* Left arrow */}
      <button
        type="button"
        className="compact-pagination-arrow"
        onClick={() => !isFirst && !disabled && onPageChange(curPage - 1)}
        disabled={isFirst || disabled}
        aria-label="Previous page"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          border: "1px solid #d1d5db",
          borderRadius: 4,
          background: isFirst || disabled ? "#f3f4f6" : "#fff",
          color: isFirst || disabled ? "#9ca3af" : "#374151",
          cursor: isFirst || disabled ? "not-allowed" : "pointer",
          padding: 0,
          lineHeight: 1,
          transition: "background 0.15s, color 0.15s",
        }}
      >
        ‹
      </button>

      {/* "Page X of N" */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          whiteSpace: "nowrap",
          fontSize: 14,
          color: "#374151",
        }}
      >
        Page
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={(e) => handleBlur(e)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          aria-label="Page number"
          style={{
            width: Math.max(32, String(pageTotal).length * 9 + 16),
            height: 28,
            textAlign: "center",
            border: `1px solid ${error ? "#ef4444" : "#d1d5db"}`,
            borderRadius: 4,
            fontSize: 14,
            fontFamily: "inherit",
            color: error ? "#ef4444" : "#111827",
            background: disabled ? "#f3f4f6" : "#fff",
            outline: "none",
            padding: "0 4px",
            transition: "border-color 0.15s",
            boxSizing: "border-box",
          }}
        />
        <span style={{ color: "#6b7280" }}>of {pageTotal}</span>
      </span>

      {/* Right arrow */}
      <button
        type="button"
        className="compact-pagination-arrow"
        onClick={() => !isLast && !disabled && onPageChange(curPage + 1)}
        disabled={isLast || disabled}
        aria-label="Next page"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          border: "1px solid #d1d5db",
          borderRadius: 4,
          background: isLast || disabled ? "#f3f4f6" : "#fff",
          color: isLast || disabled ? "#9ca3af" : "#374151",
          cursor: isLast || disabled ? "not-allowed" : "pointer",
          padding: 0,
          lineHeight: 1,
          transition: "background 0.15s, color 0.15s",
        }}
      >
        ›
      </button>
    </div>
  );
};

export default React.memo(CompactPagination);
