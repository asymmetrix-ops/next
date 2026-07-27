"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import {
  CARD_HEADER_BAR_STYLE,
  CARD_TITLE_STYLE,
  LinkPanel,
  T,
  tableColHeaderBarStyle,
  tableColHeaderStyle,
} from "@/components/redesign/primitives";
import { SourceTypeDot } from "@/app/financial-intelligence/components/SourceTypeValue";
import {
  DEFAULT_FI_SOURCE_TYPES,
  FI_SOURCE_TYPES,
  FI_SOURCE_TYPES_UI_ORDER,
  SOURCE_TYPE_DESCRIPTIONS,
  sourceTypeColor,
  type FiMetricSourceType,
} from "@/lib/financialIntelligence/sourceTypes";
import {
  buildCompanyFinancialsViewModel,
  formatFiscalYearHeader,
  getVisibleFinancialsCellDisplay,
  type CompanyFinancialMetricsCardRow,
  type CompanyFinancialsViewModel,
  type FinancialsCardDef,
  type FinancialsCellValue,
} from "@/lib/companyFinancialMetricsCard";
import {
  exportAllFinancialMetrics,
  exportCurrentFinancialView,
  exportFinancialCard,
} from "@/lib/companyFinancialsExport";

type Props = {
  rows: CompanyFinancialMetricsCardRow[];
  loading: boolean;
  companyName: string;
};

type ExportMenuScope = "global" | FinancialsCardDef["id"];

function ExportMenu({
  scope,
  onExportAll,
  onExportScoped,
  scopedLabel,
  scopedDescription,
}: {
  scope: ExportMenuScope;
  onExportAll: () => void;
  onExportScoped: () => void;
  scopedLabel: string;
  scopedDescription: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const buttonLabel = scope === "global" ? "Export all metrics" : "Export";

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: scope === "global" ? "8px 12px" : "6px 10px",
          borderRadius: T.r,
          border: `1px solid ${T.hair}`,
          background: T.panel,
          color: T.body,
          fontFamily: T.sans,
          fontSize: 12.5,
          fontWeight: 500,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <ArrowUpTrayIcon width={14} height={14} aria-hidden />
        {buttonLabel}
        <ChevronDownIcon width={12} height={12} aria-hidden />
      </button>
      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 240,
            background: T.panel,
            border: `1px solid ${T.hair}`,
            borderRadius: T.rLg,
            boxShadow: "0 10px 30px rgba(15,17,21,0.08)",
            zIndex: 20,
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => {
              onExportAll();
              setOpen(false);
            }}
            style={exportMenuItemStyle}
          >
            <span style={{ fontWeight: 600, color: T.ink }}>Export all metrics</span>
            <span style={exportMenuSubtextStyle}>
              {scope === "global"
                ? "Every card in this section"
                : "Every card in this section"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              onExportScoped();
              setOpen(false);
            }}
            style={exportMenuItemStyle}
          >
            <span style={{ fontWeight: 600, color: T.ink }}>{scopedLabel}</span>
            <span style={exportMenuSubtextStyle}>{scopedDescription}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

const exportMenuItemStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 2,
  width: "100%",
  padding: "12px 14px",
  border: "none",
  background: "transparent",
  textAlign: "left",
  cursor: "pointer",
  fontFamily: T.sans,
  fontSize: 12.5,
};

const exportMenuSubtextStyle: React.CSSProperties = {
  color: T.muted,
  fontSize: 11.5,
  lineHeight: 1.35,
};

function SourceLegend({
  allowedSources,
  onToggleSourceType,
  disabled,
}: {
  allowedSources: FiMetricSourceType[];
  onToggleSourceType: (type: FiMetricSourceType) => void;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            ...tableColHeaderStyle,
            marginBottom: 10,
          }}
        >
          Data Source
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {FI_SOURCE_TYPES_UI_ORDER.map((type) => {
            const checked = allowedSources.includes(type);
            const isDisabled =
              disabled || (checked && allowedSources.length <= 1);
            return (
              <label
                key={type}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: T.rLg,
                  border: `1px solid ${T.hair}`,
                  background: T.panel,
                  minWidth: 180,
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  opacity: isDisabled && !checked ? 0.55 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isDisabled}
                  onChange={() => onToggleSourceType(type)}
                  style={{
                    marginTop: 3,
                    accentColor: sourceTypeColor(type),
                    flexShrink: 0,
                  }}
                />
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontFamily: T.sans,
                      fontSize: 13,
                      fontWeight: 600,
                      color: sourceTypeColor(type),
                    }}
                  >
                    <SourceTypeDot type={type} size={8} />
                    {type}
                  </span>
                  <span
                    style={{
                      display: "block",
                      marginTop: 2,
                      fontFamily: T.sans,
                      fontSize: 11.5,
                      color: T.muted,
                      lineHeight: 1.35,
                    }}
                  >
                    {SOURCE_TYPE_DESCRIPTIONS[type]}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MetricValueCell({
  cell,
  allowedSources,
}: {
  cell: FinancialsCellValue;
  allowedSources: FiMetricSourceType[];
}) {
  const display = getVisibleFinancialsCellDisplay(cell, allowedSources);
  const color = cell.sourceType ? sourceTypeColor(cell.sourceType) : T.body;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontFamily: T.sans,
        fontSize: 13,
        fontWeight: display === "-" ? 400 : 600,
        color: display === "-" ? T.muted : color,
        minWidth: 0,
      }}
    >
      {display}
      {display !== "-" && cell.sourceType ? (
        <SourceTypeDot type={cell.sourceType} size={7} />
      ) : null}
    </span>
  );
}

