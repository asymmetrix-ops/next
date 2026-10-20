"use client";

import React from "react";
import Link from "next/link";
import {
  LinkedH,
  Pill,
  T,
  profileTableCellStyle,
  profileTableColAlign,
  tableColHeaderBarStyle,
  tableColHeaderStyle,
  PROFILE_EVENTS_ROW_GAP,
  PROFILE_EVENTS_ROW_PAD,
} from "@/components/redesign/primitives";
import { HoverTooltip } from "@/components/ui/HoverTooltip";
import { formatCurrency } from "@/utils/advisorHelpers";
import type { AdvisorActiveMandate } from "@/types/advisor";

type Props = {
  mandates: AdvisorActiveMandate[];
  fillGridCell?: boolean;
};

const ROW_GRID = "minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr)";
const HEADERS = ["Company", "EV", "Revenue"] as const;

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
  const base = cur
    ? formatCurrency(String(num), cur)
    : `${Math.round(num).toLocaleString()}M`;
  const yr = year != null && String(year).trim() !== "" ? String(year).trim() : null;
  return yr ? `${base} (${yr})` : base;
}

function sourceTooltip(source: string): string {
  const src = source.trim();
  if (src.startsWith("http")) return `Estimate — source: ${src}`;
  return src;
}

function CompanyLogo({ name, logo }: { name: string; logo?: string | null }) {
  const letter = (name.trim()[0] || "?").toUpperCase();
  const trimmedLogo = logo?.trim();
  const src = trimmedLogo
    ? trimmedLogo.startsWith("data:") || trimmedLogo.startsWith("http")
      ? trimmedLogo
      : `data:image/jpeg;base64,${trimmedLogo}`
    : null;

  return (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: 5,
        background: T.inset,
        color: T.body,
        fontSize: 11,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: T.sans,
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          width={24}
          height={24}
          style={{ objectFit: "cover", display: "block" }}
        />
      ) : (
        letter
      )}
    </div>
  );
}

function shortenStatusLabel(label: string): string {
  const stripped = label.replace(/^Transaction\s+/i, "");
  if (stripped === label) return stripped;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

const STATUS_TONE: Record<number, "neutral" | "warn" | "azure" | "coral"> = {
  1: "azure", // Transaction anticipated
  2: "warn", // Rumoured in market
  3: "warn", // Reported in market
  4: "coral", // In market / strategic review
};

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

  const valueNode = (
    <span
      style={{
        color: formatted ? T.body : T.faint,
        fontVariantNumeric: "tabular-nums",
        fontWeight: 600,
        fontSize: 12.5,
        whiteSpace: "nowrap",
      }}
    >
      {formatted ?? "—"}
    </span>
  );

  if (!formatted || isInvalidSource(source)) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
        {valueNode}
      </div>
    );
  }

  const tooltip = sourceTooltip(source!);

  return (
    <HoverTooltip content={tooltip}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          alignItems: "center",
          cursor: "default",
        }}
      >
        {valueNode}
        <span
          style={{
            fontSize: 10.5,
            color: T.faint,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
          }}
        >
          {source!.trim().startsWith("http") ? "Estimate" : source!.trim()}
        </span>
      </div>
    </HoverTooltip>
  );
}

export function AdvisorActiveMandatesProfilePanel({
  mandates,
  fillGridCell,
}: Props) {
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
                gap: PROFILE_EVENTS_ROW_GAP,
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
              const statusLabel = shortenStatusLabel(
                (row.transaction_status || "").trim() ||
                  (row.transaction_status_id != null
                    ? String(row.transaction_status_id)
                    : "—")
              );
              const tone = STATUS_TONE[row.transaction_status_id] ?? "neutral";
              const companyName =
                (row.company_name || "").trim() || `Company ${row.company_id}`;

              return (
                <div
                  key={
                    row.radar_id != null
                      ? `radar-${row.radar_id}`
                      : `${row.company_id}-${row.transaction_status_id}-${rowIndex}`
                  }
                  style={{
                    display: "grid",
                    gridTemplateColumns: ROW_GRID,
                    gap: PROFILE_EVENTS_ROW_GAP,
                    alignItems: "center",
                    padding: PROFILE_EVENTS_ROW_PAD.body,
                    borderBottom: isLastRow ? "none" : `1px solid ${T.hair}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minWidth: 0,
                    }}
                  >
                    <CompanyLogo name={companyName} logo={row.company_logo} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                      <Link
                        href={`/company/${row.company_id}`}
                        prefetch={false}
                        title={companyName}
                        style={{
                          color: T.azure,
                          textDecoration: "underline",
                          fontWeight: 500,
                          fontSize: 12.5,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {companyName}
                      </Link>
                      <Pill
                        tone={tone}
                        style={{
                          fontSize: 10,
                          height: "auto",
                          minHeight: 18,
                          padding: "1px 7px",
                          lineHeight: 1.3,
                          whiteSpace: "nowrap",
                          alignSelf: "flex-start",
                        }}
                      >
                        {statusLabel}
                      </Pill>
                    </div>
                  </div>

                  <div style={{ textAlign: colAlign(1), minWidth: 0 }}>
                    <MetricCell
                      value={row.ev}
                      currency={row.ev_currency}
                      year={row.ev_year}
                      source={row.ev_source}
                    />
                  </div>

                  <div style={{ textAlign: colAlign(2), minWidth: 0 }}>
                    <MetricCell
                      value={row.revenue_m}
                      currency={row.revenue_currency}
                      year={row.revenue_year}
                      source={row.revenue_source}
                    />
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
