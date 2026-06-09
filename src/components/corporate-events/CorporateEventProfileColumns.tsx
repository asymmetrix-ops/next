"use client";

import React from "react";
import type { CorporateEvent } from "./CorporateEventsTable";
import { CorporateEventDealMetrics } from "./CorporateEventDealMetrics";
import {
  formatCorporateEventDate,
  normalizeEntityHref,
} from "@/lib/corporateEventEntityHref";

type PartyLink = { id?: number; name: string; href: string | null };

const linkStyle = (color: string): React.CSSProperties => ({
  color,
  textDecoration: "underline",
  fontWeight: 500,
});

const metaStyle = (color: string): React.CSSProperties => ({
  fontSize: 12,
  color,
  marginTop: 4,
  lineHeight: 1.45,
});

function PartyLinks({
  links,
  linkColor,
}: {
  links: PartyLink[];
  linkColor: string;
}) {
  if (links.length === 0) return <>Not Available</>;
  return (
    <>
      {links.map((item, idx) => (
        <span key={`${item.name}-${item.id ?? idx}`}>
          {item.href ? (
            <a href={item.href} style={linkStyle(linkColor)}>
              {item.name}
            </a>
          ) : (
            <span>{item.name}</span>
          )}
          {idx < links.length - 1 ? ", " : ""}
        </span>
      ))}
    </>
  );
}

function PartyRow({
  label,
  links,
  linkColor,
}: {
  label: string;
  links: PartyLink[];
  linkColor: string;
}) {
  if (links.length === 0) return null;
  return (
    <div style={{ marginBottom: 4 }}>
      <strong>{label}:</strong> <PartyLinks links={links} linkColor={linkColor} />
    </div>
  );
}

function sanitizeAmountValue(
  value?: number | string | null
): number | string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const num = Number(trimmed.replace(/,/g, ""));
  return Number.isNaN(num) ? trimmed : num;
}

function extractTargetLinks(
  event: CorporateEvent,
  isPartnership: boolean,
  linkColor: string
): React.ReactNode {
  const newEvent = event as {
    targets?: Array<{
      id: number;
      name: string;
      path?: string;
      route?: string;
      page_type?: string;
      entity_type?: string;
      is_investor?: boolean;
    }>;
    target_company?: {
      id?: number;
      name?: string;
      page_type?: string;
      route?: string;
      path?: string;
      entity_type?: string;
      is_investor?: boolean;
    };
    target_counterparty?: {
      new_company_counterparty?: number;
      new_company?: { id?: number; name?: string };
      _new_company?: { id?: number; name?: string };
    };
    target_label?: string;
  };
  const legacyEvent = event as { target_label?: string };

  const targets = newEvent.targets;
  const legacyTarget =
    newEvent.target_counterparty?.new_company ||
    newEvent.target_counterparty?._new_company;
  const legacyTargetId = newEvent.target_counterparty?.new_company_counterparty;

  if (Array.isArray(targets) && targets.length > 0) {
    const displayTargets = isPartnership ? targets : targets.slice(0, 1);
    return displayTargets.map((tgt, i, arr) => {
      const href =
        normalizeEntityHref({
          id: tgt.id,
          route: tgt.route,
          page_type: tgt.page_type,
          path: tgt.path,
          entity_type: tgt.entity_type,
          is_investor: tgt.is_investor,
        }) ?? "#";
      return (
        <span key={`tgt-${tgt.id}-${i}`}>
          <a href={href} style={linkStyle(linkColor)}>
            {tgt.name}
          </a>
          {i < arr.length - 1 ? ", " : ""}
        </span>
      );
    });
  }
  if (legacyTarget?.name && legacyTargetId) {
    return (
      <a href={`/company/${legacyTargetId}`} style={linkStyle(linkColor)}>
        {legacyTarget.name}
      </a>
    );
  }
  if (newEvent.target_company?.name) {
    const href = normalizeEntityHref({
      id: newEvent.target_company.id,
      route: newEvent.target_company.route,
      page_type: newEvent.target_company.page_type,
      path: newEvent.target_company.path,
      entity_type: newEvent.target_company.entity_type,
      is_investor: newEvent.target_company.is_investor,
    });
    if (href) {
      return (
        <a href={href} style={linkStyle(linkColor)}>
          {newEvent.target_company.name}
        </a>
      );
    }
    return <span>{newEvent.target_company.name}</span>;
  }
  if (legacyEvent.target_label?.trim()) {
    return <span>{legacyEvent.target_label}</span>;
  }
  return <>Not Available</>;
}

