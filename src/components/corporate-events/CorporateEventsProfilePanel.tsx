"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  profileTableColAlign,
  profileTableCellStyle,
  PROFILE_EVENTS_ROW_GAP,
  PROFILE_EVENTS_ROW_GRID,
  PROFILE_EVENTS_ROW_PAD,
  tableColHeaderBarStyle,
  tableColHeaderStyle,
} from "@/components/redesign/primitives";
import type { CorporateEvent, Sector } from "./CorporateEventsTable";
import { isNonEmptyDisplayString as isNonEmptyString } from "@/lib/emptyDisplay";
import { appendMetricCurrency } from "@/lib/buildFinancialMetricsSections";

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
  /** Target company id → primary sector names (e.g. from subsidiaries on the company payload). */
  primarySectorsByCompanyId?: Record<number, string[]>;
  maxInitialEvents?: number;
  /** `narrow` = single grid column; table scrolls inside card without widening the layout */
  layout?: "default" | "narrow";
  onEventClick?: (eventId: number, description?: string) => void;
  onAdvisorClick?: (advisorId?: number, advisorName?: string) => void;
};

const sanitizeAmountValue = (
  value?: number | string | null
): number | string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const num = Number(trimmed.replace(/,/g, ""));
  return Number.isNaN(num) ? trimmed : num;
};

const formatMillions = (
  amount: number | string | null | undefined,
  currency: string | null | undefined
): string | null => {
  if (amount == null || !isNonEmptyString(currency)) return null;
  const n =
    typeof amount === "number"
      ? amount
      : Number(String(amount).replace(/,/g, "").trim());
  if (Number.isNaN(n)) return null;
  return appendMetricCurrency(
    n.toLocaleString(undefined, { maximumFractionDigits: 3 }),
    currency
  );
};

/** Normalize API display strings like "15 USD" to Financial Metrics style ($15). */
function normalizeAmountDisplayText(
  raw: string,
  currencyHint?: string
): string {
  const trimmed = raw.trim();
  const numThenCurrency = trimmed.match(/^([\d,]+(?:\.\d+)?)\s*([A-Za-z$£€¥]+)$/);
  if (numThenCurrency) {
    return appendMetricCurrency(numThenCurrency[1], numThenCurrency[2]);
  }
  const currencyThenNum = trimmed.match(/^([A-Za-z$£€¥]+)\s*([\d,]+(?:\.\d+)?)$/);
  if (currencyThenNum) {
    return appendMetricCurrency(currencyThenNum[2], currencyThenNum[1]);
  }
  if (/[$£€¥]/.test(trimmed)) return trimmed;
  const numOnly = trimmed.match(/^([\d,]+(?:\.\d+)?)/);
  if (numOnly && currencyHint) {
    return appendMetricCurrency(numOnly[1], currencyHint);
  }
  return trimmed;
}

function formatMonthYear(iso?: string | null): string {
  if (!iso) return "-";
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

function headerRightLine(events: CorporateEvent[], loading: boolean): string {
  if (loading || events.length === 0) return "";
  const years = events
    .map((e) => {
      const ev = e as {
        announcement_date?: string;
      };
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
  const n = events.length;
  return `${n} event${n === 1 ? "" : "s"} · Last ${span} yrs`;
}

function formatPrimarySectorNames(primary: Sector[]): string {
  const names = primary.map((s) => s.sector_name).filter(Boolean) as string[];
  if (names.length === 0) return "-";
  return names.slice(0, 3).join(", ");
}

function coercePrimarySectorNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const name = (item as { sector_name?: string; name?: string }).sector_name
          ?? (item as { name?: string }).name;
        return typeof name === "string" ? name.trim() : "";
      }
      return "";
    })
    .filter((name) => isNonEmptyString(name));
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

