"use client";

import React from "react";
import { DroppedPeersBar } from "./DroppedPeersBar";
import type { FiCompanySearchHit } from "@/lib/financialIntelligence/apiClient";
import { vintageTooltip, companyColor } from "@/lib/financialIntelligence/mappers";
import type { FiCompanyRow } from "@/lib/financialIntelligence/types";
import { CompanyAvatar } from "@/components/CompanyAvatar";

interface PeerCompaniesCardProps {
  peers: FiCompanyRow[];
  targetFinancialYear: number | null;
  targetFyYeMonth?: number | null;
  excludedPeers: FiCompanyRow[];
  excludedIds: number[];
  manuallyAddedIds?: number[];
  onExclude: (companyId: number) => void;
  onRestorePeer: (companyId: number) => void;
  onRestoreAll: () => void;
  onAddCompany: (companyId: number) => void;
  addQuery: string;
  onAddQueryChange: (value: string) => void;
  addResults: FiCompanySearchHit[];
  onPickAddResult: (company: FiCompanySearchHit) => void;
}

export function PeerCompaniesCard({
  peers,
  targetFinancialYear,
  targetFyYeMonth,
  excludedPeers,
  excludedIds,
  manuallyAddedIds = [],
  onExclude,
  onRestorePeer,
  onRestoreAll,
  onAddCompany,
  addQuery,
  onAddQueryChange,
  addResults,
  onPickAddResult,
}: PeerCompaniesCardProps) {
  const manuallyAddedSet = new Set(manuallyAddedIds);

  return (
    <div
      style={{
        background: "white",
        border: "1px solid var(--border-1)",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid var(--border-1)",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--fg-1)" }}>
          Companies in this benchmark
        </div>
        <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>
          {peers.length} {peers.length === 1 ? "company" : "companies"}
          {excludedIds.length > 0 ? ` · ${excludedIds.length} dropped` : ""}
        </div>
        <input
          type="text"
          value={addQuery}
          placeholder="Add a company…"
          onChange={(e) => onAddQueryChange(e.target.value)}
          style={{
            width: "100%",
            marginTop: 8,
            padding: "6px 8px",
            borderRadius: "var(--r-sm)",
            border: "1px solid var(--border-1)",
            fontSize: 12,
            boxSizing: "border-box",
          }}
        />
      </div>

      {addResults.length > 0 && (
        <div
          style={{
            borderBottom: "1px solid var(--border-1)",
            padding: "4px 8px",
            background: "var(--ax-gray-25)",
            maxHeight: 160,
            overflowY: "auto",
          }}
        >
          {addResults.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onAddCompany(item.id);
                onPickAddResult(item);
                onAddQueryChange("");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                textAlign: "left",
                padding: "5px 4px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 12,
                color: "var(--fg-1)",
              }}
            >
              <CompanyAvatar name={item.name} logo={item.logo} size={18} />
              <span style={{ flex: 1, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.name}
              </span>
              <span style={{ color: "var(--ax-cyan-700)", fontWeight: 700, flexShrink: 0 }}>+</span>
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, maxHeight: 520, overflow: "auto" }}>
        {peers.length === 0 ? (
          <div style={{ padding: 12, color: "var(--fg-3)", fontSize: 12 }}>
            No peers in the current benchmark set.
          </div>
        ) : (
          peers.map((peer) => {
            const vintageMismatch =
              targetFinancialYear != null &&
              peer.financial_year > 0 &&
              (peer.financial_year !== targetFinancialYear ||
                (targetFyYeMonth != null &&
                  peer.fy_ye_month > 0 &&
                  peer.fy_ye_month !== targetFyYeMonth));
            const isManuallyAdded =
              Boolean(peer.is_manually_added) || manuallyAddedSet.has(peer.company_id);

            return (
              <div
                key={peer.company_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 10px",
                  borderBottom: "1px solid var(--ax-gray-100)",
                }}
              >
                <CompanyAvatar
                  name={peer.company_name}
                  logo={peer.company_logo}
                  size={20}
                  fallbackColor={companyColor(peer.company_id)}
                />
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontWeight: 600,
                    fontSize: 12,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {peer.company_name}
                </span>
                {isManuallyAdded && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: "var(--ax-cyan-700)",
                      background: "var(--ax-cyan-50)",
                      padding: "1px 5px",
                      borderRadius: 999,
                      flexShrink: 0,
                    }}
                  >
                    ADDED
                  </span>
                )}
                {vintageMismatch && targetFinancialYear != null && (
                  <span
                    title={vintageTooltip(
                      peer.financial_year,
                      targetFinancialYear,
                      peer.fy_ye_month,
                      targetFyYeMonth
                    )}
                    style={{ cursor: "help", color: "var(--ax-warning)", flexShrink: 0, fontSize: 11 }}
                  >
                    ⚑
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onExclude(peer.company_id)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--fg-4)",
                    cursor: "pointer",
                    fontSize: 15,
                    lineHeight: 1,
                    flexShrink: 0,
                    padding: "0 2px",
                  }}
                  aria-label={`Remove ${peer.company_name} from benchmark`}
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </div>

      <DroppedPeersBar
        excludedPeers={excludedPeers}
        excludedIds={excludedIds}
        onRestorePeer={onRestorePeer}
        onRestoreAll={onRestoreAll}
      />
    </div>
  );
}