function collectBuyers(event: CorporateEvent, isInvestmentDeal: boolean): PartyLink[] {
  const newEvent = event as {
    other_counterparties?: Array<{
      id?: number;
      name?: string;
      page_type?: string;
      route?: string;
      path?: string;
      entity_type?: string;
      is_investor?: boolean;
      counterparty_status?: string;
      _new_company?: { id?: number; name?: string; _is_that_investor?: boolean };
    }>;
    buyers?: Array<{
      id?: number;
      name?: string;
      route?: string;
      page_type?: string;
      path?: string;
      entity_type?: string;
      is_investor?: boolean;
    }>;
    buyers_investors?: Array<{ id?: number; name?: string; page_type?: string }>;
  };
  const legacyEvent = event as {
    "0"?: Array<{
      _new_company?: { id?: number; name?: string; _is_that_investor?: boolean };
    }>;
  };
  const buyers: PartyLink[] = [];

  if (Array.isArray(newEvent.other_counterparties)) {
    newEvent.other_counterparties.forEach((cp) => {
      const status = (cp.counterparty_status ?? "").toLowerCase();
      if (!status.includes("acquirer") && !status.includes("buyer")) return;
      if ("id" in cp && cp.id && cp.name) {
        buyers.push({
          id: cp.id,
          name: cp.name,
          href: normalizeEntityHref({
            id: cp.id,
            route: cp.route,
            page_type: cp.page_type,
            path: cp.path,
            entity_type: cp.entity_type,
            is_investor: cp.is_investor,
          }),
        });
      } else if (cp._new_company?.name && !cp._new_company._is_that_investor) {
        buyers.push({
          id: cp._new_company.id,
          name: cp._new_company.name,
          href: cp._new_company.id ? `/company/${cp._new_company.id}` : null,
        });
      }
    });
  }

  if (buyers.length === 0 && Array.isArray(newEvent.buyers)) {
    newEvent.buyers.forEach((c) => {
      if (c?.id && c.name) {
        buyers.push({
          id: c.id,
          name: c.name,
          href: normalizeEntityHref({
            id: c.id,
            route: c.route,
            page_type: c.page_type,
            path: c.path,
            entity_type: c.entity_type,
            is_investor: c.is_investor,
          }),
        });
      }
    });
  }

  if (
    !isInvestmentDeal &&
    buyers.length === 0 &&
    Array.isArray(newEvent.buyers_investors)
  ) {
    newEvent.buyers_investors.forEach((c) => {
      if (c?.id && c.name && c.page_type !== "investor") {
        buyers.push({ id: c.id, name: c.name, href: `/company/${c.id}` });
      }
    });
  }

  if (buyers.length === 0) {
    (legacyEvent["0"] || [])
      .filter((c) => c._new_company?.name && !c._new_company._is_that_investor)
      .forEach((it) => {
        const name = it._new_company?.name;
        if (!name) return;
        const id = it._new_company?.id;
        buyers.push({
          id,
          name,
          href: id ? `/company/${id}` : null,
        });
      });
  }

  return buyers;
}

