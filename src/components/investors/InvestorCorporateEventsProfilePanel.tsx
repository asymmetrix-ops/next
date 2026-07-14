"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  LinkPanel,
  LinkedH,
  Pill,
  T,
  profileTableCellStyle,
  tableColHeaderStyle,
} from "@/components/redesign/primitives";
import { CorporateEventTargetLink } from "@/components/corporate-events/CorporateEventPartyLink";
import { isNonEmptyDisplayString as isNonEmptyString } from "@/lib/emptyDisplay";
import type { CorporateEvent } from "@/components/corporate-events/CorporateEventsTable";
import { DealTypeBadge } from "@/components/corporate-events/DealTypeBadge";

type Props = {
  events: CorporateEvent[];
  loading?: boolean;
  maxInitialEvents?: number;
  fillGridCell?: boolean;
};

const CE_ROW_GRID =
  "minmax(100px, auto) minmax(0, 1fr) minmax(96px, auto) minmax(0, 1.1fr) minmax(96px, auto) minmax(120px, 0.85fr)";
const COL_GAP = 8;
const TABLE_X_PAD = 16;
const HEADERS = ["Date", "Target", "Type", "Co-investors", "Amount", "Advisor"] as const;
const COL_ALIGN: Array<"left" | "right"> = [
  "left",
  "left",
  "left",
  "left",
  "right",
  "right",
];

function formatFullDate(iso?: string | null): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

function sanitizeAmountValue(value?: number | string | null): number | string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const num = Number(trimmed.replace(/,/g, ""));
  return Number.isNaN(num) ? trimmed : num;
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

  const dealType = ne.deal_type || "";
  if (/partnership/i.test(dealType)) return "-";

  const amountDisplay = ne.investment_display ?? null;
  if (isNonEmptyString(amountDisplay)) return amountDisplay;

  const amountRaw =
    ne.investment_data?.investment_amount_m ?? ne.investment_data?.investment_amount ?? null;
  const amount = sanitizeAmountValue(amountRaw);
  const currency =
    typeof ne.investment_data?.currency === "string"
      ? ne.investment_data.currency
      : ne.investment_data?.currency?.Currency ||
        ne.investment_data?._currency?.Currency;

  if (amount != null && typeof amount === "number" && isNonEmptyString(currency)) {
    const cur = currency!.trim();
    const prefix = cur.length <= 4 ? `${cur} ` : `${cur} `;
    return `${prefix}${amount.toLocaleString(undefined, { maximumFractionDigits: 1 })}m`;
  }

  const evDisplay = ne.ev_display ?? null;
  if (isNonEmptyString(evDisplay)) return evDisplay;

  const evRaw = ne.ev_data?.enterprise_value_m ?? null;
  const evAmount = sanitizeAmountValue(evRaw);
  const evCurrency =
    ne.ev_data?._currency?.Currency || ne.ev_data?.currency?.Currency;
  if (evAmount != null && typeof evAmount === "number" && isNonEmptyString(evCurrency)) {
    return `${evCurrency!.trim()} ${evAmount.toLocaleString(undefined, { maximumFractionDigits: 1 })}m`;
  }

  if (isNonEmptyString(ne.ev_data?.ev_band)) return ne.ev_data!.ev_band!;
  return "-";
}

type Coinvestor = { id?: number; name: string; href?: string };

function collectCoinvestors(event: CorporateEvent): Coinvestor[] {
  const ne = event as {
    other_counterparties?: Array<{
      id?: number;
      name?: string;
      page_type?: string;
      counterparty_status?: string;
      _new_company?: { id?: number; name?: string; _is_that_investor?: boolean };
      _counterparty_type?: { counterparty_status?: string };
    }>;
    "0"?: Array<{ _new_company?: { id?: number; name?: string; _is_that_investor?: boolean } }>;
  };

  const out: Coinvestor[] = [];
  const seen = new Set<string>();

  const push = (name?: string, id?: number, pageType?: string) => {
    const trimmed = (name || "").trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) return;
    seen.add(trimmed.toLowerCase());
    const route =
      pageType === "investor" || pageType === "investors" ? "investors" : "company";
    out.push({
      id,
      name: trimmed,
      href: id ? `/${route}/${id}` : undefined,
    });
  };

  if (Array.isArray(ne.other_counterparties)) {
    for (const cp of ne.other_counterparties) {
      const status = (
        cp.counterparty_status ||
        cp._counterparty_type?.counterparty_status ||
        ""
      ).toLowerCase();
      const isInvestor =
        status.includes("investor") || cp._new_company?._is_that_investor === true;
      if (!isInvestor) continue;
      push(cp.name || cp._new_company?.name, cp.id || cp._new_company?.id, cp.page_type);
    }
  }

  if (Array.isArray(ne["0"])) {
    for (const entry of ne["0"]) {
      const nc = entry._new_company;
      if (nc?._is_that_investor) {
        push(nc.name, nc.id);
      }
    }
  }

  return out;
}

