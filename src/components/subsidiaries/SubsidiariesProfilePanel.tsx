"use client";

import React, { useMemo, useState, useId } from "react";
import type { CorporateEventsProfileTokens } from "@/components/corporate-events/CorporateEventsProfilePanel";
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
  /** When API provides a YoY % for LinkedIn / headcount growth */
  linkedin_growth_pct?: number | null;
  /** Normalized counts for sparkline (e.g. monthly headcount); min length 2 to draw */
  linkedin_growth_spark?: number[] | null;
};

type SubsidiariesProfilePanelProps = {
  tokens: SubsidiariesProfileTokens;
  subsidiaries: SubsidiaryProfileRecord[];
  maxInitial?: number;
};

const HEADERS = [
  "Company",
  "Sector",
  "Country",
  "Headcount",
  "LinkedIn growth",
] as const;

function sectorLabel(s: SubsidiaryProfileRecord): string {
  const raw = s.sectors_id
    ?.filter((x) => x && typeof x.sector_name === "string")
    .map((x) => x.sector_name as string);
  if (!raw?.length) return "—";
  return raw.slice(0, 3).join(", ");
}

function headcountValue(s: SubsidiaryProfileRecord): number | null {
  const v = s._linkedin_data_of_new_company?.linkedin_employee;
  if (v === undefined || v === null) return null;
  if (typeof v !== "number" || Number.isNaN(v)) return null;
  return v;
}

function LogoLetter({
  name,
  T,
}: {
  name: string;
  T: SubsidiariesProfileTokens;
}) {
  const letter = (name.trim()[0] || "?").toUpperCase();
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
      }}
    >
      {letter}
    </div>
  );
}

function MiniSpark({
  data,
  w,
  h,
  stroke,
}: {
  data: number[];
  w: number;
  h: number;
  stroke: string;
}) {
  const uid = useId().replace(/:/g, "");
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const n = data.length;
  const pts = data.map((v, i) => {
    const x = (i / Math.max(1, n - 1)) * w;
    const y = h - ((v - min) / range) * h * 0.9 - h * 0.05;
    return [x, y] as const;
  });
  const d = pts
    .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(" ");
  const area = `${d} L${w} ${h} L0 ${h} Z`;
  const gradId = `sg-${uid}`;

  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const SubsidiariesProfilePanel: React.FC<SubsidiariesProfilePanelProps> =
  ({ tokens: T, subsidiaries: rawSubs, maxInitial = 3 }) => {
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

    return (
      <div style={{ fontFamily: T.sans }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px 12px",
            borderBottom: `1px solid ${T.hair}`,
          }}
        >
          <div
            style={{
              fontSize: "13.5px",
              fontWeight: 600,
              color: T.ink,
            }}
          >
            Current subsidiaries
          </div>
          {headerRight ? (
            <div style={{ fontSize: "11.5px", color: T.muted }}>
              {headerRight}
            </div>
          ) : null}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: "820px",
              borderCollapse: "collapse",
              fontSize: "12.5px",
            }}
          >
            <thead>
              <tr style={{ background: T.paper }}>
                {HEADERS.map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign:
                        h === "Headcount" ? "right" : "left",
                      padding: "10px 12px",
                      color: T.muted,
                      fontSize: "11px",
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                      borderBottom: `1px solid ${T.hair}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((subsidiary, index) => {
                const hc = headcountValue(subsidiary);
                const last = index === displayed.length - 1;
                const spark =
                  Array.isArray(subsidiary.linkedin_growth_spark) &&
                  subsidiary.linkedin_growth_spark.length >= 2
                    ? subsidiary.linkedin_growth_spark
                    : null;
                const pct =
                  typeof subsidiary.linkedin_growth_pct === "number" &&
                  Number.isFinite(subsidiary.linkedin_growth_pct)
                    ? subsidiary.linkedin_growth_pct
                    : null;

                return (
                  <tr
                    key={subsidiary.id}
                    style={{
                      borderBottom: last ? "none" : `1px solid ${T.hair}`,
                    }}
                  >
                    <td style={{ padding: "10px 12px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <LogoLetter name={subsidiary.name} T={T} />
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
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        color: T.muted,
                      }}
                    >
                      {sectorLabel(subsidiary)}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        fontFamily: T.mono,
                        color: T.body,
                      }}
                    >
                      {subsidiary._locations?.Country?.trim() || "—"}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        fontFamily: T.mono,
                        color: T.body,
                        textAlign: "right",
                      }}
                    >
                      {hc === null ? "—" : hc.toLocaleString()}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {spark && pct !== null ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <MiniSpark data={spark} w={80} h={22} stroke={T.azure} />
                          <span
                            style={{
                              fontFamily: T.mono,
                              color: T.up,
                              fontSize: 11,
                            }}
                          >
                            {pct >= 0 ? "+" : ""}
                            {pct}%
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: T.muted }}>—</span>
                      )}
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