function collectInvestors(event: CorporateEvent, isInvestmentDeal: boolean): PartyLink[] {
  const newEvent = event as {
    other_counterparties?: Array<{
      id?: number;
      name?: string;
      page_type?: string;
      route?: string;
      path?: string;
      entity_type?: string;
      is_investor?: boolean;
      counterparty_status?: string;
      _new_company?: { id?: number; name?: string; _is_that_investor?: boolean };
    }>;
    investors?: Array<{
      id?: number;
      name?: string;
      route?: string;
      page_type?: string;
      path?: string;
      entity_type?: string;
      is_investor?: boolean;
    }>;
    buyers_investors?: Array<{
      id?: number;
      name?: string;
      route?: string;
      page_type?: string;
      path?: string;
      entity_type?: string;
      is_investor?: boolean;
    }>;
  };
  const legacyEvent = event as {
    "0"?: Array<{
      _new_company?: { id?: number; name?: string; _is_that_investor?: boolean };
    }>;
  };
  const investors: PartyLink[] = [];

  if (Array.isArray(newEvent.other_counterparties)) {
    newEvent.other_counterparties.forEach((cp) => {
      const status = (cp.counterparty_status ?? "").toLowerCase();
      if (!status.includes("investor")) return;
      if ("id" in cp && cp.id && cp.name) {
        investors.push({
          id: cp.id,
          name: cp.name,
          href: normalizeEntityHref({
            id: cp.id,
            route: cp.route,
            page_type: cp.page_type,
            path: cp.path,
            entity_type: cp.entity_type,
            is_investor: cp.is_investor ?? true,
            isInvestorHint: true,
          }),
        });
      } else if (cp._new_company?.name && cp._new_company._is_that_investor) {
        investors.push({
          id: cp._new_company.id,
          name: cp._new_company.name,
          href: cp._new_company.id ? `/investors/${cp._new_company.id}` : null,
        });
      }
    });
  }

  if (investors.length === 0 && Array.isArray(newEvent.investors)) {
    newEvent.investors.forEach((c) => {
      if (c?.id && c.name) {
        investors.push({
          id: c.id,
          name: c.name,
          href:
            normalizeEntityHref({
              id: c.id,
              route: c.route,
              page_type: c.page_type,
              path: c.path,
              entity_type: c.entity_type,
              is_investor: c.is_investor,
              isInvestorHint: true,
            }) ?? null,
        });
      }
    });
  }

  if (investors.length === 0 && Array.isArray(newEvent.buyers_investors)) {
    newEvent.buyers_investors.forEach((c) => {
      if (
        c?.id &&
        c.name &&
        (isInvestmentDeal || c.page_type === "investor")
      ) {
        investors.push({
          id: c.id,
          name: c.name,
          href:
            normalizeEntityHref({
              id: c.id,
              route: c.route,
              page_type: c.page_type,
              path: c.path,
              entity_type: c.entity_type,
              is_investor: c.is_investor,
              isInvestorHint: true,
            }) ?? null,
        });
      }
    });
  }

  if (investors.length === 0) {
    (legacyEvent["0"] || [])
      .filter((c) => c._new_company?.name && c._new_company._is_that_investor)
      .forEach((it) => {
        const name = it._new_company?.name;
        if (!name) return;
        const id = it._new_company?.id;
        investors.push({
          id,
          name,
          href: id ? `/investors/${id}` : null,
        });
      });
  }

  return investors;
}

