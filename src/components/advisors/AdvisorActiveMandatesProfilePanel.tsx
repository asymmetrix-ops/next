"use client";

import React from "react";
import Link from "next/link";
import { LinkedH, Pill, T, profileTableCellStyle } from "@/components/redesign/primitives";
import { HoverTooltip } from "@/components/ui/HoverTooltip";
import { formatCurrency } from "@/utils/advisorHelpers";
import type { AdvisorActiveMandate } from "@/types/advisor";

type Props = {
  mandates: AdvisorActiveMandate[];
  fillGridCell?: boolean;
};

const COL_WIDTHS = ["19%", "27%", "14%", "20%", "20%"] as const;

const thBase: React.CSSProperties = {
  fontFamily: T.sans,
  fontSize: 8.5,
  fontWeight: 600,
  color: T.muted,
  textTransform: "uppercase",
  letterSpacing: 0.3,
  lineHeight: 1.2,
  padding: "5px 4px",
  borderBottom: `1px solid ${T.hair}`,
  borderRight: `1px solid ${T.divider}`,
  background: T.paper,
  verticalAlign: "middle",
  textAlign: "center",
};

const tdBase: React.CSSProperties = {
  padding: "6px 4px",
  borderBottom: `1px solid ${T.hair}`,
  borderRight: `1px solid ${T.divider}`,
  verticalAlign: "middle",
  fontSize: 11,
  lineHeight: 1.3,
  textAlign: "center",
};

function isInvalidSource(source: string | null | undefined): boolean {
  if (!source) return true;
  const v = source.trim().toLowerCase();
  return v === "" || v === "null" || v === "nan";
}

function formatMetricValue(
  value: number | string | null | undefined,
  currency: string | null | undefined,
  year: number | string | null | undefined
): string | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(num)) return null;
  const cur = (currency || "").trim();
  const base = cur ? formatCurrency(String(num), cur) : `${Math.round(num).toLocaleString()}M`;
  const yr = year != null && String(year).trim() !== "" ? String(year).trim() : null;
  return yr ? `${base} (${yr})` : base;
}

function SourceBadge({ source }: { source: string | null | undefined }) {
  if (isInvalidSource(source)) return null;
  const src = source!.trim();
  const isEstimate = src.startsWith("http");
  const label = isEstimate ? "Est." : "Src";
  const title = isEstimate ? `Estimate — source: ${src}` : `Source: ${src}`;

  const badge = (
    <span
      tabIndex={0}
      style={{
        fontSize: 8.5,
        fontWeight: 600,
        lineHeight: 1.2,
        padding: "1px 4px",
        borderRadius: 3,
        cursor: "help",
        color: isEstimate ? "#b45309" : T.azure,
        border: `1px solid ${isEstimate ? "#fcd34d" : T.azureSoft}`,
        background: isEstimate ? "#fffbeb" : T.azureSoft,
      }}
    >
      {label}
    </span>
  );

  return <HoverTooltip content={title}>{badge}</HoverTooltip>;
}

function MetricCell({
  value,
  currency,
  year,
  source,
}: {
  value: number | string | null | undefined;
  currency: string | null | undefined;
  year: number | string | null | undefined;
  source: string | null | undefined;
}) {
  const formatted = formatMetricValue(value, currency, year);
  if (!formatted) {
    return <span style={{ color: T.faint }}>—</span>;
  }
  const badge = <SourceBadge source={source} />;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        width: "100%",
      }}
    >
      <span
        style={{
        fontSize: 10.5,
        fontWeight: 600,
          color: T.ink,
          fontFamily: T.mono,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {formatted}
      </span>
      {badge}
    </div>
  );
}

export function AdvisorActiveMandatesProfilePanel({ mandates, fillGridCell }: Props) {
  const count = mandates.length;

  const headers = ["Company", "Status", "Stage", "Revenue", "EV"];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: fillGridCell ? 0 : undefined,
        flex: fillGridCell ? 1 : undefined,
        height: fillGridCell ? "100%" : undefined,
        overflow: "hidden",
      }}
    >
      <LinkedH
        right={
          count > 0 ? (
            <span style={{ fontSize: 11, color: T.muted, fontWeight: 500 }}>
              {count} active
            </span>
          ) : undefined
        }
      >
        Active Mandates
      </LinkedH>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          marginTop: 4,
          padding: "0 2px 2px",
          ...profileTableCellStyle,
        }}
      >
        {count === 0 ? (
          <div
            style={{
              padding: "20px 12px",
              color: T.muted,
              fontSize: 12.5,
              textAlign: "center",
              fontFamily: T.sans,
            }}
          >
            No active mandates on Deal Radar
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              tableLayout: "fixed",
              borderCollapse: "collapse",
              border: `1px solid ${T.divider}`,
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            <colgroup>
              {COL_WIDTHS.map((w) => (
                <col key={w} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    style={{
                      ...thBase,
                      borderRight:
                        i === headers.length - 1 ? "none" : `1px solid ${T.divider}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mandates.map((row) => {
                const statusLabel =
                  (row.transaction_status || "").trim() ||
                  (row.transaction_status_id != null
                    ? String(row.transaction_status_id)
                    : "—");

                return (
                  <tr key={`${row.company_id}-${row.transaction_status_id}`}>
                    <td
                      style={{
                        ...tdBase,
                        textAlign: "left",
                        paddingLeft: 8,
                        paddingRight: 4,
                      }}
                    >
                      <Link
                        href={`/company/${row.company_id}`}
                        prefetch={false}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: T.azure,
                          textDecoration: "underline",
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={(row.company_name || "").trim()}
                      >
                        {(row.company_name || "").trim() || `Company ${row.company_id}`}
                      </Link>
                    </td>
                    <td style={tdBase}>
                      <Pill
                        tone="neutral"
                        style={{
                          fontSize: 9,
                          height: "auto",
                          minHeight: 18,
                          maxWidth: "100%",
                          padding: "2px 5px",
                          lineHeight: 1.25,
                          whiteSpace: "normal",
                          display: "inline-flex",
                          justifyContent: "center",
                          textAlign: "center",
                        }}
                      >
                        {statusLabel}
                      </Pill>
                    </td>
                    <td style={tdBase}>
                      {row.process_stage ? (
                        <Pill
                          tone="lavender"
                          style={{
                            fontSize: 9,
                            height: "auto",
                            padding: "2px 5px",
                            lineHeight: 1.25,
                            maxWidth: "100%",
                            whiteSpace: "normal",
                          }}
                        >
                          {row.process_stage}
                        </Pill>
                      ) : (
                        <span style={{ color: T.faint }}>—</span>
                      )}
                    </td>
                    <td style={tdBase}>
                      <MetricCell
                        value={row.revenue_m}
                        currency={row.revenue_currency}
                        year={row.revenue_year}
                        source={row.revenue_source}
                      />
                    </td>
                    <td style={{ ...tdBase, borderRight: "none" }}>
                      <MetricCell
                        value={row.ev}
                        currency={row.ev_currency}
                        year={row.ev_year}
                        source={row.ev_source}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