/** Primary sectors only — event API → target company lookup → profile company primary. */
function eventPrimarySectorLabel(
  event: CorporateEvent,
  fallbackPrimary: Sector[],
  primarySectorsByCompanyId?: Record<number, string[]>
): string {
  const ne = event as { sectors?: { Primary?: unknown[] } };

  const fromEvent = coercePrimarySectorNames(ne.sectors?.Primary);
  if (fromEvent.length > 0) return fromEvent.slice(0, 3).join(", ");

  const targetId = resolveTargetCompanyId(event);
  if (targetId != null && primarySectorsByCompanyId?.[targetId]?.length) {
    return primarySectorsByCompanyId[targetId].slice(0, 3).join(", ");
  }

  return formatPrimarySectorNames(fallbackPrimary);
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

function formatAmountCell(event: CorporateEvent): string {
  const ne = event as {
    deal_type?: string;
    investment_display?: string | null;
    ev_display?: string | null;
    investment_data?: {
      investment_amount_m?: number | string;
      investment_amount?: number | string;
      currency?: string | { Currency?: string } | null;
      _currency?: { Currency?: string };
    };
    ev_data?: {
      enterprise_value_m?: number | string;
      ev_band?: string;
      currency?: { Currency?: string } | null;
      _currency?: { Currency?: string };
    };
  };
  const le = event as {
    deal_type?: string;
    investment_display?: string | null;
    ev_display?: string | null;
    investment_data?: typeof ne.investment_data;
    ev_data?: typeof ne.ev_data;
  };

  const dealType = ne.deal_type || le.deal_type || "";
  if (/partnership/i.test(dealType)) return "-";

  const anyEvent = event as unknown as typeof ne;
  const amountDisplay =
    ne.investment_display ?? le.investment_display ?? null;
  const amountRaw =
    anyEvent.investment_data?.investment_amount_m ??
    anyEvent.investment_data?.investment_amount ??
    null;
  const amountMillions = sanitizeAmountValue(amountRaw);
  const amountCurrency: string | undefined =
    typeof anyEvent.investment_data?.currency === "string"
      ? anyEvent.investment_data.currency
      : anyEvent.investment_data?.currency?.Currency ||
        anyEvent.investment_data?._currency?.Currency;

  const evDataRaw = le.ev_data || ne.ev_data;
  const evMillions = sanitizeAmountValue(
    evDataRaw?.enterprise_value_m ?? null
  );
  const evCurrency: string | undefined =
    evDataRaw?._currency?.Currency || evDataRaw?.currency?.Currency;
  const hasEvNumeric =
    evMillions !== null &&
    typeof evCurrency === "string" &&
    evCurrency.trim().length > 0;
  const evDisplay =
    ne.ev_display ?? le.ev_display ?? null;
  const evBandFallback = hasEvNumeric ? null : evDataRaw?.ev_band || null;

  const inv = formatMillions(amountMillions, amountCurrency);
  if (inv) return inv;
  if (isNonEmptyString(amountDisplay)) {
    return normalizeAmountDisplayText(amountDisplay, amountCurrency);
  }
  if (isNonEmptyString(evDisplay)) {
    return normalizeAmountDisplayText(evDisplay, evCurrency);
  }
  const evNum = formatMillions(evMillions, evCurrency);
  if (evNum) return evNum;
  if (isNonEmptyString(evBandFallback)) return evBandFallback;
  return "-";
}

function dealTypePillTone(dealType: string): "acq" | "div" | "neu" {
  const d = dealType.toLowerCase();
  if (d.includes("acquisition") || d.includes("merger")) return "acq";
  if (d.includes("divest")) return "div";
  return "neu";
}

function renderTargetCell(event: CorporateEvent, linkColor: string): React.ReactNode {
  const ne = event as {
    deal_type?: string;
    targets?: Array<{
      id: number;
      name: string;
      page_type?: string;
      route?: string;
    }>;
    target_company?: { id?: number; name?: string; page_type?: string };
    target_counterparty?: {
      new_company_counterparty?: number;
      new_company?: { id?: number; name?: string };
      _new_company?: { id?: number; name?: string };
    };
  };
  const le = event as { deal_type?: string; target_label?: string };
  const isPartnership = /partnership/i.test(
    ne.deal_type || le.deal_type || ""
  );
  const targets = ne.targets;

  const legacyTarget =
    ne.target_counterparty?.new_company ||
    ne.target_counterparty?._new_company;
  const legacyTargetId = ne.target_counterparty?.new_company_counterparty;

  if (Array.isArray(targets) && targets.length > 0) {
    const list = isPartnership ? targets : targets.slice(0, 1);
    return list.map((tgt, i, arr) => {
      const pageType =
        tgt.page_type === "investor"
          ? "investors"
          : tgt.route === "investor" || tgt.route === "investors"
          ? "investors"
          : "company";
      const href = `/${pageType}/${tgt.id}`;
      return (
        <span key={`${tgt.id}-${i}`}>
          <a
            href={href}
            style={{
              color: linkColor,
              textDecoration: "underline",
              fontWeight: 500,
            }}
          >
            {tgt.name}
          </a>
          {i < arr.length - 1 ? ", " : ""}
        </span>
      );
    });
  }
  if (legacyTarget?.name && legacyTargetId) {
    return (
      <a
        href={`/company/${legacyTargetId}`}
        style={{
          color: linkColor,
          textDecoration: "underline",
          fontWeight: 500,
        }}
      >
        {legacyTarget.name}
      </a>
    );
  }
  if (ne.target_company?.name) {
    const pageType =
      ne.target_company.page_type === "investor" ? "investors" : "company";
    const href = ne.target_company.id
      ? `/${pageType}/${ne.target_company.id}`
      : undefined;
    if (href) {
      return (
        <a
          href={href}
          style={{
            color: linkColor,
            textDecoration: "underline",
            fontWeight: 500,
          }}
        >
          {ne.target_company.name}
        </a>
      );
    }
    return (
      <span style={{ fontWeight: 500, color: "inherit" }}>
        {ne.target_company.name}
      </span>
    );
  }
  if (isNonEmptyString(le.target_label)) {
    return <span style={{ fontWeight: 500 }}>{le.target_label}</span>;
  }
  return "-";
}

const CE_HEADERS = [
  "Date",
  "Type",
  "Target / Counterparty",
  "Advisors",
  "Sector",
  "Amount (m)",
] as const;

const CE_COL_GRID_NARROW =
  "minmax(88px, auto) minmax(108px, auto) minmax(0, 1fr)";

export const CorporateEventsProfilePanel: React.FC<
  CorporateEventsProfilePanelProps
> = ({
  tokens: T,
  events,
  loading = false,
  primarySectors = [],
  primarySectorsByCompanyId,
  maxInitialEvents = 3,
  layout = "default",
  onEventClick,
  onAdvisorClick,
}) => {
  const narrow = layout === "narrow";
  const headers = narrow
    ? (["Date", "Type", "Target / Counterparty"] as const)
    : CE_HEADERS;
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);

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
    () => headerRightLine(events, loading),
    [events, loading]
  );

  const displayed = showAll ? events : events.slice(0, maxInitialEvents);

  if (loading) {
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

  return (
    <div style={{ fontFamily: T.sans, minWidth: 0, maxWidth: "100%" }}>
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
        }}
      >
        <div style={{ width: "100%", minWidth: 0, ...profileTableCellStyle }}>
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
                  textAlign: profileTableColAlign(colIndex),
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {displayed.length > 0 ? (
            displayed.map((event, index) => {
              const ne = event as { announcement_date?: string };
              const le = event as { announcement_date?: string };
              const dateRaw = ne.announcement_date || le.announcement_date;
              const dealTypeStr =
                (event as { deal_type?: string }).deal_type || "-";
              const pillTone = dealTypePillTone(dealTypeStr);
              const desc =
                (event as { description?: string }).description || "";
              const advisorList = collectAdvisors(event);
              const pillStyle =
                pillTone === "acq"
                  ? { background: T.azureSoft, color: T.azure }
                  : pillTone === "div"
                  ? { background: T.coralSoft, color: T.down }
                  : { background: T.inset, color: T.muted };

              const cellPad = narrow ? "10px 8px" : PROFILE_EVENTS_ROW_PAD.body;
              const last = index === displayed.length - 1;
              const colAlign = (colIndex: number) => profileTableColAlign(colIndex);

              return (
                <div
                  key={event.id ?? `ce-${index}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: narrow
                      ? CE_COL_GRID_NARROW
                      : PROFILE_EVENTS_ROW_GRID,
                    gap: PROFILE_EVENTS_ROW_GAP,
                    alignItems: "center",
                    padding: cellPad,
                    borderBottom: last ? "none" : `1px solid ${T.hair}`,
                  }}
                >
                  <div
                    style={{
                      textAlign: colAlign(0),
                      color: T.body,
                      whiteSpace: narrow ? "nowrap" : undefined,
                    }}
                  >
                    {event.id ? (
                      <a
                        href={`/corporate-event/${event.id}`}
                        style={{
                          color: T.azure,
                          textDecoration: "underline",
                          cursor: "pointer",
                          fontWeight: 500,
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          handleEventNav(event.id, desc);
                        }}
                      >
                        {formatMonthYear(dateRaw)}
                      </a>
                    ) : (
                      formatMonthYear(dateRaw)
                    )}
                  </div>
                  <div style={{ textAlign: colAlign(1) }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: narrow ? "2px 7px" : "3px 9px",
                        borderRadius: 999,
                        fontSize: narrow ? "10.5px" : "11.5px",
                        fontWeight: 600,
                        ...pillStyle,
                      }}
                    >
                      {dealTypeStr}
                    </span>
                  </div>
                  <div
                    style={{
                      textAlign: colAlign(2),
                      color: T.ink,
                      minWidth: 0,
                      overflow: narrow ? "hidden" : undefined,
                      textOverflow: narrow ? "ellipsis" : undefined,
                      whiteSpace: narrow ? "nowrap" : undefined,
                    }}
                  >
                    {renderTargetCell(event, T.azure)}
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
                        {eventPrimarySectorLabel(
                          event,
                          primarySectors,
                          primarySectorsByCompanyId
                        )}
                      </div>
                      <div style={{ textAlign: colAlign(5) }}>
                        {formatAmountCell(event)}
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

      {events.length > maxInitialEvents ? (
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
