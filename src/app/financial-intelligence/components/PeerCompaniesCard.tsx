"use client";

import React from "react";
import type { FiCompanyRow } from "@/lib/financialIntelligence/types";
import { vintageTooltip } from "@/lib/financialIntelligence/mappers";

interface PeerCompaniesCardProps {
  peers: FiCompanyRow[];
  targetFinancialYear: number | null;
  excludedIds: number[];
  onExclude: (companyId: number) => void;
  onRestoreAll: () => void;
  onAddCompany: (companyId: number) => void;
  addQuery: string;
  onAddQueryChange: (value: string) => void;
  addResults: Array<{ id: number; name: string }>;
  onPickAddResult: (company: { id: number; name: string }) => void;
}

export function PeerCompaniesCard({
  peers,
  targetFinancialYear,
  excludedIds,
  onExclude,
  onRestoreAll,
  onAddCompany,
  addQuery,
  onAddQueryChange,
  addResults,
  onPickAddResult,
}: PeerCompaniesCardProps) {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid var(--border-1)",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--border-1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, color: "var(--fg-1)" }}>Companies in this benchmark</div>
          <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
            {peers.length} active · {excludedIds.length} excluded
          </div>
        </div>
        {excludedIds.length > 0 && (
          <button
            type="button"
            onClick={onRestoreAll}
            style={{
              padding: "5px 10px",
              borderRadius: "var(--r-sm)",
              border: "1px solid var(--border-1)",
              background: "white",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Restore all
          </button>
        )}
      </div>

      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-1)" }}>
        <input
          type="text"
          value={addQuery}
          placeholder="Add company by name…"
          onChange={(e) => onAddQueryChange(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: "var(--r-sm)",
            border: "1px solid var(--border-1)",
            fontSize: 13,
          }}
        />
        {addResults.length > 0 && (
          <div style={{ marginTop: 6 }}>
            {addResults.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onAddCompany(item.id);
                  onPickAddResult(item);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 0",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 12,
                  color: "var(--ax-cyan-700)",
                }}
              >
                + {item.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ maxHeight: 360, overflow: "auto" }}>
        {peers.map((peer) => {
          const vintageMismatch =
            targetFinancialYear != null &&
            peer.financial_year > 0 &&
            peer.financial_year !== targetFinancialYear;

          return (
            <div
              key={peer.company_id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
                borderBottom: "1px solid var(--ax-gray-100)",
              }}
            >
              {peer.company_logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={peer.company_logo}
                  alt=""
                  style={{ width: 24, height: 24, borderRadius: 6, objectFit: "cover" }}
                />
              ) : (
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: "var(--ax-gray-200)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {peer.company_name[0]}
                </span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {peer.company_name}
                  </span>
                  {peer.is_manually_added && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--ax-cyan-700)",
                        background: "var(--ax-cyan-50)",
                        padding: "1px 6px",
                        borderRadius: 999,
                      }}
                    >
                      ADDED
                    </span>
                  )}
                  {vintageMismatch && targetFinancialYear != null && (
                    <span
                      title={vintageTooltip(peer.financial_year, targetFinancialYear)}
                      style={{ cursor: "help", color: "var(--ax-warning)" }}
                    >
                      ⚑
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--fg-3)" }}>
                  {peer.location_country || "—"} · FY{peer.financial_year || "—"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onExclude(peer.company_id)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--fg-3)",
                  cursor: "pointer",
                  fontSize: 16,
                }}
                aria-label={`Remove ${peer.company_name} from benchmark`}
              >
                ×
              </button>
            </div>
          );
        })}
        {peers.length === 0 && (
          <div style={{ padding: 16, color: "var(--fg-3)", fontSize: 13 }}>
            No peers in the current benchmark set.
          </div>
        )}
      </div>
    </div>
  );
}

interface MetricHistogramProps {
  title: string;
  bins: { min: number; max: number; count: number }[];
  targetValue: number | null;
  format: "percent" | "multiple";
}

export function MetricHistogram({ title, bins, targetValue, format }: MetricHistogramProps) {
  const maxCount = Math.max(...bins.map((bin) => bin.count), 1);

  return (
    <div
      style={{
        background: "white",
        border: "1px solid var(--border-1)",
        borderRadius: "var(--r-lg)",
        padding: "14px 16px",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 10, color: "var(--fg-1)" }}>{title}</div>
      {bins.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--fg-3)" }}>Not enough peer data</div>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 72 }}>
          {bins.map((bin, index) => {
            const height = Math.max(6, (bin.count / maxCount) * 64);
            const containsTarget =
              targetValue != null &&
              targetValue >= bin.min &&
              (index === bins.length - 1 ? targetValue <= bin.max : targetValue < bin.max);

            return (
              <div
                key={`${bin.min}-${bin.max}`}
                title={`${bin.min.toFixed(1)}–${bin.max.toFixed(1)}: ${bin.count}`}
                style={{
                  flex: 1,
                  height,
                  borderRadius: 3,
                  background: containsTarget ? "var(--ax-cyan-600)" : "var(--ax-cyan-100)",
                }}
              />
            );
          })}
        </div>
      )}
      {targetValue != null && (
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--fg-3)" }}>
          Target: {format === "percent" ? `${targetValue.toFixed(1)}%` : `${targetValue.toFixed(1)}x`}
        </div>
      )}
    </div>
  );
}
