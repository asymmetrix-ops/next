"use client";

import React, { useState } from "react";

interface TargetSelectorProps {
  targetId: number | null;
  targetName: string | null;
  targetLogo: string | null;
  targetUrl: string | null;
  loading?: boolean;
  onSelect: (companyId: number) => void;
  onClear: () => void;
}

export function TargetSelector({
  targetId,
  targetName,
  targetLogo,
  targetUrl,
  loading = false,
  onSelect,
  onClear,
}: TargetSelectorProps) {
  const [companyIdInput, setCompanyIdInput] = useState("");

  const handleLoad = () => {
    const id = Number(companyIdInput.trim());
    if (!Number.isFinite(id) || id <= 0) return;
    onSelect(id);
    setCompanyIdInput("");
  };

  if (targetId && targetName) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          borderRadius: 999,
          border: "1px solid var(--ax-cyan-200)",
          background: "var(--ax-cyan-50)",
        }}
      >
        {targetLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={targetLogo}
            alt=""
            style={{ width: 24, height: 24, borderRadius: 6, objectFit: "cover" }}
          />
        ) : (
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: "var(--ax-cyan-700)",
              color: "white",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {targetName[0]}
          </span>
        )}
        {targetUrl ? (
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontWeight: 700, color: "var(--ax-cyan-800)", textDecoration: "none" }}
          >
            {targetName}
          </a>
        ) : (
          <span style={{ fontWeight: 700, color: "var(--ax-cyan-800)" }}>{targetName}</span>
        )}
        <span style={{ fontSize: 12, color: "var(--fg-3)" }}>#{targetId}</span>
        <button
          type="button"
          onClick={onClear}
          style={{
            border: "none",
            background: "transparent",
            color: "var(--fg-3)",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
          }}
          aria-label="Clear target company"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, maxWidth: 420 }}>
      <input
        type="number"
        min={1}
        value={companyIdInput}
        placeholder="Enter company ID (e.g. 2142)"
        onChange={(e) => setCompanyIdInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleLoad();
        }}
        disabled={loading}
        style={{
          width: 220,
          padding: "10px 14px",
          borderRadius: "var(--r-md)",
          border: "1px solid var(--border-1)",
          fontSize: 14,
        }}
      />
      <button
        type="button"
        onClick={handleLoad}
        disabled={loading || !companyIdInput.trim()}
        style={{
          padding: "10px 16px",
          borderRadius: "var(--r-md)",
          border: "none",
          background: "var(--ax-cyan-700)",
          color: "white",
          fontWeight: 600,
          fontSize: 13,
          cursor: loading || !companyIdInput.trim() ? "default" : "pointer",
          opacity: loading || !companyIdInput.trim() ? 0.6 : 1,
        }}
      >
        {loading ? "Loading…" : "Load target"}
      </button>
    </div>
  );
}