type AdvisorEntry = { id?: number; name: string };

function collectAdvisors(event: CorporateEvent): AdvisorEntry[] {
  const ne = event as {
    advisors?: Array<{
      advisor_company?: { id?: number; name?: string };
      advisor_company_id?: number;
      advisor_company_name?: string;
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
      id: a.advisor_company?.id || a.advisor_company_id || a._new_company?.id,
      name:
        a.advisor_company?.name ||
        a.advisor_company_name ||
        a._new_company?.name ||
        "",
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

function AdvisorCell({ advisors }: { advisors: AdvisorEntry[] }) {
  if (advisors.length === 0) {
    return (
      <span
        style={{
          display: "block",
          width: "100%",
          textAlign: "right",
          color: T.muted,
          fontStyle: "italic",
        }}
      >
        Not Available
      </span>
    );
  }

  return (
    <div style={{ width: "100%", textAlign: "right", lineHeight: 1.45 }}>
      {advisors.map((advisor, index) => (
        <span key={`${advisor.name}-${index}`} style={{ display: "block" }}>
          {advisor.id ? (
            <Link
              href={`/advisor/${advisor.id}`}
              prefetch={false}
              style={{
                color: T.azure,
                textDecoration: "underline",
                fontWeight: 500,
              }}
            >
              {advisor.name}
            </Link>
          ) : (
            advisor.name
          )}
        </span>
      ))}
    </div>
  );
}

function renderTargetCell(event: CorporateEvent): React.ReactNode {
  const ne = event as {
    deal_type?: string;
    targets?: Array<{ id: number; name: string; page_type?: string; route?: string }>;
    target_company?: { id?: number; name?: string; page_type?: string };
    target_counterparty?: {
      new_company_counterparty?: number;
      new_company?: { id?: number; name?: string };
      _new_company?: { id?: number; name?: string };
    };
    target_label?: string;
  };

  const targets = ne.targets;
  if (Array.isArray(targets) && targets.length > 0) {
    const tgt = targets[0]!;
    const pageType =
      tgt.page_type === "investor" || tgt.route === "investor" || tgt.route === "investors"
        ? "investors"
        : "company";
    return (
      <CorporateEventTargetLink
        name={tgt.name}
        href={`/${pageType}/${tgt.id}`}
        entity={tgt as unknown as Record<string, unknown>}
        linkStyle={{ color: T.azure, textDecoration: "underline", fontWeight: 500 }}
      />
    );
  }

  const legacyTarget =
    ne.target_counterparty?.new_company || ne.target_counterparty?._new_company;
  const legacyId = ne.target_counterparty?.new_company_counterparty || legacyTarget?.id;
  if (legacyTarget?.name && legacyId) {
    return (
      <a href={`/company/${legacyId}`} style={{ color: T.azure, textDecoration: "underline", fontWeight: 500 }}>
        {legacyTarget.name}
      </a>
    );
  }

  if (ne.target_company?.name) {
    const pageType = ne.target_company.page_type === "investor" ? "investors" : "company";
    const href = ne.target_company.id ? `/${pageType}/${ne.target_company.id}` : undefined;
    if (href) {
      return (
        <a href={href} style={{ color: T.azure, textDecoration: "underline", fontWeight: 500 }}>
          {ne.target_company.name}
        </a>
      );
    }
    return <span style={{ fontWeight: 500 }}>{ne.target_company.name}</span>;
  }

  if (isNonEmptyString(ne.target_label)) {
    return <span style={{ fontWeight: 500 }}>{ne.target_label}</span>;
  }

  return "-";
}

function CoinvestorChips({ coinvestors }: { coinvestors: Coinvestor[] }) {
  const [expanded, setExpanded] = useState(false);
  const maxVisible = 2;
  const visible = expanded ? coinvestors : coinvestors.slice(0, maxVisible);
  const hiddenCount = coinvestors.length - maxVisible;

  if (coinvestors.length === 0) {
    return <span style={{ color: T.muted }}>-</span>;
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", minWidth: 0 }}>
      {visible.map((cp) =>
        cp.href ? (
          <Link
            key={`${cp.name}-${cp.id ?? "na"}`}
            href={cp.href}
            prefetch={false}
            style={{ textDecoration: "none" }}
          >
            <Pill tone="ghost">{cp.name}</Pill>
          </Link>
        ) : (
          <Pill key={`${cp.name}-${cp.id ?? "na"}`} tone="ghost">
            {cp.name}
          </Pill>
        )
      )}
      {!expanded && hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontFamily: T.sans,
          }}
        >
          <Pill tone="ghost">+ {hiddenCount}</Pill>
        </button>
      ) : null}
    </div>
  );
}

