"use client";

/**
 * FinMetricsIncomeCard — two stacked tab-switching cards (V3 right rail):
 * 1. Financial Metrics · Benchmark vs Peers · Income Statement
 * 2. Subscription Metrics · Other Metrics
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  LinkPanel,
  Pill,
  T,
  KV_LABEL_COL,
  finMetricLabelStyle,
  finMetricRowStyle,
  finMetricPeriodColStyle,
  FIN_METRIC_VALUE_CLASS,
  finMetricValueColStyle,
  finMetricsBodyPadding,
  finMetricsPeriodHeaderStyle,
  FIN_METRIC_GRID_COLS,
  FIN_METRICS_TAB_BAR_STYLE,
  FIN_METRICS_TAB_STYLE,
} from "./primitives";
import {
  IncomeStatementTable,
  type IncomeStatementRow,
} from "./IncomeStatementSection";
import type {
  FinancialMetricRow,
  FinancialMetricSection,
  FinancialMetricsCardData,
} from "@/lib/buildFinancialMetricsSections";
import {
  benchmarkDeltaTone,
  type BenchmarkPeersData,
} from "@/lib/buildBenchmarkPeersData";

export type PrimaryFinTab = "metrics" | "benchmark" | "income";
export type SecondaryFinTab = "subscription" | "other";

type Props = {
  data: FinancialMetricsCardData;
  benchmarkData?: BenchmarkPeersData | null;
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
      style={{
        display: "grid",
        gridTemplateColumns: GRID_COLS,
        gap: 8,
        alignItems: "center",
        padding: "4px 12px 3px",
        background: T.paper,
        borderBottom: `1px solid ${T.hair}`,
        ...finMetricsPeriodHeaderStyle,
      }}
    >
      <span />
      <span />
      <span style={finMetricPeriodColStyle}>{period}</span>
      <span />
      <span
        style={{
          ...finMetricLabelStyle,
          textAlign: "right",
          justifySelf: "end",
          whiteSpace: "nowrap",
        }}
      >
        Source
      </span>
    </div>
  );
}

function MetricRow({ row, last }: { row: FinancialMetricRow; last?: boolean }) {
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
      <span />
      <span className={FIN_METRIC_VALUE_CLASS} style={finMetricValueColStyle}>
        {row.value}
      </span>
      <span />
      <span
        style={{
          ...finMetricLabelStyle,
          textAlign: "right",
          justifySelf: "end",
          whiteSpace: "nowrap",
        }}
      >
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

  if (!fillAvailable) {
    return (
      <>
        <PeriodHeader period={section.periodDisplay} />
        <div style={{ padding: finMetricsBodyPadding }}>{rows}</div>
      </>
    );
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
      <PeriodHeader period={section.periodDisplay} />
      <div
        style={{
          padding: finMetricsBodyPadding,
          flex: 1,
          minHeight: 0,
          overflow: "auto",
        }}
      >
        {rows}
      </div>
    </div>
  );
}

function BenchmarkTabBody({ data }: { data: BenchmarkPeersData }) {
  return (
    <div style={{ padding: finMetricsBodyPadding }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${KV_LABEL_COL} 1fr 1fr 48px`,
          gap: 8,
          padding: "2px 0",
          borderBottom: `1px solid ${T.hair}`,
        }}
      >
        <div style={finMetricLabelStyle}>Metric</div>
        <div style={{ ...finMetricLabelStyle, textAlign: "right" }}>{data.companyName}</div>
        <div style={{ ...finMetricLabelStyle, textAlign: "right" }}>Peer median</div>
        <div style={{ ...finMetricLabelStyle, textAlign: "center" }}>vs.</div>
      </div>
      {data.rows.map((row, i) => {
        const tone = benchmarkDeltaTone(row.companyValue, row.peerMedian);
        return (
          <div
            key={row.label}
            style={{
              display: "grid",
              gridTemplateColumns: `${KV_LABEL_COL} 1fr 1fr 48px`,
              gap: 8,
              padding: "4px 0",
              borderBottom:
                i === data.rows.length - 1 ? "none" : `1px solid ${T.hair}`,
              alignItems: "start",
            }}
          >
            <div style={finMetricLabelStyle}>{row.label}</div>
            <div
              className={FIN_METRIC_VALUE_CLASS}
              style={{ ...finMetricValueColStyle, textAlign: "center" }}
            >
              {row.companyValue}
            </div>
            <div
              className={FIN_METRIC_VALUE_CLASS}
              style={{ ...finMetricValueColStyle, textAlign: "center", color: T.muted }}
            >
              {row.peerMedian}
            </div>
            <div style={{ textAlign: "center" }}>
              <Pill tone={tone === "up" ? "up" : tone === "down" ? "down" : "ghost"}>
                {tone === "up" ? "▲" : tone === "down" ? "▼" : "–"}
              </Pill>
            </div>
          </div>
        );
      })}
      {data.footnote ? (
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            color: T.muted,
            lineHeight: 1.5,
          }}
        >
          {data.footnote}
        </div>
      ) : null}
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
}: {
  tabs: { id: T; label: string }[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  suffixForTab?: (tabId: T) => string | undefined;
  onViewMore?: () => void;
}) {
  return (
    <div role="tablist" style={FIN_METRICS_TAB_BAR_STYLE}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 14,
          flexWrap: "nowrap",
          minWidth: 0,
          flex: 1,
          overflowX: "auto",
          overflowY: "hidden",
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
              background: "transparent",
              border: "none",
              padding: 0,
              paddingBottom: 2,
              cursor: "pointer",
              ...FIN_METRICS_TAB_STYLE,
              color: activeTab === tab.id ? T.ink : T.muted,
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
      {onViewMore ? <ViewMoreArrow onClick={onViewMore} /> : null}
    </div>
  );
}

function BenchmarkPlaceholder() {
  return (
    <div
      style={{
        padding: "16px 12px 14px",
        fontSize: 13,
        color: T.muted,
        lineHeight: 1.55,
        textAlign: "center",
      }}
    >
      Benchmark vs. Peers is under development.
    </div>
  );
}

function PrimaryFinCard({
  primary,
  benchmarkData,
  hasIncomeStatement,
  incomeStatementRows,
  incomeStatementCurrency,
  fillGridCell = false,
  onViewMore,
}: {
  primary: FinancialMetricSection;
  benchmarkData: BenchmarkPeersData | null;
  hasIncomeStatement: boolean;
  incomeStatementRows: IncomeStatementRow[];
  incomeStatementCurrency: string;
  fillGridCell?: boolean;
  onViewMore?: () => void;
}) {
  const tabs = useMemo(() => {
    const list: { id: PrimaryFinTab; label: string }[] = [
      { id: "metrics", label: "Financial Metrics" },
      { id: "benchmark", label: "Benchmark vs. Peers" },
    ];
    if (hasIncomeStatement) {
      list.push({ id: "income", label: "Income Statement" });
    }
    return list;
  }, [hasIncomeStatement]);

  const [activeTab, setActiveTab] = useState<PrimaryFinTab>("metrics");

  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTab)) {
      setActiveTab("metrics");
    }
  }, [tabs, activeTab]);

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <TabHeader
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onViewMore={onViewMore}
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
      ) : activeTab === "benchmark" ? (
        benchmarkData ? (
          <BenchmarkTabBody data={benchmarkData} />
        ) : (
          <BenchmarkPlaceholder />
        )
      ) : activeTab === "income" && hasIncomeStatement ? (
        <div style={fillGridCell ? { flex: 1, minHeight: 0, overflow: "auto" } : undefined}>
          <IncomeStatementTable
            rows={incomeStatementRows}
            currency={incomeStatementCurrency}
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
  onViewMore,
}: {
  subscription: FinancialMetricSection;
  other: FinancialMetricSection;
  fillGridCell?: boolean;
  onViewMore?: () => void;
}) {
  const tabs: { id: SecondaryFinTab; label: string }[] = [
    { id: "subscription", label: "Subscription Metrics" },
    { id: "other", label: "Other Metrics" },
  ];

  const [activeTab, setActiveTab] = useState<SecondaryFinTab>("subscription");

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <TabHeader
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
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
  benchmarkData = null,
  hasIncomeStatement = false,
  incomeStatementRows = [],
  incomeStatementCurrency = "",
  fillGridCell = true,
  onViewMore,
}: Props & { onViewMore?: () => void }) {
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
        benchmarkData={benchmarkData}
        hasIncomeStatement={hasIncomeStatement}
        incomeStatementRows={incomeStatementRows}
        incomeStatementCurrency={incomeStatementCurrency}
        onViewMore={onViewMore}
      />
      <SecondaryFinCard
        subscription={data.subscription}
        other={data.other}
        onViewMore={onViewMore}
      />
    </div>
  );
}