function FinancialsMetricsCard({
  card,
  years,
  allowedSources,
  companyName,
  model,
  collapsed,
  onToggleCollapsed,
}: {
  card: CompanyFinancialsViewModel["cards"][number];
  years: number[];
  allowedSources: FiMetricSourceType[];
  companyName: string;
  model: CompanyFinancialsViewModel;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const gridTemplate = `minmax(180px, 1.4fr) repeat(${years.length}, minmax(88px, 1fr))`;

  return (
    <LinkPanel style={{ marginBottom: 16 }}>
      <div style={CARD_HEADER_BAR_STYLE}>
        <button
          type="button"
          onClick={onToggleCollapsed}
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
          <span style={CARD_TITLE_STYLE}>{card.title}</span>
          <span
            style={{
              fontFamily: T.sans,
              fontSize: 12,
              color: T.muted,
              fontWeight: 500,
            }}
          >
            {card.metrics.length} metrics
          </span>
        </button>
        <ExportMenu
          scope={card.id}
          onExportAll={() => exportAllFinancialMetrics(model, companyName)}
          onExportScoped={() =>
            exportFinancialCard(model, card.id, null, companyName)
          }
          scopedLabel="Export this card only"
          scopedDescription={`${card.title} — ${card.metrics.length} metrics`}
        />
      </div>

      {!collapsed ? (
        <>
          <div
            style={{
              ...tableColHeaderBarStyle,
              gridTemplateColumns: gridTemplate,
            }}
          >
            <span>Metric</span>
            {years.map((year) => (
              <span key={year} style={{ textAlign: "center" }}>
                {formatFiscalYearHeader(year)}
              </span>
            ))}
          </div>
          {card.metrics.map((metric, index) => (
            <div
              key={metric.key}
              style={{
                display: "grid",
                gridTemplateColumns: gridTemplate,
                alignItems: "center",
                padding: "12px 16px",
                borderBottom:
                  index === card.metrics.length - 1
                    ? "none"
                    : `1px solid ${T.hair}`,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontFamily: T.sans,
                  fontSize: 13,
                  color: T.body,
                  minWidth: 0,
                }}
              >
                {metric.label}
              </span>
              {years.map((year) => (
                <div
                  key={`${metric.key}-${year}`}
                  style={{ display: "flex", justifyContent: "center" }}
                >
                  <MetricValueCell
                    cell={metric.cellsByYear[year]}
                    allowedSources={allowedSources}
                  />
                </div>
              ))}
            </div>
          ))}
        </>
      ) : null}
    </LinkPanel>
  );
}

export function CompanyFinancialsSection({ rows, loading, companyName }: Props) {
  const [allowedSources, setAllowedSources] = useState<FiMetricSourceType[]>([
    ...DEFAULT_FI_SOURCE_TYPES,
  ]);
  const [collapsedCards, setCollapsedCards] = useState<
    Record<FinancialsCardDef["id"], boolean>
  >({
    financial: false,
    subscription: false,
    other: false,
  });

  const model = useMemo(
    () => buildCompanyFinancialsViewModel(rows),
    [rows]
  );

  const toggleSourceType = useCallback((type: FiMetricSourceType) => {
    setAllowedSources((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(type)) {
        if (nextSet.size <= 1) return prev;
        nextSet.delete(type);
      } else {
        nextSet.add(type);
      }
      return FI_SOURCE_TYPES.filter((item) => nextSet.has(item));
    });
  }, []);

  const toggleCard = useCallback((cardId: FinancialsCardDef["id"]) => {
    setCollapsedCards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  }, []);

  if (loading) {
    return (
      <div
        style={{
          padding: "48px 0",
          textAlign: "center",
          color: T.muted,
          fontFamily: T.sans,
          fontSize: 14,
        }}
      >
        Loading financial metrics…
      </div>
    );
  }

  if (model.years.length === 0) {
    return (
      <div
        style={{
          padding: "48px 0",
          textAlign: "center",
          color: T.muted,
          fontFamily: T.sans,
          fontSize: 14,
        }}
      >
        No financial metrics available for this company.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 420px", minWidth: 0 }}>
          <SourceLegend
            allowedSources={allowedSources}
            onToggleSourceType={toggleSourceType}
          />
        </div>
        <div style={{ flexShrink: 0, paddingTop: 24 }}>
          <ExportMenu
            scope="global"
            onExportAll={() => exportAllFinancialMetrics(model, companyName)}
            onExportScoped={() =>
              exportCurrentFinancialView(model, allowedSources, companyName)
            }
            scopedLabel="Export current view"
            scopedDescription="Only values visible with current data source filters"
          />
        </div>
      </div>

      {model.cards.map((card) => (
        <FinancialsMetricsCard
          key={card.id}
          card={card}
          years={model.years}
          allowedSources={allowedSources}
          companyName={companyName}
          model={model}
          collapsed={collapsedCards[card.id]}
          onToggleCollapsed={() => toggleCard(card.id)}
        />
      ))}
    </div>
  );
}
