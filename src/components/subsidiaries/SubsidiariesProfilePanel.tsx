"use client";

import React, { useMemo, useState } from "react";
import type { CorporateEventsProfileTokens } from "@/components/corporate-events/CorporateEventsProfilePanel";
import { LinkedH, tableColHeaderBarStyle } from "@/components/redesign/primitives";
import { useRightClick } from "@/hooks/useRightClick";

export type SubsidiariesProfileTokens = CorporateEventsProfileTokens & {
  up: string;
};

export type SubsidiaryProfileRecord = {
  id: number;
  name: string;
  sectors_id?: Array<{ sector_name?: string; Sector_importance?: string }>;
  _locations?: { Country?: string };
  _linkedin_data_of_new_company?: {
    linkedin_employee?: number | null;
    linkedin_logo?: string;
  };
  /** Nested LinkedIn payload on Get_new_company subsidiaries */
  linkedin_data?: {
    linkedin_growth_1y_pct?: number | string | null;
    LinkedIn_Growth_1y_Pct?: number | string | null;
  };
  /** YoY LinkedIn / headcount growth from API (`linkedin_growth_1y_pct`) */
  linkedin_growth_1y_pct?: number | string | null;
  /** Pre-normalized YoY % (optional; panel also reads `linkedin_growth_1y_pct`) */
  linkedin_growth_pct?: number | null;
  /** Normalized counts for sparkline (e.g. monthly headcount); min length 2 to draw */
  linkedin_growth_spark?: number[] | null;
};

/** Parse a raw YoY growth value (number, percent string, or decimal fraction). */
export function parseLinkedInGrowthPctValue(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const pct = Math.abs(raw) <= 1 && raw !== 0 ? raw * 100 : raw;
    return Math.round(pct * 10) / 10;
  }
  if (typeof raw === "string" && raw.trim()) {
    const num = Number(raw.replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(num)) return null;
    const pct = Math.abs(num) <= 1 && num !== 0 ? num * 100 : num;
    return Math.round(pct * 10) / 10;
  }
  return null;
}

/** Parse subsidiary YoY growth from API fields (number or string). */
export function parseSubsidiaryLinkedInGrowthPct(
  sub: SubsidiaryProfileRecord
): number | null {
  const candidates = [
    sub.linkedin_growth_1y_pct,
    sub.linkedin_growth_pct,
    sub.linkedin_data?.linkedin_growth_1y_pct,
    sub.linkedin_data?.LinkedIn_Growth_1y_Pct,
  ];
  for (const raw of candidates) {
    const parsed = parseLinkedInGrowthPctValue(raw);
    if (parsed !== null) return parsed;
  }
  return null;
}

/** Simple trend sparkline when only YoY % is available (no monthly series). */
export function growthPctToSpark(pct: number): number[] {
  if (pct === 0) return [48, 49, 50, 51];
  const sign = pct >= 0 ? 1 : -1;
  const amt = Math.min(Math.abs(pct), 40) * 0.35;
  return [
    50 - sign * amt * 0.25,
    50 - sign * amt * 0.08,
    50 + sign * amt * 0.3,
    50 + sign * amt,
  ];
}

type SubsidiariesProfilePanelProps = {
  tokens: SubsidiariesProfileTokens;
  subsidiaries: SubsidiaryProfileRecord[];
  /** Subsidiary company id → calendar year acquired (from acquisition corporate events). */
  acquisitionYearByCompanyId?: Record<number, number>;
  maxInitial?: number;
  /** `narrow` = single grid column; fits Revenue-model width */
  layout?: "default" | "narrow";
};

const HEADERS = [
  "Company",
  "Sector",
  "Country",
  "Year Acquired",
] as const;

function sectorLabel(s: SubsidiaryProfileRecord): string {
  const raw = s.sectors_id
    ?.filter((x) => x && typeof x.sector_name === "string")
    .map((x) => x.sector_name as string);
  if (!raw?.length) return "—";
  return raw.slice(0, 3).join(", ");
}

function LogoLetter({
  name,
  logo,
  T,
}: {
  name: string;
  logo?: string | null;
  T: SubsidiariesProfileTokens;
}) {
  const letter = (name.trim()[0] || "?").toUpperCase();
  const src = logo
    ? logo.startsWith("data:") || logo.startsWith("http")
      ? logo
      : `data:image/jpeg;base64,${logo}`
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
        <img src={src} alt={name} width={24} height={24} style={{ objectFit: "cover", display: "block" }} />
      ) : (
        letter
      )}
    </div>
  );
}

