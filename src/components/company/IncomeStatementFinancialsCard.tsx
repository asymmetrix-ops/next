"use client";

import React, { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import {
  CARD_HEADER_BAR_STYLE,
  CARD_TITLE_STYLE,
  LinkPanel,
  T,
} from "@/components/redesign/primitives";
import type { IncomeStatementFinancialsViewModel } from "@/lib/incomeStatementFinancials";
import { IncomeStatementMetricsGrid } from "./IncomeStatementMetricsGrid";

export function IncomeStatementFinancialsCard({
  model,
}: {
  model: IncomeStatementFinancialsViewModel;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <LinkPanel style={{ marginBottom: 16 }}>
      <div style={CARD_HEADER_BAR_STYLE}>
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: "pointer",
            minWidth: 0,
          }}
        >
          {collapsed ? (
            <ChevronDownIcon width={16} height={16} color={T.muted} aria-hidden />
          ) : (
            <ChevronUpIcon width={16} height={16} color={T.muted} aria-hidden />
          )}
          <span style={CARD_TITLE_STYLE}>{model.title}</span>
          <span
            style={{
              fontFamily: T.sans,
              fontSize: 12,
              color: T.muted,
              fontWeight: 500,
            }}
          >
            {model.metrics.length} metrics
          </span>
        </button>
      </div>
      {!collapsed ? <IncomeStatementMetricsGrid model={model} /> : null}
    </LinkPanel>
  );
}
