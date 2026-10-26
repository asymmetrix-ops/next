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
import type { AdvisorActiveMandate } from "@/types/advisor";

type Props = {
  mandates: AdvisorActiveMandate[];
  fillGridCell?: boolean;
  /** Advisor whose mandates these are; enables the "View all" link to Deal Radar. */
  advisorId?: number;
};

const ROW_GRID =
  "minmax(0, 1.1fr) minmax(110px, 0.95fr) minmax(0, 0.85fr) minmax(0, 1fr)";
const HEADERS = ["Company", "Transaction Status", "Process Stage", "Key People"] as const;

function colAlign(colIndex: number) {
  return profileTableColAlign(colIndex);
}

function isInvalidText(value: string | null | undefined): boolean {
  if (!value) return true;
  const v = value.trim().toLowerCase();
  return v === "" || v === "null" || v === "nan";
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

export function AdvisorActiveMandatesProfilePanel({
  mandates,
  fillGridCell,
  advisorId,
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
          count > 0 || advisorId != null ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
              {count > 0 && (
                <span style={{ fontSize: 11, color: T.muted, fontWeight: 500 }}>
                  {count} active
                </span>
              )}
              {advisorId != null && (
                <Link
                  href={`/deal-radar?advisor_id=${advisorId}`}
                  prefetch={false}
                  style={{
                    color: T.azure,
                    fontSize: 12.5,
                    fontWeight: 500,
                    fontFamily: T.sans,
                  }}
                >
                  View all
                </Link>
              )}
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
              const processStage = row.process_stage?.trim();
              const hasProcessStage = !isInvalidText(processStage);
              const keyPeopleNames = (row.key_people ?? [])
                .map((p) => (p.name || "").trim())
                .filter(Boolean);

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
                    alignItems: "start",
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
                        minWidth: 0,
                      }}
                    >
                      {companyName}
                    </Link>
                  </div>

                  <div style={{ textAlign: colAlign(1), minWidth: 0 }}>
                    <Pill
                      tone={tone}
                      style={{
                        fontSize: 10,
                        height: "auto",
                        minHeight: 18,
                        padding: "3px 8px",
                        lineHeight: 1.3,
                        whiteSpace: "normal",
                        textAlign: "center",
                        display: "inline-flex",
                        justifyContent: "center",
                        maxWidth: "100%",
                      }}
                    >
                      {statusLabel}
                    </Pill>
                  </div>

                  <div style={{ textAlign: colAlign(2), minWidth: 0 }}>
                    {hasProcessStage ? (
                      <span
                        style={{
                          fontSize: 12,
                          color: T.body,
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "100%",
                          display: "inline-block",
                        }}
                        title={processStage}
                      >
                        {processStage}
                      </span>
                    ) : (
                      <span style={{ color: T.faint }}>—</span>
                    )}
                  </div>

                  <div style={{ textAlign: colAlign(3), minWidth: 0 }}>
                    {keyPeopleNames.length > 0 ? (
                      <span
                        style={{
                          fontSize: 12,
                          color: T.body,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "100%",
                          display: "inline-block",
                        }}
                        title={keyPeopleNames.join(", ")}
                      >
                        {keyPeopleNames.join(", ")}
                      </span>
                    ) : (
                      <span style={{ color: T.faint }}>—</span>
                    )}
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
