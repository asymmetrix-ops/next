"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  profileTableColAlign,
  profileTableCellStyle,
  tableColHeaderBarStyle,
  tableColHeaderStyle,
  T,
  Pill,
} from "@/components/redesign/primitives";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { formatCurrency, formatDate } from "@/utils/advisorHelpers";

export type AdvisorDealEvent = {
  id: number;
  description?: string | null;
  announcement_date?: string | null;
  deal_type?: string | null;
  company_advised_id?: number | null;
  company_advised_name?: string | null;
  company_advised_role?: string | null;
  enterprise_value_m?: string | number | null;
  currency_name?: string | null;
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
  loadingFilters?: boolean;
  filterPrimarySectors: SectorOption[];
  filterSecondarySectors: SectorOption[];
  selectedFilterPrimary: number[];
  selectedFilterSecondary: number[];
  loadingFilterPrimary?: boolean;
  loadingFilterSecondary?: boolean;
  onAddPrimaryFilter: (id: number) => void;
  onRemovePrimaryFilter: (id: number) => void;
  onAddSecondaryFilter: (id: number) => void;
  onRemoveSecondaryFilter: (id: number) => void;
  onClearFilters: () => void;
  onExportCsv?: () => void;
  exportingDeals?: boolean;
  maxInitial?: number;
};

const DEALS_ROW_GRID =
  "minmax(0, 1.1fr) minmax(80px, auto) minmax(92px, auto) minmax(0, 0.9fr) minmax(0, 1fr) minmax(0, 1fr) minmax(80px, auto) minmax(0, 0.9fr)";

const COL_GAP = 8;

const HEADERS = [
  "Description",
  "Date",
  "Type",
  "Counterparty",
  "Client",
  "Sector(s)",
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

function dealTypeTone(dealType: string): "coral" | "azure" | "neutral" {
  const d = dealType.toLowerCase();
  if (d.includes("acquisition") || d.includes("merger")) return "azure";
  if (d.includes("divest")) return "coral";
  return "neutral";
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
    const key = `${s.id}:${s.importance.toLowerCase()}`;
    if (!m.has(key)) m.set(key, s);
  }
  return Array.from(m.values());
}

