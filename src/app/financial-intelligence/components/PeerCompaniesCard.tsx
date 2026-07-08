"use client";

import React from "react";
import { DroppedPeersBar } from "./DroppedPeersBar";
import type { FiCompanySearchHit } from "@/lib/financialIntelligence/apiClient";
import { resolveSectorNames, vintageTooltip, companyColor } from "@/lib/financialIntelligence/mappers";
import type { FiCompanyRow, FiSectorLookup } from "@/lib/financialIntelligence/types";
import { SourceColoredValue } from "./SourceTypeValue";
import { CompanyAvatar } from "@/components/CompanyAvatar";

interface PeerCompaniesCardProps {
  peers: FiCompanyRow[];
  targetFinancialYear: number | null;
  targetFyYeMonth?: number | null;
  excludedPeers: FiCompanyRow[];
  excludedIds: number[];
  manuallyAddedIds?: number[];
  primarySectors: FiSectorLookup[];
  secondarySectors: FiSectorLookup[];
  onExclude: (companyId: number) => void;
  onRestorePeer: (companyId: number) => void;
  onRestoreAll: () => void;
  onAddCompany: (companyId: number) => void;
  addQuery: string;
  onAddQueryChange: (value: string) => void;
  addResults: FiCompanySearchHit[];
  onPickAddResult: (company: FiCompanySearchHit) => void;
}

const thStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--fg-4)",
  textAlign: "left",
  padding: "8px 12px",
  borderBottom: "1px solid var(--border-1)",
  background: "var(--ax-gray-25)",
};

export function PeerCompaniesCard({
  peers,
  targetFinancialYear,
  targetFyYeMonth,
  excludedPeers,
  excludedIds,
  manuallyAddedIds = [],
  primarySectors,
  secondarySectors,
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
          padding: "14px 16px",
          borderBottom: "1px solid var(--border-1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, color: "var(--fg-1)" }}>Companies in this benchmark</div>
          <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
            {peers.length} {peers.length === 1 ? "company" : "companies"}
            {excludedIds.length > 0 ? ` · ${excludedIds.length} dropped` : ""}
          </div>
        </div>
        <div style={{ width: 180, flexShrink: 0 }}>
          <input
            type="text"
            value={addQuery}
            placeholder="Add a company…"
            onChange={(e) => onAddQueryChange(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 10px",
              borderRadius: "var(--r-sm)",
              border: "1px solid var(--border-1)",
              fontSize: 12,
            }}
          />
        </div>
      </div>

      {addResults.length > 0 && (
        <div
          style={{
            borderBottom: "1px solid var(--border-1)",
            padding: "6px 12px",
            background: "var(--ax-gray-25)",
          }}
        >
          {addResults.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onAddCompany(item.id);
                onPickAddResult(item);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                textAlign: "left",
                padding: "6px 4px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 12,
                color: "var(--fg-1)",
              }}
            >
              <span style={{ flex: 1, fontWeight: 600 }}>{item.name}</span>
              <span style={{ color: "var(--ax-cyan-700)", fontWeight: 700 }}>+</span>
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, maxHeight: 420, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Company</th>
              <th style={thStyle}>Region</th>
              <th style={thStyle}>Model</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Revenue</th>
              <th style={{ ...thStyle, width: 36 }} aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {peers.map((peer) => {
              const sectors = resolveSectorNames(peer.sectors_id, primarySectors, secondarySectors);
              const vintageMismatch =
                targetFinancialYear != null &&
                peer.financial_year > 0 &&
                (peer.financial_year !== targetFinancialYear ||
                  (targetFyYeMonth != null &&
                    peer.fy_ye_month > 0 &&
                    peer.fy_ye_month !== targetFyYeMonth));
              const isManuallyAdded =
                Boolean(peer.is_manually_added) || manuallyAddedSet.has(peer.company_id);
              const revenueM = peer.revenue_m_usd;

              return (
                <tr key={peer.company_id} style={{ borderBottom: "1px solid var(--ax-gray-100)" }}>
                  <td style={{ padding: "9px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <CompanyAvatar
                        name={peer.company_name}
                        logo={peer.company_logo}
                        size={22}
                        fallbackColor={companyColor(peer.company_id)}
                      />
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: 12.5,
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
                          style={{ cursor: "help", color: "var(--ax-warning)", flexShrink: 0 }}
                        >
                          ⚑
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "9px 12px", fontSize: 12, color: "var(--fg-2)" }}>
                    {peer.location_region || peer.location_country || "—"}
                  </td>
                  <td style={{ padding: "9px 12px", fontSize: 12, color: "var(--fg-2)" }}>
                    {sectors.secondary !== "—" ? sectors.secondary : sectors.primary}
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "right" }}>
                    <SourceColoredValue
                      value={revenueM}
                      format="currency"
                      sourceType={peer.revenue_source_type}
                      fontWeight={700}
                      fontSize={12.5}
                    />
                  </td>
                  <td style={{ padding: "9px 8px", textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => onExclude(peer.company_id)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "var(--fg-4)",
                        cursor: "pointer",
                        fontSize: 16,
                        lineHeight: 1,
                      }}
                      aria-label={`Remove ${peer.company_name} from benchmark`}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {peers.length === 0 && (
          <div style={{ padding: 16, color: "var(--fg-3)", fontSize: 13 }}>
            No peers in the current benchmark set.
          </div>
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