export function InvestorCorporateEventsProfilePanel({
  events,
  loading = false,
  maxInitialEvents = 5,
  fillGridCell = false,
}: Props) {
  const [showAll, setShowAll] = useState(false);

  const displayed = showAll ? events : events.slice(0, maxInitialEvents);
  const total = events.length;

  const footerLeft = useMemo(() => {
    if (total === 0) return "";
    return showAll
      ? `Showing all ${total}`
      : `1–${Math.min(maxInitialEvents, total)} of ${total}`;
  }, [maxInitialEvents, showAll, total]);

  if (loading) {
    return (
      <LinkPanel fillGridCell={fillGridCell}>
        <LinkedH showArrow>Corporate Events</LinkedH>
        <div style={{ textAlign: "center", padding: "20px 16px", color: T.muted, fontSize: 12.5 }}>
          Loading corporate events…
        </div>
      </LinkPanel>
    );
  }

  return (
    <LinkPanel fillGridCell={fillGridCell} className="corporate-events-v3-card">
      <LinkedH showArrow>Corporate Events</LinkedH>

      <div style={{ overflowX: "auto", maxWidth: "100%", minWidth: 0, flex: fillGridCell ? 1 : undefined }}>
        {displayed.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: CE_ROW_GRID,
              columnGap: COL_GAP,
              alignItems: "start",
              padding: `0 ${TABLE_X_PAD}px`,
              fontSize: 12.5,
              minWidth: 720,
              ...profileTableCellStyle,
            }}
          >
            {HEADERS.map((h, colIndex) => (
              <div
                key={h}
                style={{
                  ...tableColHeaderStyle,
                  width: "100%",
                  boxSizing: "border-box",
                  textAlign: COL_ALIGN[colIndex],
                  padding: "9px 0 8px",
                  borderBottom: `1px solid ${T.hair}`,
                }}
              >
                {h}
              </div>
            ))}

            {displayed.map((event, rowIndex) => {
              const ne = event as { announcement_date?: string; deal_type?: string };
              const dealTypeStr = ne.deal_type || "-";
              const coinvestors = collectCoinvestors(event);
              const advisors = collectAdvisors(event);
              const isLastRow = rowIndex === displayed.length - 1;
              const cellStyle: React.CSSProperties = {
                minWidth: 0,
                padding: "10px 0",
              };

              return (
                <React.Fragment key={event.id ?? `ce-${rowIndex}`}>
                  <div style={{ ...cellStyle, color: T.body, whiteSpace: "nowrap", textAlign: COL_ALIGN[0] }}>
                    {formatFullDate(ne.announcement_date)}
                  </div>
                  <div style={{ ...cellStyle, textAlign: COL_ALIGN[1] }}>{renderTargetCell(event)}</div>
                  <div style={{ ...cellStyle, textAlign: COL_ALIGN[2] }}>
                    {dealTypeStr && dealTypeStr !== "-" ? (
                      <DealTypeBadge dealType={dealTypeStr} />
                    ) : (
                      "-"
                    )}
                  </div>
                  <div style={{ ...cellStyle, textAlign: COL_ALIGN[3] }}>
                    <CoinvestorChips coinvestors={coinvestors} />
                  </div>
                  <div
                    style={{
                      ...cellStyle,
                      width: "100%",
                      boxSizing: "border-box",
                      textAlign: COL_ALIGN[4],
                      color: T.ink,
                      fontFamily: T.mono,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatAmountCell(event)}
                  </div>
                  <div
                    style={{
                      ...cellStyle,
                      width: "100%",
                      boxSizing: "border-box",
                      textAlign: COL_ALIGN[5],
                    }}
                  >
                    <AdvisorCell advisors={advisors} />
                  </div>
                  {!isLastRow ? (
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        borderBottom: `1px solid ${T.hair}`,
                        height: 0,
                      }}
                    />
                  ) : null}
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: "20px 16px", color: T.muted, fontSize: 12.5, textAlign: "center" }}>
            No corporate events found
          </div>
        )}
      </div>

      {total > 0 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 16px 14px",
            borderTop: `1px solid ${T.hair}`,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 12, color: T.muted, fontFamily: T.mono }}>{footerLeft}</div>
          {total > maxInitialEvents && !showAll ? (
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
              View all {total} →
            </button>
          ) : showAll && total > maxInitialEvents ? (
            <button
              type="button"
              onClick={() => setShowAll(false)}
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
              Show less
            </button>
          ) : null}
        </div>
      ) : null}
    </LinkPanel>
  );
}
