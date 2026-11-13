"use client";

import React, { useMemo, useState } from "react";
import type { CorporateEventsProfileTokens } from "@/components/corporate-events/CorporateEventsProfilePanel";
import { CountryFlagImg } from "@/components/corporate-events/CorporateEventPartyLink";
import {
  LinkedH,
  profileTableColAlign,
  profileTableCellStyle,
  PROFILE_EVENTS_ROW_GAP,
  SUBS_PROFILE_ROW_GRID,
  tableColHeaderBarStyle,
  tableColHeaderStyle,
} from "@/components/redesign/primitives";
import { HoverTooltip } from "@/components/ui/HoverTooltip";
import { useRightClick } from "@/hooks/useRightClick";
import { iso2ForName } from "@/lib/countryOptions";
import { readHqCountryIso2 } from "@/lib/dealRadar";
import {
  enrichSectorEntries,
  extractSectorId,
  getSectorHref,
  type SectorLinkEntry,
  type SectorNameLookup,
} from "@/lib/sectorLinks";

export type SubsidiariesProfileTokens = CorporateEventsProfileTokens & {
  up: string;
};

export type SubsidiaryProfileRecord = {
  id: number;
  name: string;
  sectors_id?: Array<{
    sector_name?: string;
    Sector_importance?: string;
    sector_id?: number;
    id?: number;
  }>;
  _locations?: { Country?: string };
  _linkedin_data_of_new_company?: {
    linkedin_employee?: number | null;
    linkedin_logo?: string;
  };
  /** Nested LinkedIn payload on get_company_profile subsidiaries */
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

/** Parse a raw YoY growth value already in percent points (e.g. 0.7 = 0.7%). */
export function parseLinkedInGrowthPctValue(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.round(raw * 10) / 10;
  }
  if (typeof raw === "string" && raw.trim()) {
    const num = Number(raw.replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(num)) return null;
    return Math.round(num * 10) / 10;
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

/** Rows shown before "View all". */
export const SUBSIDIARIES_PREVIEW_COUNT = 5;

type SubsidiariesProfilePanelProps = {
  tokens: SubsidiariesProfileTokens;
  subsidiaries: SubsidiaryProfileRecord[];
  /** Subsidiary company id → calendar year acquired (from acquisition corporate events). */
  acquisitionYearByCompanyId?: Record<number, number>;
  /** Rows shown before "View all". */
  maxInitial?: number;
  /** Fallback name → id lookup when subsidiary sector refs omit ids. */
  sectorNameToId?: SectorNameLookup;
};

const HEADERS = ["Company", "Sector", "Year Acquired"] as const;

const HEADER_PAD = "8px 14px";
const ROW_PAD = "10px 14px";

/** Same shape as the "+N" pill in the list views, in the card's tokens. */
const overflowPillStyle = (
  T: SubsidiariesProfileTokens
): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "1px 6px",
  margin: 0,
  border: "none",
  borderRadius: 999,
  background: T.inset,
  color: T.body,
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1.4,
  cursor: "default",
  whiteSpace: "nowrap",
  fontFamily: "inherit",
});

const isPrimarySector = (entry: SectorLinkEntry) =>
  String(entry.importance ?? "Primary").trim().toLowerCase() === "primary";

/** All sectors, primary first (API order kept within each group). */
function subsidiarySectorEntries(
  subsidiary: SubsidiaryProfileRecord,
  sectorNameToId?: SectorNameLookup
): SectorLinkEntry[] {
  const entries =
    subsidiary.sectors_id
      ?.filter(
        (x) => x && typeof x.sector_name === "string" && x.sector_name.trim()
      )
      .map((sector) => ({
        name: sector.sector_name!.trim(),
        id: extractSectorId(sector),
        importance: sector.Sector_importance ?? "Primary",
      })) ?? [];
  const enriched = enrichSectorEntries(entries, sectorNameToId);
  return [
    ...enriched.filter(isPrimarySector),
    ...enriched.filter((entry) => !isPrimarySector(entry)),
  ];
}

/** ISO2 code for the subsidiary's HQ country (any English country name). */
function subsidiaryCountryIso2(
  subsidiary: SubsidiaryProfileRecord
): string | null {
  const direct = readHqCountryIso2(
    subsidiary as unknown as Record<string, unknown>
  );
  if (direct) return direct;
  const country = subsidiary._locations?.Country?.trim();
  return country ? iso2ForName(country) : null;
}

