"use client";

import React, { useMemo } from "react";
import type { FiCompanyRow } from "@/lib/financialIntelligence/types";

interface DroppedPeersBarProps {
  excludedPeers: FiCompanyRow[];
  excludedIds: number[];
  onRestorePeer: (companyId: number) => void;
  onRestoreAll: () => void;
}

export function DroppedPeersBar({
  excludedPeers,
  excludedIds,
  onRestorePeer,
  onRestoreAll,
}: DroppedPeersBarProps) {
  const droppedPeers = useMemo(() => {
    const byId = new Map(excludedPeers.map((peer) => [peer.company_id, peer]));
    return excludedIds.map(
      (id) =>
        byId.get(id) ?? {
          company_id: id,
          company_name: `Company #${id}`,
        }
    );
  }, [excludedIds, excludedPeers]);

  if (droppedPeers.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 10px",
        borderTop: "1px solid var(--border-1)",
        background: "var(--ax-gray-25)",
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: 10.5, color: "var(--fg-3)", flexShrink: 0 }}>
        Dropped:
      </span>
      {droppedPeers.map((peer) => (
        <button
          key={peer.company_id}
          type="button"
          onClick={() => onRestorePeer(peer.company_id)}
          title={`Restore ${peer.company_name}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 8px",
            background: "white",
            border: "1px dashed var(--border-2)",
            borderRadius: "var(--r-md)",
            fontSize: 12,
            color: "var(--fg-3)",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
          }}
        >
          <span style={{ textDecoration: "line-through" }}>{peer.company_name}</span>
          <svg width="11" height="11" viewBox="0 0 12 12" style={{ color: "var(--ax-cyan-700)" }}>
            <path
              d="M6 2v8M2 6h8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ))}
      <button
        type="button"
        onClick={onRestoreAll}
        style={{
          border: "none",
          background: "transparent",
          color: "var(--fg-link)",
          fontSize: 11.5,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "var(--font-sans)",
          marginLeft: 4,
          padding: 0,
        }}
      >
        Restore all
      </button>
    </div>
  );
}
