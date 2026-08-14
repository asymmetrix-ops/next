"use client";

import React from "react";
import {
  CARD_HEADER_BAR_STYLE,
  CARD_TITLE_STYLE,
  LinkPanel,
  T,
} from "@/components/redesign/primitives";
import type { IncomeStatementFinancialsViewModel } from "@/lib/incomeStatementFinancials";
import type { FiMetricSourceType } from "@/lib/financialIntelligence/sourceTypes";
import type { CurrencyDisplayMode } from "@/lib/financialsCurrencyToggle";
import { IncomeStatementMetricsGrid } from "./IncomeStatementMetricsGrid";

export function IncomeStatementFinancialsCard({
  model,
  showYoyColumn = false,
  reserveYoyColumn = false,
  allowedSources,
  currencyMode = "preferred",
}: {
  model: IncomeStatementFinancialsViewModel;
  showYoyColumn?: boolean;
  /** Empty YoY column so year columns line up with metrics cards below. */
  reserveYoyColumn?: boolean;
  allowedSources: FiMetricSourceType[];
  currencyMode?: CurrencyDisplayMode;
}) {
  return (
    <LinkPanel style={{ marginBottom: 16 }}>
      <div style={CARD_HEADER_BAR_STYLE}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
          }}
        >
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
        </div>
      </div>
      <IncomeStatementMetricsGrid
        model={model}
        showYoyColumn={showYoyColumn}
        reserveYoyColumn={reserveYoyColumn}
        allowedSources={allowedSources}
        currencyMode={currencyMode}
      />
    </LinkPanel>
  );
}
