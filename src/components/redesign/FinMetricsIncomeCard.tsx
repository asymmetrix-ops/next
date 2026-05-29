"use client";

/**
 * FinMetricsIncomeCard — two stacked tab-switching cards (V3 right rail):
 * 1. Financial Metrics · Benchmark vs Peers · Income Statement
 * 2. Subscription Metrics · Other Metrics
 */
import React, { useEffect, useMemo, useState } from "react";
import { LinkPanel, Pill, T } from "./primitives";
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

const GRID_COLS = "minmax(180px, 220px) 1fr auto";

function PeriodHeader({ period }: { period?: string }) {
  if (!period) return null;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: GRID_COLS,
        marginBottom: 4,
        fontSize: 13,
        color: T.muted,
        fontWeight: 500,
      }}
    >
      <span />
      <span style={{ textAlign: "left" }}>{period}</span>
      <span
        style={{
          fontSize: 11,
          color: T.muted,
          textAlign: "right",
          whiteSpace: "nowrap",
          paddingLeft: 8,
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
        display: "grid",
        gridTemplateColumns: GRID_COLS,
        columnGap: 4,
        alignItems: "center",
        padding: "10px 0",
        borderBottom: last ? "none" : `1px solid ${T.hair}`,
        fontSize: 12.5,
      }}
    >
      <span style={{ fontSize: 12.5, color: T.muted, fontWeight: 400 }}>{row.label}</span>
      <span
        style={{
          fontSize: 12.5,
          color: T.body,
          fontWeight: 400,
          textAlign: "left",
          wordBreak: "break-word",
          fontFamily: T.mono,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {row.value}
      </span>
      <span
        style={{
          fontSize: 11,
          color: T.muted,
          textAlign: "right",
          whiteSpace: "nowrap",
          paddingLeft: 8,
        }}
      >
        {row.source}
      </span>
    </div>
  );
}

function MetricSectionBody({ section }: { section: FinancialMetricSection }) {
  return (
    <div style={{ padding: "8px 16px 14px" }}>
      <PeriodHeader period={section.periodDisplay} />
      {section.rows.map((row, i) => (
        <MetricRow
          key={row.label}
          row={row}
          last={i === section.rows.length - 1}
        />
      ))}
    </div>
  );
}

function BenchmarkTabBody({ data }: { data: BenchmarkPeersData }) {
  return (
    <div style={{ padding: "6px 16px 14px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr 56px",
          gap: 8,
          padding: "8px 0 6px",
          borderBottom: `1px solid ${T.hair}`,
          fontSize: 10,
          color: T.muted,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        <div>Metric</div>
        <div style={{ textAlign: "right" }}>{data.companyName}</div>
        <div style={{ textAlign: "right" }}>Peer median</div>
        <div style={{ textAlign: "center" }}>vs.</div>
      </div>
      {data.rows.map((row, i) => {
        const tone = benchmarkDeltaTone(row.companyValue, row.peerMedian);
        return (
          <div
            key={row.label}
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 1fr 56px",
              gap: 8,
              padding: "9px 0",
              borderBottom:
                i === data.rows.length - 1 ? "none" : `1px solid ${T.hair}`,
              fontSize: 12.5,
              alignItems: "center",
            }}
          >
            <div style={{ color: T.muted }}>{row.label}</div>
            <div
              style={{
                textAlign: "right",
                fontFamily: T.mono,
                color: T.ink,
                fontVariantNumeric: "tabular-nums",
                fontWeight: 500,
              }}
            >
              {row.companyValue}
            </div>
            <div
              style={{
                textAlign: "right",
                fontFamily: T.mono,
                color: T.muted,
                fontVariantNumeric: "tabular-nums",
              }}
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
    <div
      role="tablist"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px 12px",
        borderBottom: `1px solid ${T.hair}`,
        gap: 12,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          minWidth: 0,
          fontFamily: T.sans,
          fontSize: 13.5,
          fontWeight: 600,
        }}
      >
        {tabs.map((tab, index) => (
          <React.Fragment key={tab.id}>
            {index > 0 ? (
              <span
                style={{
                  color: T.faint,
                  padding: "0 8px",
                  fontWeight: 600,
                  userSelect: "none",
                }}
                aria-hidden
              >
                ·
              </span>
            ) : null}
            <button
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
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "inherit",
                fontWeight: "inherit",
                color: activeTab === tab.id ? T.ink : T.muted,
                whiteSpace: "nowrap",
                transition: "color 120ms",
              }}
            >
              {tab.label}
              {suffixForTab?.(tab.id) ?? ""}
            </button>
          </React.Fragment>
        ))}
      </div>
      <div
        style={{
          fontSize: 14,
          color: T.azure,
          fontWeight: 500,
          lineHeight: 1,
          padding: "2px 4px",
          flexShrink: 0,
        }}
        aria-hidden
      >
        →
      </div>
    </div>
  );
}

function BenchmarkPlaceholder() {
  return (
    <div
      style={{
        padding: "24px 16px 28px",
        fontSize: 13,
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
}: {
  currencySuffix: string;
  primary: FinancialMetricSection;
  benchmarkData: BenchmarkPeersData | null;
  hasIncomeStatement: boolean;
  incomeStatementRows: IncomeStatementRow[];
  incomeStatementCurrency: string;
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
    <LinkPanel>
      <TabHeader
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        suffixForTab={(id) => (id === "metrics" ? currencySuffix : undefined)}
      />
      {activeTab === "metrics" ? (
        <MetricSectionBody section={primary} />
      ) : activeTab === "benchmark" ? (
        benchmarkData ? (
          <BenchmarkTabBody data={benchmarkData} />
        ) : (
          <BenchmarkPlaceholder />
        )
      ) : activeTab === "income" && hasIncomeStatement ? (
        <IncomeStatementTable
          rows={incomeStatementRows}
          currency={incomeStatementCurrency}
        />
      ) : (
        <MetricSectionBody section={primary} />
      )}
    </LinkPanel>
  );
}

function SecondaryFinCard({
  subscription,
  other,
}: {
  subscription: FinancialMetricSection;
  other: FinancialMetricSection;
}) {
  const tabs: { id: SecondaryFinTab; label: string }[] = [
    { id: "subscription", label: "Subscription Metrics" },
    { id: "other", label: "Other Metrics" },
  ];

  const [activeTab, setActiveTab] = useState<SecondaryFinTab>("subscription");

  return (
    <LinkPanel>
      <TabHeader tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === "subscription" ? (
        <MetricSectionBody section={subscription} />
      ) : (
        <MetricSectionBody section={other} />
      )}
    </LinkPanel>
  );
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
