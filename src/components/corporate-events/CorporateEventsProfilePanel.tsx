"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  profileTableCellStyle,
  PROFILE_EVENTS_ROW_GAP,
  PROFILE_EVENTS_ROW_GRID,
  PROFILE_EVENTS_ROW_PAD,
  tableColHeaderBarStyle,
  tableColHeaderStyle,
} from "@/components/redesign/primitives";
import type { CorporateEvent, Sector } from "./CorporateEventsTable";
import {
  CorporateEventDealDetailsColumn,
  CorporateEventDetailsColumn,
  CorporateEventPartiesColumn,
} from "./CorporateEventProfileColumns";
import {
  coerceSectorNameList,
  enrichSectorEntries,
  getSectorHref,
  resolveEventSectorEntries,
  type SectorLinkEntry,
  type SectorNameLookup,
} from "@/lib/sectorLinks";
import { getTargetCompany } from "./corporateEventsTableUtils";

export type CorporateEventsProfileTokens = {
  paper: string;
  hair: string;
  ink: string;
  body: string;
  muted: string;
  inset: string;
  azure: string;
  azureSoft: string;
  coralSoft: string;
  down: string;
  sans: string;
  mono: string;
};

type CorporateEventsProfilePanelProps = {
  tokens: CorporateEventsProfileTokens;
  events: CorporateEvent[];
  loading?: boolean;
  primarySectors?: Sector[];
  /** @deprecated Secondary sectors are not shown in the profile events table. */
  secondarySectors?: Sector[];
  /** Target company id → primary sectors (e.g. from subsidiaries on the company payload). */
  primarySectorsByCompanyId?: Record<number, Sector[]>;
  /** Fallback name → id lookup when sector refs omit ids. */
  sectorNameToId?: SectorNameLookup;
  /** @deprecated Use server pagination instead. */
  maxInitialEvents?: number;
  totalCount?: number;
  rangeStart?: number;
  rangeEnd?: number;
  canPrev?: boolean;
  canNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  browseAllHref?: string;
  /** Stretch card body so paginator stays at the bottom (company profile grid). */
  fillGridCell?: boolean;
  /** `narrow` = fewer columns; table scrolls inside card without widening the layout */
  layout?: "default" | "narrow";
  onEventClick?: (eventId: number, description?: string) => void;
  onAdvisorClick?: (advisorId?: number, advisorName?: string) => void;
};

function CePagerBtn({
  label,
  enabled,
  onClick,
  ariaLabel,
  tokens: T,
}: {
  label: string;
  enabled: boolean;
  onClick: () => void;
  ariaLabel: string;
  tokens: CorporateEventsProfileTokens;
}) {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: 26,
        height: 26,
        borderRadius: 6,
        border: `1px solid ${T.inset}`,
        background: T.paper,
        color: T.body,
        fontFamily: T.sans,
        fontSize: 14,
        lineHeight: 1,
        cursor: enabled ? "pointer" : "default",
        opacity: enabled ? 1 : 0.35,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {label}
    </button>
  );
}

function headerRightLine(
  events: CorporateEvent[],
  loading: boolean,
  totalCount?: number
): string {
  const n = totalCount ?? events.length;
  if (loading || n === 0) return "";
  const years = events
    .map((e) => {
      const ev = e as { announcement_date?: string };
      const d = ev.announcement_date;
      if (!d) return null;
      const y = new Date(d).getFullYear();
      return Number.isNaN(y) ? null : y;
    })
    .filter((y): y is number => y != null);
  const now = new Date().getFullYear();
  let span = 5;
  if (years.length) {
    const minY = Math.min(...years);
    span = Math.max(1, Math.min(99, now - minY + 1));
  }
  return `${n} event${n === 1 ? "" : "s"} · Last ${span} yrs`;
}

function sectorsToLinkEntries(sectors: Sector[]): SectorLinkEntry[] {
  return sectors
    .filter((s) => s?.sector_name)
    .slice(0, 3)
    .map((s) => ({
      name: s.sector_name!,
      id: s.sector_id,
      importance: s.Sector_importance ?? "Primary",
    }));
}