/** First sector as a link, then "+N" with the full list on hover. */
function SubsidiarySectorCell({
  subsidiary,
  sectorNameToId,
  T,
  createClickableElement,
}: {
  subsidiary: SubsidiaryProfileRecord;
  sectorNameToId?: SectorNameLookup;
  T: SubsidiariesProfileTokens;
  createClickableElement: ReturnType<
    typeof useRightClick
  >["createClickableElement"];
}) {
  const sectors = subsidiarySectorEntries(subsidiary, sectorNameToId);
  if (sectors.length === 0) return <>-</>;

  const first = sectors[0];
  const href = getSectorHref(first);
  const extra = sectors.length - 1;
  const names = sectors.map((sector) => sector.name);

  // One line: a long first sector is cut with an ellipsis (full name on hover); "+N" always shows.
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        maxWidth: "100%",
        minWidth: 0,
        verticalAlign: "middle",
      }}
    >
      <span
        title={first.name}
        style={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {href
          ? createClickableElement(href, first.name, undefined, {
              color: T.azure,
              fontWeight: 500,
              textDecoration: "underline",
            })
          : first.name}
      </span>
      {extra > 0 ? (
        <HoverTooltip content={names.join("\n")}>
          <button
            type="button"
            aria-label={`${extra} more ${extra === 1 ? "sector" : "sectors"}: ${names.join("; ")}`}
            // Touch screens have no hover: a tap focuses the pill, which opens the list.
            onClick={(e) => e.currentTarget.focus()}
            style={overflowPillStyle(T)}
          >
            +{extra}
          </button>
        </HoverTooltip>
      ) : null}
    </span>
  );
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
    maxInitial = SUBSIDIARIES_PREVIEW_COUNT,
    sectorNameToId,
  }) => {
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

    const subsHeaderCell = (colIndex: number) => ({
      ...tableColHeaderStyle,
      textAlign: profileTableColAlign(colIndex),
    });

    return (
      <div style={{ fontFamily: T.sans, minWidth: 0, maxWidth: "100%" }}>
        <LinkedH showArrow={false} right={headerRight || undefined}>
          Current Subsidiaries
        </LinkedH>

        <div
          style={{
            maxWidth: "100%",
            minWidth: 0,
            ...profileTableCellStyle,
          }}
        >
          <div
            style={{
              ...tableColHeaderBarStyle,
              gridTemplateColumns: SUBS_PROFILE_ROW_GRID,
              gap: PROFILE_EVENTS_ROW_GAP,
              padding: HEADER_PAD,
            }}
          >
            {HEADERS.map((h, colIndex) => (
              <div key={h} style={subsHeaderCell(colIndex)}>
                {h}
              </div>
            ))}
          </div>

          {displayed.map((subsidiary, index) => {
            const last = index === displayed.length - 1;
            const yearAcquired =
              acquisitionYearByCompanyId[subsidiary.id] != null
                ? String(acquisitionYearByCompanyId[subsidiary.id])
                : "-";
            const iso2 = subsidiaryCountryIso2(subsidiary);

            return (
              <div
                key={subsidiary.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: SUBS_PROFILE_ROW_GRID,
                  gap: PROFILE_EVENTS_ROW_GAP,
                  alignItems: "center",
                  padding: ROW_PAD,
                  borderBottom: last ? "none" : `1px solid ${T.hair}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 0,
                    textAlign: profileTableColAlign(0),
                  }}
                >
                  <LogoLetter
                    name={subsidiary.name}
                    logo={subsidiary._linkedin_data_of_new_company?.linkedin_logo}
                    T={T}
                  />
                  {/* Long names wrap; the flag follows the name. */}
                  <span style={{ minWidth: 0, overflowWrap: "break-word" }}>
                    {createClickableElement(
                      `/company/${subsidiary.id}`,
                      subsidiary.name,
                      undefined,
                      {
                        color: T.azure,
                        fontWeight: 500,
                        textDecoration: "underline",
                      }
                    )}
                    {iso2 ? <CountryFlagImg iso2={iso2} /> : null}
                  </span>
                </div>
                <div
                  style={{
                    textAlign: profileTableColAlign(1),
                    color: T.muted,
                    minWidth: 0,
                  }}
                >
                  <SubsidiarySectorCell
                    subsidiary={subsidiary}
                    sectorNameToId={sectorNameToId}
                    T={T}
                    createClickableElement={createClickableElement}
                  />
                </div>
                <div
                  style={{
                    textAlign: profileTableColAlign(2),
                    color: T.body,
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                  }}
                >
                  {yearAcquired}
                </div>
              </div>
            );
          })}
        </div>

        {n > maxInitial ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: `1px solid ${T.hair}`,
              padding: ROW_PAD,
              fontSize: 12.5,
              color: T.muted,
              fontFamily: T.sans,
            }}
          >
            <span>
              Showing {displayed.length} of {n}
            </span>
            <button
              type="button"
              aria-expanded={showAll}
              onClick={() => setShowAll((v) => !v)}
              style={{
                border: "none",
                background: "none",
                padding: 0,
                cursor: "pointer",
                fontFamily: T.sans,
                fontSize: 12.5,
                fontWeight: 600,
                color: T.azure,
              }}
            >
              {showAll ? "Show less" : "View all"}
            </button>
          </div>
        ) : null}
      </div>
    );
  };
