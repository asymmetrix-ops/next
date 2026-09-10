"use client";

import React from "react";
import Link from "next/link";
import {
  LinkedH,
  Pill,
  T,
  PROFILE_EVENTS_ROW_GAP,
  PROFILE_EVENTS_ROW_PAD,
  profileTableCellStyle,
  profileTableColAlign,
  tableColHeaderBarStyle,
  tableColHeaderStyle,
} from "@/components/redesign/primitives";
import { HoverTooltip } from "@/components/ui/HoverTooltip";
import { formatCurrency } from "@/utils/advisorHelpers";
import type { AdvisorActiveMandate } from "@/types/advisor";

type Props = {
  mandates: AdvisorActiveMandate[];
  fillGridCell?: boolean;
};

const COL_GAP = PROFILE_EVENTS_ROW_GAP;

const ROW_GRID =
  "minmax(0, 1fr) minmax(0, 1.15fr) minmax(84px, auto) minmax(0, 0.9fr) minmax(84px, auto) minmax(0, 0.9fr)";

const HEADERS = [
  "Company",
  "Status",
  "Revenue",
  "Rev. source",
  "EV",
  "EV source",
] as const;

function colAlign(colIndex: number) {
  return profileTableColAlign(colIndex);
}

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

function sourceDisplayLabel(source: string): string {
  const src = source.trim();
  if (src.startsWith("http")) return "Estimate";
  if (src.length > 22) return `${src.slice(0, 20)}…`;
  return src;
}

function sourceTooltip(source: string): string {
  const src = source.trim();
  if (src.startsWith("http")) return `Estimate — source: ${src}`;
  return src;
}

function SourceCell({ source }: { source: string | null | undefined }) {
  if (isInvalidSource(source)) {
    return <span style={{ color: T.faint }}>—</span>;
  }

  const full = source!.trim();
  const label = sourceDisplayLabel(full);
  const tooltip = sourceTooltip(full);
  const needsTooltip = tooltip !== label;

  const text = (
    <span
      style={{
        color: T.body,
        fontSize: 12,
        lineHeight: 1.35,
        display: "block",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        maxWidth: "100%",
      }}
    >
      {label}
    </span>
  );

  if (!needsTooltip && !full.startsWith("http")) {
    return text;
  }

  return <HoverTooltip content={tooltip}>{text}</HoverTooltip>;
}

function MetricCell({
  value,
  currency,
  year,
}: {
  value: number | string | null | undefined;
  currency: string | null | undefined;
  year: number | string | null | undefined;
}) {
  const formatted = formatMetricValue(value, currency, year);
  if (!formatted) {
    return <span style={{ color: T.faint }}>—</span>;
  }

  return (
    <span
      style={{
        color: T.body,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
      }}
    >
      {formatted}
    </span>
  );
}

export function AdvisorActiveMandatesProfilePanel({ mandates, fillGridCell }: Props) {
  const count = mandates.length;

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
        }}
      >
        {count === 0 ? (
          <div
            style={{
              padding: "24px 16px",
              color: T.muted,
              fontSize: "12.5px",
              textAlign: "center",
              fontFamily: T.sans,
            }}
          >
            No active mandates on Deal Radar
          </div>
        ) : (
          <div style={{ width: "100%", minWidth: 0, ...profileTableCellStyle }}>
            <div
              style={{
                ...tableColHeaderBarStyle,
                gridTemplateColumns: ROW_GRID,
                gap: COL_GAP,
                padding: PROFILE_EVENTS_ROW_PAD.header,
              }}
            >
              {HEADERS.map((h, colIndex) => (
                <div
                  key={h}
                  style={{
                    ...tableColHeaderStyle,
                    textAlign: colAlign(colIndex),
                  }}
                >
                  {h}
                </div>
              ))}
            </div>

            {mandates.map((row, rowIndex) => {
              const isLastRow = rowIndex === mandates.length - 1;
              const statusLabel =
                (row.transaction_status || "").trim() ||
                (row.transaction_status_id != null
                  ? String(row.transaction_status_id)
                  : "—");

              return (
                <div
                  key={`${row.company_id}-${row.transaction_status_id}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: ROW_GRID,
                    gap: COL_GAP,
                    alignItems: "center",
                    padding: PROFILE_EVENTS_ROW_PAD.body,
                    borderBottom: isLastRow ? "none" : `1px solid ${T.hair}`,
                  }}
                >
                  <div style={{ textAlign: colAlign(0), minWidth: 0 }}>
                    <Link
                      href={`/company/${row.company_id}`}
                      prefetch={false}
                      title={(row.company_name || "").trim()}
                      style={{
                        color: T.azure,
                        textDecoration: "underline",
                        fontWeight: 500,
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {(row.company_name || "").trim() || `Company ${row.company_id}`}
                    </Link>
                  </div>

                  <div style={{ textAlign: colAlign(1), minWidth: 0 }}>
                    <Pill
                      tone="neutral"
                      style={{
                        fontSize: 12,
                        height: "auto",
                        minHeight: 24,
                        maxWidth: "100%",
                        padding: "0 10px",
                        lineHeight: 1.3,
                        whiteSpace: "normal",
                        display: "inline-flex",
                        justifyContent: "center",
                        textAlign: "center",
                      }}
                    >
                      {statusLabel}
                    </Pill>
                  </div>

                  <div style={{ textAlign: colAlign(2), minWidth: 0 }}>
                    <MetricCell
                      value={row.revenue_m}
                      currency={row.revenue_currency}
                      year={row.revenue_year}
                    />
                  </div>

                  <div style={{ textAlign: colAlign(3), minWidth: 0 }}>
                    <SourceCell source={row.revenue_source} />
                  </div>

                  <div style={{ textAlign: colAlign(4), minWidth: 0 }}>
                    <MetricCell
                      value={row.ev}
                      currency={row.ev_currency}
                      year={row.ev_year}
                    />
                  </div>

                  <div style={{ textAlign: colAlign(5), minWidth: 0 }}>
                    <SourceCell source={row.ev_source} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
