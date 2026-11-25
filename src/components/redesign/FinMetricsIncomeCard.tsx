"use client";

/**
 * FinMetricsIncomeCard — two stacked tab-switching cards (V3 right rail):
 * 1. Financial Metrics · Income Statement
 * 2. Subscription Metrics · Other Metrics
 */
import React, { useMemo, useState } from "react";
import { DataSourceTag } from "@/components/tags/DataSourceTag";
import {
  LinkPanel,
  T,
  finMetricLabelStyle,
  finMetricRowStyle,
  finMetricPeriodColStyle,
  FIN_METRIC_VALUE_CLASS,
  finMetricValueColStyle,
  finMetricValueColorForSource,
  finMetricSourceColStyle,
  finMetricPeriodSourceColStyle,
  finMetricsContentXPad,
  finMetricsPeriodHeaderStyle,
  FIN_METRIC_GRID_COLS,
  FIN_METRICS_TAB_BAR_STYLE,
  FIN_METRICS_TAB_STYLE,
} from "./primitives";
import {
  IncomeStatementTable,
  type IncomeStatementRow,
} from "./IncomeStatementSection";
import {
  financialSectionHasData,
  type FinancialMetricRow,
  type FinancialMetricSection,
  type FinancialMetricsCardData,
} from "@/lib/buildFinancialMetricsSections";
import { FinancialsCurrencyToggle } from "@/components/company/FinancialsCurrencyToggle";
import type { CurrencyDisplayMode, FxToggleConfig } from "@/lib/financialsCurrencyToggle";
import type { CurrencyMode } from "@/types/financials";
export type PrimaryFinTab = "metrics" | "income";
export type SecondaryFinTab = "subscription" | "other";

type Props = {
  data: FinancialMetricsCardData;
  hasIncomeStatement?: boolean;
  incomeStatementRows?: IncomeStatementRow[];
  incomeStatementCurrency?: string;
  fillGridCell?: boolean;
};

const GRID_COLS = FIN_METRIC_GRID_COLS;

function PeriodHeader({ period }: { period?: string }) {
  if (!period) return null;
  return (
    <div
      className="info-row fin-metric-period-header"
      style={{
        display: "grid",
        gridTemplateColumns: GRID_COLS,
        gap: 8,
        alignItems: "center",
        padding: `6px ${finMetricsContentXPad}px 4px`,
        background: T.paper,
        borderBottom: `1px solid ${T.hair}`,
        ...finMetricsPeriodHeaderStyle,
      }}
    >
      <span />
      <span className="fin-metric-period-col" style={finMetricPeriodColStyle}>{period}</span>
      <span className="fin-metric-period-source-col" style={finMetricPeriodSourceColStyle}>
        Source
      </span>
    </div>
  );
}

function MetricRow({ row, last }: { row: FinancialMetricRow; last?: boolean }) {
  const isBlank = (v?: string) => !v || v.trim() === "" || v.trim() === "-" || v.trim() === "—";
  const hasValue = !isBlank(row.value);
  const hasSource = !isBlank(row.source);
  return (
    <div
      className="info-row"
      style={{
        ...finMetricRowStyle,
        borderBottom: last ? "none" : finMetricRowStyle.borderBottom,
      }}
    >
      <span
        style={{
          ...finMetricLabelStyle,
          paddingRight: 8,
        }}
      >
        {row.label}
      </span>
      <span
        className={FIN_METRIC_VALUE_CLASS}
        style={{
          ...finMetricValueColStyle,
          color: finMetricValueColorForSource(row.source),
        }}
      >
        <span>{row.value}</span>
        {hasValue && hasSource ? (
          <span style={{ display: "block", marginTop: 3 }}>
            <DataSourceTag label={row.source} />
          </span>
        ) : null}
      </span>
      <span className="fin-metric-source-col" style={finMetricSourceColStyle}>
        {row.source}
      </span>
    </div>
  );
}

function MetricSectionBody({
  section,
  fillAvailable = false,
}: {
  section: FinancialMetricSection;
  fillAvailable?: boolean;
}) {
  const rows = section.rows.map((row, i) => (
    <MetricRow
      key={row.label}
      row={row}
      last={i === section.rows.length - 1}
    />
  ));

  const metricsBody = (
    <>
      <PeriodHeader period={section.periodDisplay} />
      <div
        style={{
          padding: `0 ${finMetricsContentXPad}px`,
          paddingBottom: 4,
        }}
      >
        {rows}
      </div>
    </>
  );

  if (!fillAvailable) {
    return metricsBody;
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
        }}
      >
        {metricsBody}
      </div>
    </div>
  );
}