function resolveTargetCompanyId(event: CorporateEvent): number | undefined {
  const ne = event as {
    targets?: Array<{ id?: number }>;
    target_company?: { id?: number };
    target_counterparty?: { new_company_counterparty?: number };
  };
  const fromTargets = ne.targets?.[0]?.id;
  if (typeof fromTargets === "number" && fromTargets > 0) return fromTargets;
  const fromTargetCompany = ne.target_company?.id;
  if (typeof fromTargetCompany === "number" && fromTargetCompany > 0) {
    return fromTargetCompany;
  }
  const legacyId = ne.target_counterparty?.new_company_counterparty;
  if (typeof legacyId === "number" && legacyId > 0) return legacyId;
  return undefined;
}

/** Primary sectors — prefer event.sectors.Primary (with ids) → target company → profile fallback. */
function resolveEventPrimarySectors(
  event: CorporateEvent,
  fallbackPrimary: Sector[],
  primarySectorsByCompanyId?: Record<number, Sector[]>
): SectorLinkEntry[] {
  const ne = event as {
    primary?: unknown;
    sectors?: unknown;
    primary_sectors?: unknown;
  };

  const fromEventSectors = resolveEventSectorEntries(ne.sectors, ne.primary, "Primary");
  if (fromEventSectors.length > 0) return fromEventSectors.slice(0, 3);

  const fromEventPrimarySectors = coerceSectorNameList(ne.primary_sectors);
  if (fromEventPrimarySectors.length > 0) return fromEventPrimarySectors.slice(0, 3);

  const target = getTargetCompany(event as Parameters<typeof getTargetCompany>[0]);
  if (target) {
    const fromTargetSectors = resolveEventSectorEntries(
      target.sectors,
      target.primary,
      "Primary"
    );
    if (fromTargetSectors.length > 0) return fromTargetSectors.slice(0, 3);

    const fromTargetLegacy = coerceSectorNameList(
      target.primary_sectors ?? target._sectors_primary
    );
    if (fromTargetLegacy.length > 0) return fromTargetLegacy.slice(0, 3);
  }

  const targetId = resolveTargetCompanyId(event);
  if (targetId != null && primarySectorsByCompanyId?.[targetId]?.length) {
    return sectorsToLinkEntries(primarySectorsByCompanyId[targetId]);
  }

  return sectorsToLinkEntries(fallbackPrimary);
}

function EventSectorLinks({
  event,
  fallbackPrimary,
  primarySectorsByCompanyId,
  sectorNameToId,
  linkColor,
}: {
  event: CorporateEvent;
  fallbackPrimary: Sector[];
  primarySectorsByCompanyId?: Record<number, Sector[]>;
  sectorNameToId?: SectorNameLookup;
  linkColor: string;
}) {
  const sectors = enrichSectorEntries(
    resolveEventPrimarySectors(
      event,
      fallbackPrimary,
      primarySectorsByCompanyId
    ),
    sectorNameToId
  );

  if (sectors.length === 0) return <>-</>;

  return (
    <>
      {sectors.map((sector, idx) => {
        const href = getSectorHref(sector);
        return (
          <span key={`${sector.name}-${sector.id ?? idx}`}>
            {href ? (
              <Link
                href={href}
                prefetch={false}
                style={{
                  color: linkColor,
                  textDecoration: "underline",
                  fontWeight: 500,
                }}
              >
                {sector.name}
              </Link>
            ) : (
              sector.name
            )}
            {idx < sectors.length - 1 ? ", " : ""}
          </span>
        );
      })}
    </>
  );
}

type AdvisorEntry = { id?: number; name: string };

function collectAdvisors(event: CorporateEvent): AdvisorEntry[] {
  const ne = event as {
    advisors?: Array<{
      advisor_company?: { id?: number; name?: string };
      _new_company?: { id?: number; name?: string };
    }>;
    advisors_names?: string[] | string;
  };
  const le = event as {
    "1"?: Array<{ _new_company?: { id?: number; name?: string } }>;
  };
  const newAdvisors = ne.advisors || [];
  const legacyAdvisors = le["1"] || [];
  const advisorsNames = Array.isArray(ne.advisors_names)
    ? ne.advisors_names
    : typeof ne.advisors_names === "string"
      ? [ne.advisors_names]
      : [];
  return [
    ...newAdvisors.map((a) => ({
      id: a.advisor_company?.id || a._new_company?.id,
      name: a.advisor_company?.name || a._new_company?.name || "",
    })),
    ...legacyAdvisors.map((a) => ({
      id: a._new_company?.id,
      name: a._new_company?.name || "",
    })),
    ...advisorsNames.map((name) => ({
      id: undefined,
      name: typeof name === "string" ? name : "",
    })),
  ].filter((a) => Boolean(a.name));
}

