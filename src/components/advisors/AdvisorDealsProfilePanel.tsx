"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { DealTypeBadge } from "@/components/corporate-events/DealTypeBadge";
import {
  profileTableColAlign,
  profileTableCellStyle,
  PROFILE_EVENTS_ROW_GAP,
  PROFILE_EVENTS_ROW_PAD,
  tableColHeaderBarStyle,
  tableColHeaderStyle,
  T,
  Pill,
  LinkedH,
} from "@/components/redesign/primitives";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { formatCurrency } from "@/utils/advisorHelpers";
import { useGlobalSectorNameLookup } from "@/hooks/useGlobalSectorNameLookup";
import {
  enrichSectorEntries,
  getAdvisorDealSectorHref,
  type SectorLinkEntry,
  type SectorNameLookup,
} from "@/lib/sectorLinks";
import { getAdvisorDealRowKey } from "@/lib/normalizeAdvisorDealEvent";

export type AdvisorDealEvent = {
  id: number;
  description?: string | null;
  announcement_date?: string | null;
  deal_type?: string | null;
  company_advised_id?: number | null;
  company_advised_name?: string | null;
  company_advised_role?: string | null;
  target_companies?: Array<{ id: number; name: string }> | null;
  enterprise_value_m?: string | number | null;
  currency_name?: string | null;
  ev_source?: string | null;
  advisor_individuals?: Array<{ id?: number; name?: string }> | null;
  other_advisors?: Array<{
    id?: number;
    individuals_id?: number[];
    advisor_company_id?: number;
    advisor_company_name?: string;
  }> | null;
  primary_sectors?: Array<{
    id?: number;
    is_derived?: boolean;
    sector_name?: string;
    sector_importance?: string;
  }> | null;
};

type SectorOption = { id: number; sector_name: string };

type Props = {
  events: AdvisorDealEvent[];
  totalCount: number;
  variant?: "summary" | "full";
  loadingFilters?: boolean;
  filterPrimarySectors?: SectorOption[];
  filterSecondarySectors?: SectorOption[];
  selectedFilterPrimary?: number[];
  selectedFilterSecondary?: number[];
  loadingFilterPrimary?: boolean;
  loadingFilterSecondary?: boolean;
  onAddPrimaryFilter?: (id: number) => void;
  onRemovePrimaryFilter?: (id: number) => void;
  onAddSecondaryFilter?: (id: number) => void;
  onRemoveSecondaryFilter?: (id: number) => void;
  onClearFilters?: () => void;
  onExportCsv?: () => void;
  exportingDeals?: boolean;
  pageSize?: number;
};

const SUMMARY_ROW_GRID =
  "minmax(0, 1.35fr) minmax(88px, auto) minmax(108px, auto) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)";

const FULL_ROW_GRID =
  "minmax(0, 1.1fr) minmax(80px, auto) minmax(92px, auto) minmax(0, 0.9fr) minmax(0, 1fr) minmax(0, 1fr) minmax(80px, auto) minmax(0, 0.9fr)";

const COL_GAP = PROFILE_EVENTS_ROW_GAP;

const SUMMARY_HEADERS = [
  "Name",
  "Date",
  "Type",
  "Side Advised",
  "Client",
  "Sector",
] as const;

const FULL_HEADERS = [
  "Name",
  "Date",
  "Type",
  "Side Advised",
  "Client",
  "Sector",
  "EV",
  "Advisor",
] as const;

function coerceArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw === null || raw === undefined) return [];
  if (typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "[]") return [];
  try {
    const normalized = trimmed.replace(/\\u0022/g, '"');
    const parsed = JSON.parse(normalized) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function formatMonthYear(iso?: string | null): string {
  if (!iso || iso === "1900-01-01") return "-";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

function formatSideAdvised(role: string): string {
  const trimmed = role.trim();
  if (!trimmed) return "-";
  if (/^investor\s*\(unknown size\)/i.test(trimmed)) return "Investor";
  return trimmed;
}

function parseEventSectors(
  raw: unknown
): Array<{ id: number; name: string; importance: string; isDerived: boolean }> {
  return dedupeSectors(
    coerceArray<{
      id?: number;
      is_derived?: boolean;
      sector_name?: string;
      sector_importance?: string;
    }>(raw)
      .filter((s) => s && String(s.sector_name || "").trim().length > 0)
      .map((s) => ({
        id: typeof s.id === "number" && s.id > 0 ? s.id : 0,
        name: String(s.sector_name).trim(),
        importance: String(s.sector_importance || "Primary").trim() || "Primary",
        isDerived: Boolean(s.is_derived),
      }))
  );
}

function DealSectorLinks({
  sectors,
  sectorNameToId,
}: {
  sectors: Array<{ id: number; name: string; importance: string; isDerived: boolean }>;
  sectorNameToId?: SectorNameLookup;
}) {
  const entries: SectorLinkEntry[] = sectors.slice(0, 4).map((sector) => ({
    name: sector.name,
    id: sector.id > 0 ? sector.id : undefined,
    importance: sector.importance,
  }));
  const linked = enrichSectorEntries(entries, sectorNameToId);

  if (linked.length === 0) return <>-</>;

  return (
    <>
      {linked.map((sector, idx) => {
        const source = sectors[idx];
        const href = getAdvisorDealSectorHref({
          id: sector.id,
          importance: sector.importance,
          isDerived: source?.isDerived,
        });
        return (
          <span key={`${sector.name}-${sector.id ?? idx}`}>
            {href ? (
              <Link
                href={href}
                prefetch={false}
                style={{
                  color: T.azure,
                  textDecoration: "underline",
                  fontWeight: 500,
                }}
              >
                {sector.name}
              </Link>
            ) : (
              sector.name
            )}
            {idx < linked.length - 1 ? ", " : ""}
          </span>
        );
      })}
    </>
  );
}

function headerRightLine(total: number, pageSize: number, showAll: boolean): string {
  if (total === 0) return "";
  if (showAll) return `${total} deal${total === 1 ? "" : "s"}`;
  return `${Math.min(pageSize, total)} of ${total}`;
}

function formatEnterpriseValue(
  value: string | number | null | undefined,
  currency: string | null | undefined
): string {
  if (value === null || value === undefined || value === "") return "-";
  const cur = (currency || "").trim();
  if (cur) return formatCurrency(String(value), cur);
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? `${Math.round(n).toLocaleString()}M` : String(value);
}

function dedupeSectors(
  sectors: Array<{
    id: number;
    name: string;
    importance: string;
    isDerived: boolean;
  }>
) {
  const sorted = [...sectors].sort((a, b) => {
    if (a.isDerived === b.isDerived) return 0;
    return a.isDerived ? 1 : -1;
  });
  const m = new Map<string, (typeof sorted)[number]>();
  for (const s of sorted) {
    const key =
      s.id > 0
        ? `${s.id}:${s.importance.toLowerCase()}:${s.isDerived ? "d" : "p"}`
        : `${s.name.toLowerCase()}:${s.importance.toLowerCase()}:${s.isDerived ? "d" : "p"}`;
    if (!m.has(key)) m.set(key, s);
  }
  return Array.from(m.values());
}

function sortEventsByDateDesc(events: AdvisorDealEvent[]): AdvisorDealEvent[] {
  return [...events].sort((a, b) => {
    const ta = a.announcement_date ? new Date(a.announcement_date).getTime() : 0;
    const tb = b.announcement_date ? new Date(b.announcement_date).getTime() : 0;
    return tb - ta;
  });
}

function SummaryDealsTable({
  events,
  sectorNameToId,
}: {
  events: AdvisorDealEvent[];
  sectorNameToId?: SectorNameLookup;
}) {
  if (events.length === 0) {
    return (
      <div
        style={{
          padding: "24px 16px",
          color: T.muted,
          fontSize: "12.5px",
          textAlign: "center",
          fontFamily: T.sans,
        }}
      >
        No deals advised available
      </div>
    );
  }

  const colAlign = (colIndex: number) => profileTableColAlign(colIndex);

  return (
    <div style={{ width: "100%", minWidth: 0, ...profileTableCellStyle }}>
      <div
        style={{
          ...tableColHeaderBarStyle,
          gridTemplateColumns: SUMMARY_ROW_GRID,
          gap: COL_GAP,
          padding: PROFILE_EVENTS_ROW_PAD.header,
        }}
      >
        {SUMMARY_HEADERS.map((h, colIndex) => (
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

      {events.map((event, rowIndex) => {
        const isLastRow = rowIndex === events.length - 1;
        const companyAdvisedId = event.company_advised_id ?? null;
        const companyAdvisedName = (event.company_advised_name || "").trim() || "-";
        const companyAdvisedRoleRaw = String(event.company_advised_role || "").trim();
        const companyAdvisedRole = companyAdvisedRoleRaw.toLowerCase();
        const companyAdvisedHref =
          companyAdvisedId && companyAdvisedName !== "-"
            ? companyAdvisedRole.includes("investor")
              ? `/investors/${companyAdvisedId}`
              : `/company/${companyAdvisedId}`
            : undefined;

        const sectors = parseEventSectors(event.primary_sectors);

        const dealType = event.deal_type || "-";

        return (
          <div
            key={getAdvisorDealRowKey(event, rowIndex)}
            style={{
              display: "grid",
              gridTemplateColumns: SUMMARY_ROW_GRID,
              gap: COL_GAP,
              alignItems: "center",
              padding: PROFILE_EVENTS_ROW_PAD.body,
              borderBottom: isLastRow ? "none" : `1px solid ${T.hair}`,
            }}
          >
            <div style={{ textAlign: colAlign(0), minWidth: 0 }}>
              {event.id > 0 ? (
                <Link
                  href={`/corporate-event/${event.id}`}
                  prefetch={false}
                  title={event.description || undefined}
                  style={{
                    color: T.azure,
                    textDecoration: "underline",
                    fontWeight: 500,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    wordBreak: "break-word" as const,
                  }}
                >
                  {event.description || "-"}
                </Link>
              ) : (
                <span style={{ color: T.body, wordBreak: "break-word" as const }}>
                  {event.description || "-"}
                </span>
              )}
            </div>
            <div
              style={{
                textAlign: colAlign(1),
                color: T.body,
                whiteSpace: "nowrap",
              }}
            >
              {formatMonthYear(event.announcement_date)}
            </div>
            <div style={{ textAlign: colAlign(2) }}>
              <DealTypeBadge dealType={dealType} />
            </div>
            <div
              style={{
                textAlign: colAlign(3),
                color: T.body,
                minWidth: 0,
              }}
            >
              {formatSideAdvised(companyAdvisedRoleRaw)}
            </div>
            <div style={{ textAlign: colAlign(4), minWidth: 0 }}>
              {companyAdvisedHref ? (
                <Link
                  href={companyAdvisedHref}
                  prefetch={false}
                  style={{
                    color: T.azure,
                    textDecoration: "underline",
                    fontWeight: 500,
                  }}
                >
                  {companyAdvisedName}
                </Link>
              ) : (
                companyAdvisedName
              )}
            </div>
            <div
              style={{
                textAlign: colAlign(5),
                minWidth: 0,
              }}
            >
              <DealSectorLinks
                sectors={sectors}
                sectorNameToId={sectorNameToId}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AdvisorDealsProfilePanel({
  events,
  totalCount,
  variant = "summary",
  filterPrimarySectors = [],
  filterSecondarySectors = [],
  selectedFilterPrimary = [],
  selectedFilterSecondary = [],
  loadingFilterPrimary = false,
  loadingFilterSecondary = false,
  onAddPrimaryFilter,
  onRemovePrimaryFilter,
  onAddSecondaryFilter,
  onRemoveSecondaryFilter,
  onClearFilters,
  onExportCsv,
  exportingDeals = false,
  pageSize = 3,
}: Props) {
  const [showAll, setShowAll] = useState(false);
  const isSummary = variant === "summary";
  const sectorNameToId = useGlobalSectorNameLookup();

  const sortedEvents = useMemo(() => sortEventsByDateDesc(events), [events]);

  const displayed = showAll ? sortedEvents : sortedEvents.slice(0, pageSize);
  const total = totalCount > 0 ? totalCount : sortedEvents.length;

  const headerRight = useMemo(
    () => headerRightLine(total, pageSize, showAll),
    [pageSize, showAll, total]
  );

  const rowGrid = isSummary ? SUMMARY_ROW_GRID : FULL_ROW_GRID;
  const headers = isSummary ? SUMMARY_HEADERS : FULL_HEADERS;

  return (
    <div
      style={{
        fontFamily: T.sans,
        minWidth: 0,
        maxWidth: "100%",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {isSummary ? (
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
            Deals Advised
          </div>
          {headerRight ? (
            <div style={{ fontSize: "11.5px", color: T.muted }}>{headerRight}</div>
          ) : null}
        </div>
      ) : (
        <LinkedH showArrow right={headerRight || undefined}>
          Deals Advised
        </LinkedH>
      )}

      {!isSummary ? (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              padding: "12px 16px",
              borderBottom: `1px solid ${T.hair}`,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 180, flex: 1 }}>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 500,
                  color: T.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.35,
                }}
              >
                Primary Sector
              </span>
              <SearchableSelect
                options={filterPrimarySectors.map((s) => ({ value: s.id, label: s.sector_name }))}
                value=""
                onChange={(value) => {
                  if (typeof value === "number") onAddPrimaryFilter?.(value);
                }}
                placeholder={loadingFilterPrimary ? "Loading…" : "Filter by primary sector"}
                disabled={loadingFilterPrimary}
                style={{
                  padding: "7px 10px",
                  fontSize: 12,
                  border: `1px solid ${T.divider}`,
                  borderRadius: 6,
                  width: "100%",
                  color: T.body,
                  fontFamily: T.sans,
                }}
              />
              {selectedFilterPrimary.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {selectedFilterPrimary.map((id) => {
                    const s = filterPrimarySectors.find((x) => x.id === id);
                    return (
                      <Pill key={id} tone="azure" style={{ gap: 4 }}>
                        {s?.sector_name ?? id}
                        <button
                          type="button"
                          onClick={() => onRemovePrimaryFilter?.(id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "inherit",
                            padding: 0,
                            lineHeight: 1,
                            fontSize: 13,
                          }}
                        >
                          ×
                        </button>
                      </Pill>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 180, flex: 1 }}>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 500,
                  color: T.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.35,
                }}
              >
                Sub-Sector
              </span>
              <SearchableSelect
                options={filterSecondarySectors.map((s) => ({ value: s.id, label: s.sector_name }))}
                value=""
                onChange={(value) => {
                  if (typeof value === "number") onAddSecondaryFilter?.(value);
                }}
                placeholder={
                  loadingFilterSecondary
                    ? "Loading…"
                    : selectedFilterPrimary.length === 0
                      ? "Select primary first"
                      : "Filter by sub-sector"
                }
                disabled={loadingFilterSecondary || selectedFilterPrimary.length === 0}
                style={{
                  padding: "7px 10px",
                  fontSize: 12,
                  border: `1px solid ${T.divider}`,
                  borderRadius: 6,
                  width: "100%",
                  color: T.body,
                  fontFamily: T.sans,
                }}
              />
              {selectedFilterSecondary.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {selectedFilterSecondary.map((id) => {
                    const s = filterSecondarySectors.find((x) => x.id === id);
                    return (
                      <Pill key={id} tone="lavender" style={{ gap: 4 }}>
                        {s?.sector_name ?? id}
                        <button
                          type="button"
                          onClick={() => onRemoveSecondaryFilter?.(id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "inherit",
                            padding: 0,
                            lineHeight: 1,
                            fontSize: 13,
                          }}
                        >
                          ×
                        </button>
                      </Pill>
                    );
                  })}
                </div>
              )}
            </div>

            {(selectedFilterPrimary.length > 0 || selectedFilterSecondary.length > 0) && (
              <button
                type="button"
                onClick={() => onClearFilters?.()}
                style={{
                  alignSelf: "flex-end",
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: `1px solid ${T.divider}`,
                  background: T.panel,
                  color: T.muted,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: T.sans,
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          {events.length > 0 && onExportCsv ? (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                padding: "10px 16px 0",
              }}
            >
              <button
                type="button"
                onClick={onExportCsv}
                disabled={exportingDeals}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: exportingDeals ? T.faint : T.emerald,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: exportingDeals ? "not-allowed" : "pointer",
                  fontFamily: T.sans,
                }}
              >
                {exportingDeals ? "Exporting…" : "Export CSV"}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      <div style={{ overflowX: "auto", maxWidth: "100%", minWidth: 0, flex: 1, minHeight: 0 }}>
        {isSummary ? (
          <SummaryDealsTable
            events={displayed}
            sectorNameToId={sectorNameToId}
          />
        ) : (
        <div
          style={{
            width: "100%",
            minWidth: 720,
            ...profileTableCellStyle,
          }}
        >
          <div
            style={{
              ...tableColHeaderBarStyle,
              gridTemplateColumns: rowGrid,
              gap: COL_GAP,
              padding: "8px 16px",
            }}
          >
            {headers.map((h, colIndex) => (
              <div
                key={h}
                style={{
                  ...tableColHeaderStyle,
                  textAlign: profileTableColAlign(colIndex),
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {displayed.length > 0 ? (
            displayed.map((event, index) => {
              const last = index === displayed.length - 1;
              const colAlign = (colIndex: number) => profileTableColAlign(colIndex);
              const cellStyle = { minWidth: 0 };

              const companyAdvisedId = event.company_advised_id ?? null;
              const companyAdvisedName = (event.company_advised_name || "").trim() || "-";
              const companyAdvisedRoleRaw = String(event.company_advised_role || "").trim();
              const companyAdvisedRole = companyAdvisedRoleRaw.toLowerCase();
              const companyAdvisedHref =
                companyAdvisedId && companyAdvisedName !== "-"
                  ? companyAdvisedRole.includes("investor")
                    ? `/investors/${companyAdvisedId}`
                    : `/company/${companyAdvisedId}`
                  : undefined;

              const sectors = parseEventSectors(event.primary_sectors);

              const dealType = event.deal_type || "-";
              const individuals = coerceArray<{ id?: number; name?: string }>(
                event.advisor_individuals
              ).filter(
                (p) => p && typeof p.id === "number" && String(p.name || "").trim().length > 0
              );

              return (
                <div
                  key={getAdvisorDealRowKey(event, index)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: rowGrid,
                    gap: COL_GAP,
                    alignItems: "center",
                    padding: "10px 16px",
                    borderBottom: last ? "none" : `1px solid ${T.hair}`,
                    fontSize: 12.5,
                  }}
                >
                  <div style={{ ...cellStyle, textAlign: colAlign(0) }}>
                    {event.id > 0 ? (
                      <Link
                        href={`/corporate-event/${event.id}`}
                        prefetch={false}
                        title={event.description || undefined}
                        style={{
                          color: T.azure,
                          textDecoration: "underline",
                          fontWeight: 500,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          wordBreak: "break-word" as const,
                        }}
                      >
                        {event.description || "-"}
                      </Link>
                    ) : (
                      <span style={{ color: T.body, wordBreak: "break-word" as const }}>
                        {event.description || "-"}
                      </span>
                    )}
                  </div>
                  <div style={{ ...cellStyle, textAlign: colAlign(1), color: T.body, whiteSpace: "nowrap" }}>
                    {formatMonthYear(event.announcement_date)}
                  </div>
                  <div style={{ ...cellStyle, textAlign: colAlign(2) }}>
                    <DealTypeBadge dealType={dealType} />
                  </div>
                  <div style={{ ...cellStyle, textAlign: colAlign(3), color: T.body }}>
                    {formatSideAdvised(companyAdvisedRoleRaw)}
                  </div>
                  <div style={{ ...cellStyle, textAlign: colAlign(4) }}>
                    {companyAdvisedHref ? (
                      <Link
                        href={companyAdvisedHref}
                        prefetch={false}
                        style={{ color: T.azure, textDecoration: "underline", fontWeight: 500 }}
                      >
                        {companyAdvisedName}
                      </Link>
                    ) : (
                      companyAdvisedName
                    )}
                  </div>
                  <div style={{ ...cellStyle, textAlign: colAlign(5), color: T.body }}>
                    <DealSectorLinks
                sectors={sectors}
                sectorNameToId={sectorNameToId}
              />
                  </div>
                  <div
                    style={{
                      textAlign: colAlign(6),
                      color: T.body,
                      fontFamily: T.mono,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatEnterpriseValue(event.enterprise_value_m, event.currency_name)}
                  </div>
                  <div style={{ textAlign: colAlign(7), color: T.muted, minWidth: 0 }}>
                    {individuals.length > 0
                      ? individuals.map((p, i) => (
                          <span key={`${p.id}-${i}`}>
                            <Link
                              href={`/individual/${p.id}`}
                              prefetch={false}
                              style={{ color: T.azure, textDecoration: "underline" }}
                            >
                              {String(p.name)}
                            </Link>
                            {i < individuals.length - 1 ? ", " : ""}
                          </span>
                        ))
                      : "-"}
                  </div>
                </div>
              );
            })
          ) : (
            <div
              style={{
                padding: "20px 16px",
                color: T.muted,
                fontSize: "12.5px",
                textAlign: "center",
              }}
            >
              {totalCount > 0 ? "No deals match the selected filters." : "No deals advised available"}
            </div>
          )}
        </div>
        )}
      </div>

      {isSummary && total > pageSize ? (
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

      {!isSummary && sortedEvents.length > pageSize && !showAll ? (
        <div style={{ padding: "10px 16px 14px", borderTop: `1px solid ${T.hair}` }}>
          <button
            type="button"
            onClick={() => setShowAll(true)}
            style={{
              padding: 0,
              border: "none",
              background: "none",
              color: T.azure,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: T.sans,
            }}
          >
            See all {sortedEvents.length} deals
          </button>
        </div>
      ) : null}
    </div>
  );
}