function ViewMoreArrow({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="View full financial metrics"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontSize: 12,
        color: T.azure,
        fontWeight: 500,
        lineHeight: 1,
        padding: "0 2px",
      }}
    >
      →
    </button>
  );
}

function TabHeader<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  suffixForTab,
  onViewMore,
  fxToggleConfig,
  currencyMode,
  onCurrencyModeChange,
}: {
  tabs: { id: T; label: string }[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  suffixForTab?: (tabId: T) => string | undefined;
  onViewMore?: () => void;
  fxToggleConfig?: FxToggleConfig | null;
  currencyMode?: CurrencyMode;
  onCurrencyModeChange?: (mode: CurrencyMode) => void;
}) {
  const toggleMode: CurrencyDisplayMode =
    currencyMode === "reported" ? "native" : "preferred";

  return (
    <div role="tablist" style={FIN_METRICS_TAB_BAR_STYLE}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "nowrap",
          minWidth: 0,
          flex: 1,
          overflowX: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        className="fin-tab-scroll"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={(e) => {
              e.stopPropagation();
              onTabChange(tab.id);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              ...FIN_METRICS_TAB_STYLE,
              color: activeTab === tab.id ? T.ink : T.muted,
              fontWeight: activeTab === tab.id ? 600 : 500,
              borderBottom: `2px solid ${activeTab === tab.id ? T.azure : "transparent"}`,
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "color 120ms, border-color 120ms",
            }}
          >
            {tab.label}
            {suffixForTab?.(tab.id) ?? ""}
          </button>
        ))}
      </div>
      <div style={{ display: "inline-flex", alignItems: "flex-end", gap: 8 }}>
        {fxToggleConfig && onCurrencyModeChange ? (
          <FinancialsCurrencyToggle
            config={fxToggleConfig}
            mode={toggleMode}
            compact
            onChange={(mode) =>
              onCurrencyModeChange(mode === "native" ? "reported" : "preferred")
            }
          />
        ) : null}
        {onViewMore ? <ViewMoreArrow onClick={onViewMore} /> : null}
      </div>
    </div>
  );
}

type CurrencyToggleProps = {
  fxToggleConfig?: FxToggleConfig | null;
  currencyMode?: CurrencyMode;
  onCurrencyModeChange?: (mode: CurrencyMode) => void;
};

function PrimaryFinCard({
  primary,
  hasIncomeStatement,
  incomeStatementRows,
  incomeStatementCurrency,
  fillGridCell = false,
  hideEmptyTabs = false,
  onViewMore,
  fxToggleConfig,
  currencyMode,
  onCurrencyModeChange,
}: {
  primary: FinancialMetricSection;
  hasIncomeStatement: boolean;
  incomeStatementRows: IncomeStatementRow[];
  incomeStatementCurrency: string;
  fillGridCell?: boolean;
  hideEmptyTabs?: boolean;
  onViewMore?: () => void;
} & CurrencyToggleProps) {
  const incomeTabLabel = "Income Statement";
  const showMetricsTab = !hideEmptyTabs || financialSectionHasData(primary);

  const tabs = useMemo(() => {
    const list: { id: PrimaryFinTab; label: string }[] = [];
    if (showMetricsTab) {
      list.push({ id: "metrics", label: "Financial Metrics" });
    }
    if (hasIncomeStatement) {
      list.push({ id: "income", label: incomeTabLabel });
    }
    return list;
  }, [showMetricsTab, hasIncomeStatement, incomeTabLabel]);

  const [selectedTab, setSelectedTab] = useState<PrimaryFinTab>("metrics");
  // Fall back to the first tab with data when the chosen one is hidden
  const activeTab = tabs.some((t) => t.id === selectedTab)
    ? selectedTab
    : tabs[0]?.id ?? "metrics";

  if (tabs.length === 0) return null;

  return (
    <LinkPanel fillGridCell={fillGridCell} className="fin-metrics-card--primary">
      <TabHeader
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setSelectedTab}
        onViewMore={onViewMore}
        fxToggleConfig={fxToggleConfig}
        currencyMode={currencyMode}
        onCurrencyModeChange={onCurrencyModeChange}
      />
      <div
        style={
          fillGridCell
            ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }
            : undefined
        }
      >
      {activeTab === "metrics" ? (
        <MetricSectionBody section={primary} fillAvailable={fillGridCell} />
      ) : activeTab === "income" && hasIncomeStatement ? (
        <div style={fillGridCell ? { flex: 1, minHeight: 0, overflow: "auto" } : undefined}>
          <IncomeStatementTable
            rows={incomeStatementRows}
            currency={incomeStatementCurrency}
            currencyMode={currencyMode ?? "preferred"}
          />
        </div>
      ) : (
        <MetricSectionBody section={primary} fillAvailable={fillGridCell} />
      )}
      </div>
    </LinkPanel>
  );
}