const CE_HEADERS = [
  "Event Details",
  "Parties",
  "Deal Details",
  "Advisors",
  "Sector",
] as const;

const CE_COL_GRID_NARROW =
  "minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 0.95fr)";

/** Event Details, Parties, and Deal Details are left-aligned; other columns centered. */
function ceColAlign(colIndex: number): "left" | "center" {
  return colIndex <= 2 ? "left" : "center";
}

export const CorporateEventsProfilePanel: React.FC<
  CorporateEventsProfilePanelProps
> = ({
  tokens: T,
  events,
  loading = false,
  primarySectors = [],
  primarySectorsByCompanyId,
  sectorNameToId,
  maxInitialEvents = 3,
  totalCount,
  rangeStart = 0,
  rangeEnd = 0,
  canPrev = false,
  canNext = false,
  onPrev,
  onNext,
  browseAllHref = "/corporate-events",
  fillGridCell = false,
  layout = "default",
  onEventClick,
  onAdvisorClick,
}) => {
  const narrow = layout === "narrow";
  const headers = narrow
    ? (["Event Details", "Parties", "Deal Details"] as const)
    : CE_HEADERS;
  const router = useRouter();
  const usePagination = totalCount != null && onPrev != null && onNext != null;

  const handleEventNav = (eventId: number | undefined, description?: string) => {
    if (eventId && onEventClick) {
      onEventClick(eventId, description);
    } else if (eventId) {
      router.push(`/corporate-event/${eventId}`);
    }
  };

  const handleAdvisorNav = (advisorId?: number, advisorName?: string) => {
    if (onAdvisorClick) {
      onAdvisorClick(advisorId, advisorName);
    } else if (advisorId) {
      router.push(`/advisor/${advisorId}`);
    }
  };

  const right = useMemo(
    () => headerRightLine(events, loading, totalCount),
    [events, loading, totalCount]
  );

  const displayed = usePagination
    ? events
    : events.slice(0, maxInitialEvents);

  const resolvedTotal = totalCount ?? events.length;
  const rangeLabel =
    resolvedTotal > 0
      ? `${rangeStart}–${rangeEnd} of ${resolvedTotal}`
      : `0 of 0`;

  if (loading && events.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "20px 16px",
          color: T.muted,
          fontSize: "12.5px",
          fontFamily: T.sans,
        }}
      >
        Loading corporate events...
      </div>
    );
  }

  const pinFooter = fillGridCell && usePagination;

  return (
    <div
      style={{
        fontFamily: T.sans,
        minWidth: 0,
        maxWidth: "100%",
        ...(pinFooter
          ? {
              height: "100%",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }
          : {}),
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 12px",
          borderBottom: `1px solid ${T.hair}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: "13.5px",
            fontWeight: 600,
            color: T.ink,
          }}
        >
          Corporate Events
        </div>
        {right ? (
          <div style={{ fontSize: "11.5px", color: T.muted }}>{right}</div>
        ) : null}
      </div>

      <div
        style={{
          overflowX: "auto",
          maxWidth: "100%",
          minWidth: 0,
          ...(pinFooter ? { flex: 1, minHeight: 0 } : {}),
        }}
      >
        <div style={{ width: "100%", minWidth: narrow ? 520 : 720, ...profileTableCellStyle }}>
          <div
            style={{
              ...tableColHeaderBarStyle,
              gridTemplateColumns: narrow
                ? CE_COL_GRID_NARROW
                : PROFILE_EVENTS_ROW_GRID,
              gap: PROFILE_EVENTS_ROW_GAP,
              padding: narrow ? "8px 8px" : PROFILE_EVENTS_ROW_PAD.header,
            }}
          >
            {headers.map((h, colIndex) => (
              <div
                key={h}
                style={{
                  ...tableColHeaderStyle,
                  textAlign: ceColAlign(colIndex),
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {displayed.length > 0 ? (
            displayed.map((event, index) => {
              const advisorList = collectAdvisors(event);
              const cellPad = narrow ? "10px 8px" : PROFILE_EVENTS_ROW_PAD.body;
              const last = index === displayed.length - 1;
              const colAlign = ceColAlign;

              return (
                <div
                  key={event.id ?? `ce-${index}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: narrow
                      ? CE_COL_GRID_NARROW
                      : PROFILE_EVENTS_ROW_GRID,
                    gap: PROFILE_EVENTS_ROW_GAP,
                    alignItems: "start",
                    padding: cellPad,
                    borderBottom: last ? "none" : `1px solid ${T.hair}`,
                  }}
                >
                  <div style={{ textAlign: colAlign(0), minWidth: 0 }}>
                    <CorporateEventDetailsColumn
                      event={event}
                      linkColor={T.azure}
                      onEventClick={handleEventNav}
                    />
                  </div>
                  <div style={{ textAlign: colAlign(1), minWidth: 0 }}>
                    <CorporateEventPartiesColumn event={event} />
                  </div>
                  <div style={{ textAlign: colAlign(2), minWidth: 0 }}>
                    <CorporateEventDealDetailsColumn event={event} />
                  </div>
                  {!narrow && (
                    <>
                      <div
                        style={{
                          textAlign: colAlign(3),
                          color: T.muted,
                          minWidth: 0,
                        }}
                      >
                        {advisorList.length === 0
                          ? "-"
                          : advisorList.map((advisor, idx) => (
                              <span key={`${advisor.name}-${idx}`}>
                                <span
                                  style={{
                                    color: T.azure,
                                    textDecoration: "none",
                                    cursor: advisor.id ? "pointer" : "default",
                                  }}
                                  onClick={() =>
                                    advisor.id &&
                                    handleAdvisorNav(advisor.id, advisor.name)
                                  }
                                >
                                  {advisor.name}
                                </span>
                                {idx < advisorList.length - 1 ? ", " : ""}
                              </span>
                            ))}
                      </div>
                      <div
                        style={{
                          textAlign: colAlign(4),
                          minWidth: 0,
                        }}
                      >
                        <EventSectorLinks
                          event={event}
                          fallbackPrimary={primarySectors}
                          primarySectorsByCompanyId={primarySectorsByCompanyId}
                          sectorNameToId={sectorNameToId}
                          linkColor={T.azure}
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })
          ) : (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: T.muted,
              }}
            >
              No corporate events found
            </div>
          )}
        </div>
      </div>

      {usePagination ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            borderTop: `1px solid ${T.hair}`,
            fontFamily: T.sans,
            fontSize: 13,
            flexShrink: 0,
            ...(pinFooter ? { marginTop: "auto" } : {}),
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CePagerBtn
              label="‹"
              enabled={canPrev}
              onClick={onPrev!}
              ariaLabel="Previous corporate events"
              tokens={T}
            />
            <CePagerBtn
              label="›"
              enabled={canNext}
              onClick={onNext!}
              ariaLabel="Next corporate events"
              tokens={T}
            />
            <span style={{ color: T.muted, fontSize: 13 }}>
              {loading ? "-" : `Showing ${rangeLabel}`}
            </span>
          </div>
          <Link
            href={browseAllHref}
            prefetch={false}
            style={{
              color: T.azure,
              fontWeight: 500,
              textDecoration: "none",
              fontFamily: T.sans,
              fontSize: 13,
            }}
          >
            Browse all {loading ? "-" : resolvedTotal} →
          </Link>
        </div>
      ) : events.length > maxInitialEvents ? (
        <div style={{ textAlign: "center", padding: "12px 0 16px" }}>
          <span style={{ fontSize: "12.5px", color: T.muted, fontFamily: T.sans }}>
            {events.length} events total
          </span>
        </div>
      ) : null}
    </div>
  );
};