export function AdvisorDealsProfilePanel({
  events,
  totalCount,
  filterPrimarySectors,
  filterSecondarySectors,
  selectedFilterPrimary,
  selectedFilterSecondary,
  loadingFilterPrimary = false,
  loadingFilterSecondary = false,
  onAddPrimaryFilter,
  onRemovePrimaryFilter,
  onAddSecondaryFilter,
  onRemoveSecondaryFilter,
  onClearFilters,
  onExportCsv,
  exportingDeals = false,
  maxInitial = 10,
}: Props) {
  const [showAll, setShowAll] = useState(false);

  const headerRight = useMemo(() => {
    if (events.length === 0) return "";
    const hasFilters =
      selectedFilterPrimary.length > 0 || selectedFilterSecondary.length > 0;
    if (hasFilters) {
      return `${events.length} of ${totalCount} deals`;
    }
    return `${events.length} deal${events.length === 1 ? "" : "s"}`;
  }, [events.length, selectedFilterPrimary.length, selectedFilterSecondary.length, totalCount]);

  const displayed = showAll ? events : events.slice(0, maxInitial);

  return (
    <div style={{ fontFamily: T.sans, minWidth: 0, maxWidth: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "14px 16px 12px",
          borderBottom: `1px solid ${T.hair}`,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: "13.5px", fontWeight: 600, color: T.ink }}>Deals Advised</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {headerRight ? (
            <div style={{ fontSize: "11.5px", color: T.muted }}>{headerRight}</div>
          ) : null}
          {events.length > 0 && onExportCsv ? (
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
          ) : null}
        </div>
      </div>

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
          <span style={{ fontSize: 10.5, fontWeight: 500, color: T.muted, textTransform: "uppercase", letterSpacing: 0.35 }}>
            Primary Sector
          </span>
          <SearchableSelect
            options={filterPrimarySectors.map((s) => ({ value: s.id, label: s.sector_name }))}
            value=""
            onChange={(value) => {
              if (typeof value === "number") onAddPrimaryFilter(value);
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
                      onClick={() => onRemovePrimaryFilter(id)}
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
          <span style={{ fontSize: 10.5, fontWeight: 500, color: T.muted, textTransform: "uppercase", letterSpacing: 0.35 }}>
            Sub-Sector
          </span>
          <SearchableSelect
            options={filterSecondarySectors.map((s) => ({ value: s.id, label: s.sector_name }))}
            value=""
            onChange={(value) => {
              if (typeof value === "number") onAddSecondaryFilter(value);
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
                      onClick={() => onRemoveSecondaryFilter(id)}
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
            onClick={onClearFilters}
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

      <div style={{ overflowX: "auto", maxWidth: "100%", minWidth: 0 }}>
        <div style={{ width: "100%", minWidth: 720, ...profileTableCellStyle }}>
          <div
            style={{
              ...tableColHeaderBarStyle,
              gridTemplateColumns: DEALS_ROW_GRID,
              gap: COL_GAP,
              padding: "8px 16px",
            }}
          >
            {HEADERS.map((h, colIndex) => (
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

              const individuals = coerceArray<{ id?: number; name?: string }>(
                event.advisor_individuals
              ).filter(
                (p) => p && typeof p.id === "number" && String(p.name || "").trim().length > 0
              );

              const sectors = dedupeSectors(
                coerceArray<{
                  id?: number;
                  is_derived?: boolean;
                  sector_name?: string;
                  sector_importance?: string;
                }>(event.primary_sectors)
                  .filter(
                    (s) =>
                      s &&
                      typeof s.id === "number" &&
                      String(s.sector_name || "").trim().length > 0
                  )
                  .map((s) => ({
                    id: s.id as number,
                    name: String(s.sector_name).trim(),
                    importance: String(s.sector_importance || "").trim(),
                    isDerived: Boolean(s.is_derived),
                  }))
              );

              const dealType = event.deal_type || "-";

              return (
                <div
                  key={event.id ?? index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: DEALS_ROW_GRID,
                    gap: COL_GAP,
                    alignItems: "center",
                    padding: "10px 16px",
                    borderBottom: last ? "none" : `1px solid ${T.hair}`,
                  }}
                >
                  <div style={{ textAlign: colAlign(0), minWidth: 0 }}>
                    <Link
                      href={`/corporate-event/${event.id}`}
                      prefetch={false}
                      style={{
                        color: T.azure,
                        textDecoration: "underline",
                        fontWeight: 500,
                        wordBreak: "break-word" as const,
                      }}
                    >
                      {event.description || "-"}
                    </Link>
                  </div>
                  <div style={{ textAlign: colAlign(1), color: T.body, whiteSpace: "nowrap" }}>
                    {event.announcement_date ? formatDate(event.announcement_date) : "-"}
                  </div>
                  <div style={{ textAlign: colAlign(2) }}>
                    <Pill tone={dealTypeTone(dealType)}>{dealType}</Pill>
                  </div>
                  <div style={{ textAlign: colAlign(3), color: T.body, minWidth: 0 }}>
                    {companyAdvisedRoleRaw || "-"}
                  </div>
                  <div style={{ textAlign: colAlign(4), minWidth: 0 }}>
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
                  <div style={{ textAlign: colAlign(5), color: T.body, minWidth: 0 }}>
                    {sectors.length > 0
                      ? sectors.map((s, i) => {
                          const isPrimary = s.importance.toLowerCase().includes("primary");
                          const href = isPrimary ? `/sector/${s.id}` : `/sub-sector/${s.id}`;
                          return (
                            <span key={`${s.id}-${i}`}>
                              <Link href={href} prefetch={false} style={{ color: T.azure, textDecoration: "underline" }}>
                                {s.name}
                              </Link>
                              {i < sectors.length - 1 ? ", " : ""}
                            </span>
                          );
                        })
                      : "-"}
                  </div>
                  <div style={{ textAlign: colAlign(6), color: T.body, fontFamily: T.mono, whiteSpace: "nowrap" }}>
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
      </div>

      {events.length > maxInitial && !showAll ? (
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
            See all {events.length} deals
          </button>
        </div>
      ) : null}
    </div>
  );
}