function collectSellers(event: CorporateEvent): PartyLink[] {
  const newEvent = event as {
    sellers?: Array<{
      id?: number;
      name?: string;
      route?: string;
      page_type?: string;
      path?: string;
      entity_type?: string;
      is_investor?: boolean;
    }>;
    other_counterparties?: Array<{
      id?: number;
      name?: string;
      route?: string;
      page_type?: string;
      path?: string;
      entity_type?: string;
      is_investor?: boolean;
      counterparty_status?: string;
      _new_company?: { id?: number; name?: string; _is_that_investor?: boolean };
    }>;
  };
  const sellers: PartyLink[] = [];

  if (Array.isArray(newEvent.sellers)) {
    newEvent.sellers.forEach((seller) => {
      if (seller?.id && seller.name) {
        sellers.push({
          id: seller.id,
          name: seller.name,
          href: normalizeEntityHref({
            id: seller.id,
            route: seller.route,
            page_type: seller.page_type,
            path: seller.path,
            entity_type: seller.entity_type,
            is_investor: seller.is_investor,
          }),
        });
      }
    });
  }

  if (sellers.length === 0 && Array.isArray(newEvent.other_counterparties)) {
    newEvent.other_counterparties.forEach((cp) => {
      const status = (cp.counterparty_status ?? "").toLowerCase();
      if (!status.includes("divestor") && !status.includes("seller")) return;
      if ("id" in cp && cp.id && cp.name) {
        sellers.push({
          id: cp.id,
          name: cp.name,
          href: normalizeEntityHref({
            id: cp.id,
            route: cp.route,
            page_type: cp.page_type,
            path: cp.path,
            entity_type: cp.entity_type,
            is_investor: cp.is_investor,
          }),
        });
      } else if (cp._new_company?.name) {
        const id = cp._new_company.id;
        sellers.push({
          id,
          name: cp._new_company.name,
          href: id
            ? cp._new_company._is_that_investor
              ? `/investors/${id}`
              : `/company/${id}`
            : null,
        });
      }
    });
  }

  return sellers;
}

export function CorporateEventDetailsColumn({
  event,
  linkColor,
  mutedColor,
  onEventClick,
}: {
  event: CorporateEvent;
  linkColor: string;
  mutedColor: string;
  onEventClick: (eventId: number, description?: string) => void;
}) {
  const newEvent = event as {
    description?: string;
    announcement_date?: string;
    target_hq_country?: string | null;
    target_hq?: string | null;
    target_counterparty?: {
      new_company?: { _location?: { Country?: string } };
      _new_company?: { _location?: { Country?: string } };
    };
  };
  const legacyEvent = event as {
    description?: string;
    announcement_date?: string;
  };

  const description =
    newEvent.description || legacyEvent.description || "Not available";
  const dateRaw = newEvent.announcement_date || legacyEvent.announcement_date;
  const targetCountry =
    (typeof newEvent.target_hq_country === "string" &&
      newEvent.target_hq_country.trim()) ||
    (typeof newEvent.target_hq === "string" && newEvent.target_hq.trim()) ||
    newEvent.target_counterparty?.new_company?._location?.Country ||
    newEvent.target_counterparty?._new_company?._location?.Country ||
    "Not Available";

  return (
    <div style={{ minWidth: 0 }}>
      {event.id ? (
        <a
          href={`/corporate-event/${event.id}`}
          style={{
            ...linkStyle(linkColor),
            lineHeight: 1.45,
            display: "inline-block",
          }}
          onClick={(e) => {
            e.preventDefault();
            onEventClick(event.id!, description);
          }}
        >
          {description}
        </a>
      ) : (
        <span style={{ lineHeight: 1.45 }}>{description}</span>
      )}
      <div style={metaStyle(mutedColor)}>Date: {formatCorporateEventDate(dateRaw)}</div>
      <div style={{ ...metaStyle(mutedColor), marginTop: 2 }}>
        Target HQ: {targetCountry}
      </div>
    </div>
  );
}

export function CorporateEventPartiesColumn({
  event,
  linkColor,
}: {
  event: CorporateEvent;
  linkColor: string;
}) {
  const newEvent = event as {
    deal_type?: string;
    target_label?: string;
  };
  const legacyEvent = event as { deal_type?: string; target_label?: string };
  const dealType = newEvent.deal_type || legacyEvent.deal_type || "";
  const isPartnership = /partnership/i.test(dealType);
  const isInvestmentDeal = dealType.toLowerCase().includes("investment");
  const targetLabel =
    newEvent.target_label ||
    legacyEvent.target_label ||
    (isPartnership ? "Target(s)" : "Target");

  return (
    <div style={{ fontSize: 12, lineHeight: 1.45, minWidth: 0 }}>
      <div style={{ marginBottom: 4 }}>
        <strong>{targetLabel}:</strong>{" "}
        {extractTargetLinks(event, isPartnership, linkColor)}
      </div>
      {!isPartnership && (
        <>
          <PartyRow
            label="Buyer(s)"
            links={collectBuyers(event, isInvestmentDeal)}
            linkColor={linkColor}
          />
          <PartyRow
            label="Investor(s)"
            links={collectInvestors(event, isInvestmentDeal)}
            linkColor={linkColor}
          />
          <PartyRow
            label="Seller(s)"
            links={collectSellers(event)}
            linkColor={linkColor}
          />
        </>
      )}
    </div>
  );
}

