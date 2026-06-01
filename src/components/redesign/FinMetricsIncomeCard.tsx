"use client";

/**
 * FinMetricsIncomeCard — two stacked tab-switching cards (V3 right rail):
 * 1. Financial Metrics · Benchmark vs Peers · Income Statement
 * 2. Subscription Metrics · Other Metrics
 */
import React, { useEffect, useMemo, useState } from "react";
import { LinkPanel, LinkedH, Pill, T, CARD_TITLE_STYLE, KV_LABEL_COL, finMetricLabelStyle, finMetricRowStyle, finMetricValueStyle, overviewBodyPadding, FIN_METRIC_GRID_COLS, tableColHeaderBarStyle } from "./primitives";
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
  currencySuffix?: string;
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
        ...tableColHeaderBarStyle,
        gridTemplateColumns: GRID_COLS,
        gap: 8,
      }}
    >
      <span />
      <span style={{ textAlign: "center" }}>{period}</span>
      <span style={{ textAlign: "right" }}>Source</span>
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
      <span style={finMetricLabelStyle}>{row.label}</span>
      <span style={{ ...finMetricValueStyle, textAlign: "center", wordBreak: "break-word" }}>
        {row.value}
      </span>
      <span style={{ ...finMetricLabelStyle, textAlign: "right" }}>{row.source}</span>
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
        <div style={{ padding: overviewBodyPadding }}>{rows}</div>
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
          padding: overviewBodyPadding,
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
    <div style={{ padding: overviewBodyPadding }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${KV_LABEL_COL} 1fr 1fr 48px`,
          gap: 8,
          padding: "4px 0",
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
            <div style={{ ...finMetricValueStyle, textAlign: "right" }}>{row.companyValue}</div>
            <div style={{ ...finMetricValueStyle, textAlign: "right", color: T.muted }}>
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

function TabHeader<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  suffixForTab,
}: {
  tabs: { id: T; label: string }[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  suffixForTab?: (tabId: T) => string | undefined;
}) {
  return (
    <div role="tablist" style={{ flexShrink: 0, minWidth: 0 }}>
      <LinkedH showArrow={false}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 18,
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
                paddingBottom: 4,
                cursor: "pointer",
                ...CARD_TITLE_STYLE,
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
      </LinkedH>
    </div>
  );
}

function BenchmarkPlaceholder() {
  return (
    <div
      style={{
        padding: "24px 14px 20px",
        fontSize: 12,
        color: T.muted,
        lineHeight: 1.55,
        textAlign: "center",
      }}
    >
      Benchmark vs Peers is under development.
    </div>
  );
}

function PrimaryFinCard({
  currencySuffix,
  primary,
  benchmarkData,
  hasIncomeStatement,
  incomeStatementRows,
  incomeStatementCurrency,
  fillGridCell = false,
}: {
  currencySuffix: string;
  primary: FinancialMetricSection;
  benchmarkData: BenchmarkPeersData | null;
  hasIncomeStatement: boolean;
  incomeStatementRows: IncomeStatementRow[];
  incomeStatementCurrency: string;
  fillGridCell?: boolean;
}) {
  const tabs = useMemo(() => {
    const list: { id: PrimaryFinTab; label: string }[] = [
      { id: "metrics", label: "Financial Metrics" },
      { id: "benchmark", label: "Benchmark vs Peers" },
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
        suffixForTab={(id) => (id === "metrics" ? currencySuffix : undefined)}
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
}: {
  subscription: FinancialMetricSection;
  other: FinancialMetricSection;
  fillGridCell?: boolean;
}) {
  const tabs: { id: SecondaryFinTab; label: string }[] = [
    { id: "subscription", label: "Subscription Metrics" },
    { id: "other", label: "Other Metrics" },
  ];

  const [activeTab, setActiveTab] = useState<SecondaryFinTab>("subscription");

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <TabHeader tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      <div
        style={
          fillGridCell
            ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }
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
  currencySuffix = "",
  data,
  benchmarkData = null,
  hasIncomeStatement = false,
  incomeStatementRows = [],
  incomeStatementCurrency = "",
  fillGridCell = true,
}: Props) {
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
        currencySuffix={currencySuffix}
        primary={data.primary}
        benchmarkData={benchmarkData}
        hasIncomeStatement={hasIncomeStatement}
        incomeStatementRows={incomeStatementRows}
        incomeStatementCurrency={incomeStatementCurrency}
      />
      <SecondaryFinCard
        subscription={data.subscription}
        other={data.other}
      />
    </div>
  );
}