function SecondaryFinCard({
  subscription,
  other,
  fillGridCell = false,
  hideEmptyTabs = false,
  onViewMore,
}: {
  subscription: FinancialMetricSection;
  other: FinancialMetricSection;
  fillGridCell?: boolean;
  hideEmptyTabs?: boolean;
  onViewMore?: () => void;
}) {
  // Tabs without data are left out when hideEmptyTabs is on
  const tabs: { id: SecondaryFinTab; label: string }[] = [];
  if (!hideEmptyTabs || financialSectionHasData(subscription)) {
    tabs.push({ id: "subscription", label: "Subscription Metrics" });
  }
  if (!hideEmptyTabs || financialSectionHasData(other)) {
    tabs.push({ id: "other", label: "Other Metrics" });
  }

  const [selectedTab, setSelectedTab] = useState<SecondaryFinTab>("subscription");
  const activeTab = tabs.some((t) => t.id === selectedTab)
    ? selectedTab
    : tabs[0]?.id ?? "subscription";

  if (tabs.length === 0) return null;

  return (
    <LinkPanel fillGridCell={fillGridCell} className="fin-metrics-card--secondary">
      <TabHeader
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setSelectedTab}
        onViewMore={onViewMore}
      />
      <div
        style={
          fillGridCell
            ? {
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }
            : undefined
        }
      >
        {activeTab === "subscription" ? (
          <MetricSectionBody section={subscription} fillAvailable={fillGridCell} />
        ) : (
          <MetricSectionBody section={other} fillAvailable={fillGridCell} />
        )}
      </div>
    </LinkPanel>
  );
}

export function FinMetricsPrimaryCard(
  props: Omit<React.ComponentProps<typeof PrimaryFinCard>, "fillGridCell"> & {
    fillGridCell?: boolean;
  }
) {
  return <PrimaryFinCard {...props} />;
}

export function FinMetricsSecondaryCard(
  props: Omit<React.ComponentProps<typeof SecondaryFinCard>, "fillGridCell"> & {
    fillGridCell?: boolean;
  }
) {
  return <SecondaryFinCard {...props} />;
}

export function FinMetricsIncomeCard({
  data,
  hasIncomeStatement = false,
  incomeStatementRows = [],
  incomeStatementCurrency = "",
  fillGridCell = true,
  hideEmptyTabs = false,
  onViewMore,
  fxToggleConfig,
  currencyMode,
  onCurrencyModeChange,
}: Props & { hideEmptyTabs?: boolean; onViewMore?: () => void } & CurrencyToggleProps) {
  const hasAnyData =
    hasIncomeStatement ||
    financialSectionHasData(data.primary) ||
    financialSectionHasData(data.subscription) ||
    financialSectionHasData(data.other);
  if (hideEmptyTabs && !hasAnyData) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        width: "100%",
        minWidth: 0,
        ...(fillGridCell
          ? { height: "100%", minHeight: 0, flex: 1 }
          : {}),
      }}
    >
      <PrimaryFinCard
        primary={data.primary}
        hasIncomeStatement={hasIncomeStatement}
        incomeStatementRows={incomeStatementRows}
        incomeStatementCurrency={incomeStatementCurrency}
        hideEmptyTabs={hideEmptyTabs}
        onViewMore={onViewMore}
        fxToggleConfig={fxToggleConfig}
        currencyMode={currencyMode}
        onCurrencyModeChange={onCurrencyModeChange}
      />
      <SecondaryFinCard
        subscription={data.subscription}
        other={data.other}
        hideEmptyTabs={hideEmptyTabs}
        onViewMore={onViewMore}
      />
    </div>
  );
}