export const SubsidiariesProfilePanel: React.FC<SubsidiariesProfilePanelProps> =
  ({
    tokens: T,
    subsidiaries: rawSubs,
    acquisitionYearByCompanyId = {},
    maxInitial = 3,
    layout = "default",
  }) => {
    const narrow = layout === "narrow";
    const headers = narrow
      ? (["Company", "Sector", "Country", "Year Acquired"] as const)
      : HEADERS;
    const { createClickableElement } = useRightClick();

    const [showAll, setShowAll] = useState(false);

    const subsidiaries = useMemo(
      () =>
        rawSubs.filter(
          (s) =>
            typeof s === "object" &&
            s !== null &&
            typeof (s as { id?: unknown }).id === "number"
        ),
      [rawSubs]
    );

    const displayed = showAll ? subsidiaries : subsidiaries.slice(0, maxInitial);
    const n = subsidiaries.length;

    const headerRight =
      n === 0 ? "" : `${n} ${n === 1 ? "subsidiary" : "subsidiaries"}`;

    const colGrid = narrow
      ? "minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 0.8fr) auto"
      : "minmax(0, 2fr) minmax(0, 1.2fr) minmax(0, 1fr) auto";

    return (
      <div style={{ fontFamily: T.sans, minWidth: 0, maxWidth: "100%" }}>
        <LinkedH showArrow={false} right={headerRight || undefined}>
          Current Subsidiaries
        </LinkedH>

        <div
          style={{
            ...tableColHeaderBarStyle,
            gridTemplateColumns: colGrid,
            gap: 6,
          }}
        >
          {headers.map((h) => (
            <div
              key={h}
              style={{
                textAlign: h === "Year Acquired" ? "right" : "left",
              }}
            >
              {h}
            </div>
          ))}
        </div>

        <div style={{ overflowX: "auto", maxWidth: "100%", minWidth: 0 }}>
          <table
            style={{
              width: "100%",
              minWidth: narrow ? 0 : "680px",
              tableLayout: narrow ? "fixed" : "auto",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <tbody>
              {displayed.map((subsidiary, index) => {
                const last = index === displayed.length - 1;
                const yearAcquired =
                  acquisitionYearByCompanyId[subsidiary.id] != null
                    ? String(acquisitionYearByCompanyId[subsidiary.id])
                    : "—";

                const cellPad = narrow ? "10px 8px" : "10px 16px";
                return (
                  <tr
                    key={subsidiary.id}
                    style={{
                      borderBottom: last ? "none" : `1px solid ${T.hair}`,
                    }}
                  >
                    <td style={{ padding: cellPad }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: narrow ? 8 : 10,
                          minWidth: 0,
                        }}
                      >
                        <LogoLetter
                          name={subsidiary.name}
                          logo={subsidiary._linkedin_data_of_new_company?.linkedin_logo}
                          T={T}
                        />
                        <span
                          style={{
                            minWidth: 0,
                            overflow: narrow ? "hidden" : undefined,
                            textOverflow: narrow ? "ellipsis" : undefined,
                            whiteSpace: narrow ? "nowrap" : undefined,
                          }}
                        >
                          {createClickableElement(
                            `/new_company/${subsidiary.id}`,
                            subsidiary.name,
                            undefined,
                            {
                              color: T.azure,
                              fontWeight: 500,
                              textDecoration: "underline",
                            }
                          )}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: cellPad,
                        color: T.muted,
                        overflow: narrow ? "hidden" : undefined,
                        textOverflow: narrow ? "ellipsis" : undefined,
                        whiteSpace: narrow ? "nowrap" : undefined,
                      }}
                    >
                      {sectorLabel(subsidiary)}
                    </td>
                    <td
                      style={{
                        padding: cellPad,
                        color: T.body,
                        whiteSpace: narrow ? "nowrap" : undefined,
                      }}
                    >
                      {subsidiary._locations?.Country?.trim() || "—"}
                    </td>
                    <td
                      style={{
                        padding: cellPad,
                        color: T.body,
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {yearAcquired}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {n > maxInitial ? (
          <div style={{ textAlign: "center", padding: "12px 0 16px" }}>
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              style={{
                background: "none",
                border: "none",
                color: T.azure,
                textDecoration: "underline",
                cursor: "pointer",
                fontSize: "12.5px",
                fontWeight: 500,
                fontFamily: T.sans,
              }}
            >
              {showAll ? "Show less" : "See more"}
            </button>
          </div>
        ) : null}
      </div>
    );
  };