export function CorporateEventDealDetailsColumn({
  event,
}: {
  event: CorporateEvent;
}) {
  const newEvent = event as {
    deal_type?: string;
    investment_display?: string | null;
    ev_display?: string | null;
    investment_data?: {
      investment_amount_m?: number | string;
      investment_amount?: number | string;
      currency?: string | { Currency?: string };
      _currency?: { Currency?: string };
      Funding_stage?: string;
      funding_stage?: string;
    };
    ev_data?: {
      enterprise_value_m?: number | string;
      ev_band?: string;
      currency?: { Currency?: string };
      _currency?: { Currency?: string };
    };
  };
  const legacyEvent = event as {
    deal_type?: string;
    investment_display?: string | null;
    ev_display?: string | null;
    investment_data?: typeof newEvent.investment_data;
    ev_data?: typeof newEvent.ev_data;
  };

  const dealType = newEvent.deal_type || legacyEvent.deal_type;
  const isPartnership = /partnership/i.test(dealType || "");
  const amountDisplay = newEvent.investment_display ?? legacyEvent.investment_display ?? null;
  const amountRaw =
    newEvent.investment_data?.investment_amount_m ??
    newEvent.investment_data?.investment_amount ??
    legacyEvent.investment_data?.investment_amount_m ??
    legacyEvent.investment_data?.investment_amount ??
    null;
  const amountMillions = sanitizeAmountValue(amountRaw);
  const amountCurrency: string | undefined =
    typeof newEvent.investment_data?.currency === "string"
      ? newEvent.investment_data.currency
      : newEvent.investment_data?.currency?.Currency ||
        newEvent.investment_data?._currency?.Currency ||
        (typeof legacyEvent.investment_data?.currency === "string"
          ? legacyEvent.investment_data.currency
          : legacyEvent.investment_data?.currency?.Currency ||
            legacyEvent.investment_data?._currency?.Currency);

  const evDataRaw = legacyEvent.ev_data || newEvent.ev_data;
  const evMillions = sanitizeAmountValue(evDataRaw?.enterprise_value_m ?? null);
  const evCurrency: string | undefined =
    evDataRaw?._currency?.Currency || evDataRaw?.currency?.Currency;
  const hasEvNumeric =
    evMillions !== null &&
    typeof evCurrency === "string" &&
    evCurrency.trim().length > 0;
  const evDisplay = hasEvNumeric ? null : newEvent.ev_display ?? legacyEvent.ev_display ?? null;
  const evBandFallback = hasEvNumeric ? null : evDataRaw?.ev_band || null;
  const fundingStage = (
    newEvent.investment_data?.Funding_stage ||
    newEvent.investment_data?.funding_stage ||
    legacyEvent.investment_data?.Funding_stage ||
    legacyEvent.investment_data?.funding_stage ||
    ""
  ).trim();

  return (
    <CorporateEventDealMetrics
      dealType={dealType}
      fundingStage={fundingStage || undefined}
      isPartnership={isPartnership}
      amountDisplay={amountDisplay}
      amountMillions={amountMillions}
      amountCurrency={amountCurrency}
      evDisplay={evDisplay}
      evMillions={evMillions}
      evCurrency={evCurrency}
      evBandFallback={evBandFallback}
    />
  );
}
