  "use client";

  import React, { useState } from "react";
  import type {
    FiBenchmarkMetricRow,
    FiCompanyRow,
    FiHeadlineMetric,
    FiMetricDirectionHint,
    FiMetricFormat,
    FiMetricKey,
  } from "@/lib/financialIntelligence/types";
  import { FI_BENCHMARK_SECTIONS, getMetricValue } from "@/lib/financialIntelligence/calculations";
  import {
    FI_SOURCE_TYPES_UI_ORDER,
    getMetricSourceType,
    sourceTypeColor,
    type FiMetricSourceType,
  } from "@/lib/financialIntelligence/sourceTypes";
  import { PercentileBar, PctPill } from "./benchmark-viz";
  import { fmtFiMetric, SourceColoredValue } from "./SourceTypeValue";

  const FONT = "var(--font-sans)";

  const fmtMetric = fmtFiMetric;

  function MetricValueWithSource({
    value,
    format,
    sourceType,
    fontWeight,
  }: {
    value: number | null;
    format: FiMetricFormat;
    sourceType?: FiMetricSourceType | null;
    fontWeight?: number;
  }) {
    return (
      <SourceColoredValue
        value={value}
        format={format}
        sourceType={sourceType}
        fontWeight={fontWeight ?? 600}
      />
    );
  }

  function metricDirectionLabel(
    higherIsBetter: boolean,
    directionHint?: FiMetricDirectionHint
  ): string {
    if (higherIsBetter) return "↑ better";
    if (directionHint === "lower_better") return "↓ lower better";
    return "↓ cheaper";
  }

  function fmtDelta(
    delta: number | null,
    format: FiMetricFormat,
    higherIsBetter: boolean
  ): { text: string; positive: boolean | null } {
    if (delta == null || !Number.isFinite(delta)) return { text: "—", positive: null };
    const sign = delta > 0 ? "+" : "";
    let text: string;
    if (format === "percent") text = `${sign}${delta.toFixed(1)}pts vs median`;
    else if (format === "currency") text = `${sign}$${Math.abs(delta).toFixed(0)}m vs median`;
    else if (format === "currency_k") text = `${sign}$${Math.abs(Math.round(delta / 1000))}k vs median`;
    else if (format === "count") text = `${sign}${Math.round(delta).toLocaleString()} vs median`;
    else text = `${sign}${delta.toFixed(1)}x vs median`;
    const positive = higherIsBetter ? delta >= 0 : delta <= 0;
    return { text, positive };
  }

  function fmtSigned(delta: number, format: FiMetricFormat): string {
    const sign = delta > 0 ? "+" : "";
    if (format === "currency") return `${sign}$${Math.abs(delta).toFixed(0)}m`;
    if (format === "currency_k") return `${sign}$${Math.abs(Math.round(delta / 1000))}k`;
    if (format === "count") return `${sign}${Math.round(delta).toLocaleString()}`;
    if (format === "percent") return `${sign}${delta.toFixed(1)}%`;
    return `${sign}${delta.toFixed(1)}x`;
  }

  function MetricBreakdown({
    row,
    target,
    peers,
    isLast,
  }: {
    row: FiBenchmarkMetricRow;
    target: FiCompanyRow;
    peers: FiCompanyRow[];
    isLast: boolean;
  }) {
    const metricKey = row.key as FiMetricKey;
    const list = [
      {
        id: target.company_id,
        name: target.company_name,
        value: row.targetValue,
        sourceType: getMetricSourceType(target, metricKey),
        isTarget: true,
      },
      ...peers.map((peer) => ({
        id: peer.company_id,
        name: peer.company_name,
        value: getMetricValue(peer, metricKey),
        sourceType: getMetricSourceType(peer, metricKey),
        isTarget: false,
      })),
    ].filter(
      (entry): entry is typeof entry & { value: number } =>
        entry.value != null && Number.isFinite(entry.value)
    );

    list.sort((a, b) =>
      row.higherIsBetter ? b.value - a.value : a.value - b.value
    );

    if (list.length === 0) {
      return (
        <div
          style={{
            background: "var(--ax-gray-25)",
            borderBottom: isLast ? "none" : "1px solid var(--ax-gray-100)",
            padding: "12px 16px 14px 38px",
            fontSize: 12,
            color: "var(--fg-4)",
            fontStyle: "italic",
            fontFamily: FONT,
          }}
        >
          No values reported for this metric.
        </div>
      );
    }

    const values = list.map((entry) => entry.value);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const span = hi - lo || 1;
    const median = row.peerMedian;

    let dividerAt = -1;
    if (median != null) {
      for (let i = 0; i < list.length; i++) {
        const worseThanMedian = row.higherIsBetter
          ? list[i].value < median
          : list[i].value > median;
        if (worseThanMedian) {
          dividerAt = i;
          break;
        }
      }
    }

    const items: React.ReactNode[] = [];
    list.forEach((entry, index) => {
      if (index === dividerAt) {
        items.push(
          <div
            key="median-divider"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 0 5px 36px",
            }}
          >
            <span style={{ flex: 1, height: 0, borderTop: "1px dashed var(--ax-gray-400)" }} />
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: "var(--fg-3)",
                whiteSpace: "nowrap",
              }}
            >
              Peer median · {fmtMetric(median, row.format)}
            </span>
            <span style={{ flex: 1, height: 0, borderTop: "1px dashed var(--ax-gray-400)" }} />
          </div>
        );
      }

      const fill = Math.max(2, ((entry.value - lo) / span) * 100);
      items.push(
        <div
          key={entry.id}
          style={{
            display: "grid",
            gridTemplateColumns: "26px 172px 1fr 76px",
            alignItems: "center",
            gap: 10,
            padding: "5px 0",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "var(--fg-4)",
              fontVariantNumeric: "tabular-nums",
              textAlign: "right",
            }}
          >
            {index + 1}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: entry.isTarget ? 700 : 500,
                color: "var(--fg-1)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {entry.name}
            </span>
            {entry.isTarget && (
              <span
                style={{
                  fontSize: 8.5,
                  fontWeight: 700,
                  color: "var(--ax-cyan-700)",
                  letterSpacing: "0.05em",
                  background: "var(--ax-cyan-50)",
                  border: "1px solid var(--border-brand)",
                  borderRadius: 3,
                  padding: "0 4px",
                  flexShrink: 0,
                }}
              >
                TARGET
              </span>
            )}
          </span>
          <span style={{ position: "relative", height: 8, background: "var(--ax-gray-100)", borderRadius: 4 }}>
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${fill}%`,
                borderRadius: 4,
                background: entry.isTarget ? "var(--ax-positive)" : "var(--ax-gray-300)",
              }}
            />
          </span>
          <span
            style={{
              fontSize: 12.5,
              fontWeight: entry.isTarget ? 700 : 600,
              textAlign: "right",
            }}
          >
            <SourceColoredValue
              value={entry.value}
              format={row.format}
              sourceType={entry.sourceType}
              fontWeight={entry.isTarget ? 700 : 600}
              fontSize={12.5}
            />
          </span>
        </div>
      );
    });

    return (
      <div
        style={{
          background: "var(--ax-gray-25)",
          borderBottom: isLast ? "none" : "1px solid var(--ax-gray-100)",
          padding: "12px 16px 14px 38px",
          fontFamily: FONT,
        }}
      >
        <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginBottom: 9 }}>
          All{" "}
          <strong style={{ color: "var(--fg-1)" }}>{list.length}</strong> companies ranked by{" "}
          {row.label} — {target.company_name} sits{" "}
          <strong style={{ color: "var(--fg-1)" }}>
            #{row.rank ?? "—"}
          </strong>{" "}
          of {row.rankTotal ?? list.length}
          {row.deltaVsMedian != null && (
            <span>
              ,{" "}
              <strong style={{ color: "var(--fg-1)" }}>
                {fmtSigned(row.deltaVsMedian, row.format)}
              </strong>{" "}
              vs the peer median
            </span>
          )}
          .
        </div>
        <div style={{ maxHeight: 300, overflowY: "auto", paddingRight: 4 }}>{items}</div>
      </div>
    );
  }

  interface CompositeHeroProps {
    compositePercentile: number | null;
    targetName?: string;
    peerCount?: number;
  }

  export function CompositeHero({
    compositePercentile,
    targetName,
    peerCount,
  }: CompositeHeroProps) {
    const score = compositePercentile ?? 0;
    const tooltip =
      "Equal-weight average of all metric percentiles where the target has a value. " +
      "Example: if Revenue growth is at the 70th percentile and EBITDA margin at the 50th, " +
      "those scores are averaged with every other ranked metric.";

    return (
      <div
        style={{
          background: "linear-gradient(165deg, var(--ax-cyan-900), var(--ax-cyan-950))",
          color: "white",
          borderRadius: "var(--r-lg)",
          padding: "16px 18px",
          minHeight: 132,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily: FONT,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              Composite percentile
            </div>
            <span
              title={tooltip}
              aria-label={tooltip}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 16,
                height: 16,
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.35)",
                color: "rgba(255,255,255,0.85)",
                fontSize: 10,
                fontWeight: 700,
                cursor: "help",
                flexShrink: 0,
              }}
            >
              i
            </span>
          </div>
          {targetName != null && peerCount != null && (
            <div style={{ fontSize: "var(--fs-12)", color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
              {targetName} vs {peerCount} peers
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 10 }}>
          <span
            style={{
              fontSize: "var(--fs-40)",
              fontWeight: 800,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {compositePercentile ?? "—"}
          </span>
          {compositePercentile != null && (
            <span style={{ fontSize: "var(--fs-16)", fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
              / 100
            </span>
          )}
        </div>
        <div
          style={{
            marginTop: 10,
            height: 6,
            background: "rgba(255,255,255,0.15)",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${score}%`,
              height: "100%",
              background: "var(--ax-cyan-400)",
              borderRadius: 3,
            }}
          />
        </div>
      </div>
    );
  }

  export function HeadlineMetricCards({ metrics }: { metrics: FiHeadlineMetric[] }) {
    return (
      <>
        {metrics.map((metric) => {
          const delta = fmtDelta(metric.deltaVsMedian, metric.format, metric.higherIsBetter);
          return (
            <div
              key={metric.key}
              style={{
                background: "white",
                border: "1px solid var(--border-1)",
                borderRadius: "var(--r-lg)",
                padding: "14px 16px",
                minHeight: 132,
                display: "flex",
                flexDirection: "column",
                fontFamily: FONT,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div
                  style={{
                    fontSize: "var(--fs-13)",
                    fontWeight: 600,
                    color: "var(--fg-3)",
                  }}
                >
                  {metric.label}
                </div>
                <PctPill pct={metric.percentile} small />
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
                <SourceColoredValue
                  value={metric.targetValue}
                  format={metric.format}
                  sourceType={metric.targetSourceType}
                  dotAfter={false}
                  fontWeight={700}
                  fontSize="var(--fs-28)"
                  justify="flex-start"
                />
                {delta.positive != null && (
                  <span
                    style={{
                      fontSize: "var(--fs-13)",
                      fontWeight: 600,
                      color: delta.positive ? "var(--ax-positive)" : "var(--ax-negative)",
                    }}
                  >
                    {delta.text.split(" vs")[0]}{" "}
                    <span style={{ color: "var(--fg-4)", fontWeight: 500 }}>vs median</span>
                  </span>
                )}
              </div>
              <div style={{ marginTop: 14 }}>
                <PercentileBar pct={metric.percentile} />
              </div>
            </div>
          );
        })}
      </>
    );
  }

  interface BenchmarkTableProps {
    rows: FiBenchmarkMetricRow[];
    targetName: string;
    target: FiCompanyRow;
    peers: FiCompanyRow[];
  }

  const SCORECARD_COLS = "180px 92px 92px 1fr 96px 92px";

  export function BenchmarkTable({ rows, targetName, target, peers }: BenchmarkTableProps) {
    const [openMetricKey, setOpenMetricKey] = useState<string | null>(null);

    const th: React.CSSProperties = {
      fontSize: 10.5,
      fontWeight: 700,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: "var(--fg-3)",
      fontFamily: FONT,
      minWidth: 0,
    };

    const rowByKey = new Map(rows.map((row) => [String(row.key), row]));

    const renderMetricRow = (
      row: FiBenchmarkMetricRow,
      index: number,
      sectionLength: number,
      isLastSection: boolean
    ) => {
      const delta = fmtDelta(row.deltaVsMedian, row.format, row.higherIsBetter);
      const isLastInSection = index === sectionLength - 1;
      const isLastOverall = isLastSection && isLastInSection;
      const isOpen = openMetricKey === String(row.key);
      const rowBorder = isOpen || !isLastOverall ? "1px solid var(--ax-gray-100)" : "none";

      return (
        <React.Fragment key={String(row.key)}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setOpenMetricKey(isOpen ? null : String(row.key))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpenMetricKey(isOpen ? null : String(row.key));
              }
            }}
            onMouseEnter={(e) => {
              if (!isOpen) e.currentTarget.style.background = "var(--ax-gray-25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isOpen ? "var(--ax-gray-25)" : "transparent";
            }}
            style={{
              display: "grid",
              gridTemplateColumns: SCORECARD_COLS,
              alignItems: "center",
              padding: "11px 16px",
              borderBottom: rowBorder,
              cursor: "pointer",
              background: isOpen ? "var(--ax-gray-25)" : "transparent",
            }}
          >
            <div style={{ fontSize: "var(--fs-13)", color: "var(--fg-2)", minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  color: "var(--fg-1)",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    flexShrink: 0,
                    transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 120ms",
                    color: "var(--fg-4)",
                  }}
                >
                  ›
                </span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {row.label}
                </span>
                <span style={{ fontSize: 10, color: "var(--fg-4)", fontWeight: 500, flexShrink: 0 }}>
                  {metricDirectionLabel(row.higherIsBetter, row.directionHint)}
                </span>
              </div>
            </div>
            <div
              style={{
                textAlign: "right",
                fontWeight: 600,
                fontSize: "var(--fs-13)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <MetricValueWithSource
                value={row.targetValue}
                format={row.format}
                sourceType={row.targetSourceType}
              />
            </div>
            <div
              style={{
                textAlign: "right",
                color: "var(--fg-3)",
                fontSize: "var(--fs-13)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <div>{fmtMetric(row.peerMedian, row.format)}</div>
              {delta.positive != null && (
                <div
                  style={{
                    fontSize: 10,
                    marginTop: 2,
                    color: delta.positive ? "var(--ax-positive)" : "var(--ax-negative)",
                  }}
                >
                  {delta.text.split(" vs")[0]}
                </div>
              )}
            </div>
            <div style={{ paddingLeft: 16, paddingRight: 8 }} onClick={(e) => e.stopPropagation()}>
              <PercentileBar
                pct={row.percentile}
                height={14}
                showNumber={false}
                showScale={false}
              />
            </div>
            <div style={{ textAlign: "center" }}>
              <PctPill pct={row.percentile} />
            </div>
            <div
              style={{
                textAlign: "center",
                fontSize: "var(--fs-13)",
                color: "var(--fg-2)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {row.rank != null && row.rankTotal != null ? (
                <>
                  <strong style={{ color: "var(--fg-1)", fontWeight: 700 }}>#{row.rank}</strong>{" "}
                  <span style={{ color: "var(--fg-4)" }}>/ {row.rankTotal}</span>
                </>
              ) : (
                "—"
              )}
            </div>
          </div>
          {isOpen && (
            <MetricBreakdown row={row} target={target} peers={peers} isLast={isLastOverall} />
          )}
        </React.Fragment>
      );
    };

    return (
      <div
        style={{
          background: "white",
          border: "1px solid var(--border-1)",
          borderRadius: "var(--r-lg)",
          overflow: "auto",
          fontFamily: FONT,
        }}
      >
        <div style={{ minWidth: 760 }}>
          {/* Header — single row, same nested grid as data rows */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: SCORECARD_COLS,
              alignItems: "center",
              padding: "10px 16px",
              borderBottom: "1px solid var(--border-1)",
              background: "var(--ax-gray-25)",
            }}
          >
            <div style={th}>Metric</div>
            <div
              style={{ ...th, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
              title={targetName}
            >
              {targetName}
            </div>
            <div style={{ ...th, textAlign: "right" }}>Peer median</div>
            <div style={{ ...th, paddingLeft: 16 }}>Ranking</div>
            <div style={{ ...th, textAlign: "center" }}>Percentile</div>
            <div style={{ ...th, textAlign: "center" }}>Rank</div>
          </div>

          {FI_BENCHMARK_SECTIONS.map((section, sectionIndex) => {
            const sectionRows = section.keys
              .map((key) => rowByKey.get(key))
              .filter((row): row is FiBenchmarkMetricRow => row != null);
            if (sectionRows.length === 0) return null;
            const isLastSection = sectionIndex === FI_BENCHMARK_SECTIONS.length - 1;

            return (
              <React.Fragment key={section.id}>
                <div
                  style={{
                    padding: "8px 16px",
                    background: "var(--ax-gray-50)",
                    borderBottom: "1px solid var(--border-1)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--fg-3)",
                  }}
                >
                  {section.label}
                </div>
                {sectionRows.map((row, index) =>
                  renderMetricRow(row, index, sectionRows.length, isLastSection)
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "10px 16px",
            fontSize: 11.5,
            color: "var(--fg-3)",
            flexWrap: "wrap",
            borderTop: "1px solid var(--border-1)",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "var(--ax-positive)",
                border: "2px solid white",
                boxShadow: "0 0 0 1px var(--ax-positive)",
              }}
            />
            Target
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 28,
                height: 8,
                borderRadius: 4,
                background:
                  "linear-gradient(90deg, #EAF6F0 0%, #BEE4D2 28%, #79C9A5 56%, #2C9970 82%, #0E7A50 100%)",
              }}
            />
            0th → 100th percentile
          </span>
          <span style={{ flexBasis: "100%", fontSize: 11, color: "var(--fg-4)" }}>
            Pure ranking read — higher is always better (multiples and churn inverted — lower =
            better).
          </span>
          <span
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            {FI_SOURCE_TYPES_UI_ORDER.map((type) => (
              <span key={type} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: sourceTypeColor(type),
                  }}
                />
                {type}
              </span>
            ))}
          </span>
        </div>
      </div>
    );
  }

  /** @deprecated Use CompositeHero + HeadlineMetricCards */
  export function HeadStatCards({
    compositePercentile,
    peerCount,
    isDefaultMode,
    targetFinancialYear,
  }: {
    compositePercentile: number | null;
    peerCount: number;
    isDefaultMode: boolean;
    targetFinancialYear: number | null;
  }) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, fontFamily: FONT }}>
        <CompositeHero compositePercentile={compositePercentile} />
        <div style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: "white", border: "1px solid var(--border-1)", borderRadius: "var(--r-lg)", padding: 16 }}>
            <div style={{ fontSize: 10, color: "var(--fg-3)", fontWeight: 700 }}>PEERS</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{peerCount}</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
              {isDefaultMode ? "Default peer set" : "Filtered peer set"}
            </div>
          </div>
          <div style={{ background: "white", border: "1px solid var(--border-1)", borderRadius: "var(--r-lg)", padding: 16 }}>
            <div style={{ fontSize: 10, color: "var(--fg-3)", fontWeight: 700 }}>TARGET FY</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>
              {targetFinancialYear ? `FY${targetFinancialYear}` : "—"}
            </div>
          </div>
        </div>
      </div>
    );
  }
