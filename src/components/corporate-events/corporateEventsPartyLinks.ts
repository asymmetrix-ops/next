import type { CSSProperties } from "react";
import type { CorporateEvent } from "@/types/corporateEvents";
import { readHqCountryIso2 } from "@/lib/dealRadar";

export type EntityLink = {
  id?: number;
  name: string;
  href: string | null;
  hqIso2?: string | null;
};

export const SEARCH_ENTITY_LINK_STYLE: CSSProperties = {
  color: "#0075df",
  textDecoration: "underline",
  fontWeight: 500,
  cursor: "pointer",
};

type LooseEvent = CorporateEvent & Record<string, unknown>;

function hqIso2From(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  return readHqCountryIso2(value as Record<string, unknown>);
}

function pageTypeToSegment(
  pageType?: string,
  route?: string
): "investors" | "company" {
  if (pageType === "investor" || route === "investor" || route === "investors") {
    return "investors";
  }
  return "company";
}

function isPartnershipDeal(event: CorporateEvent): boolean {
  return /partnership/i.test(event.deal_type || "");
}

function dealTypeLower(event: CorporateEvent): string {
  return String(event.deal_type ?? "").toLowerCase();
}

function isInvestmentDeal(event: CorporateEvent): boolean {
  return dealTypeLower(event).includes("investment");
}

export function extractTargetLinks(event: CorporateEvent): EntityLink[] {
  const e = event as LooseEvent;
  const partnership = isPartnershipDeal(event);

  const targets = e.targets as
    | Array<{
        id: number;
        name: string;
        page_type?: string;
        route?: string;
        hq_iso2?: string | null;
        hq_country_iso2?: string | null;
      }>
    | undefined;

  if (Array.isArray(targets) && targets.length > 0) {
    const displayTargets = partnership ? targets : targets.slice(0, 1);
    return displayTargets.map((target) => ({
      id: target.id,
      name: target.name,
      href: `/${pageTypeToSegment(target.page_type, target.route)}/${target.id}`,
      hqIso2: hqIso2From(target),
    }));
  }

  const targetCounterparty = e.target_counterparty as
    | {
        new_company?: { name?: string; id?: number };
        _new_company?: { name?: string; id?: number };
        new_company_counterparty?: number;
      }
    | undefined;
  const legacyTarget =
    targetCounterparty?.new_company || targetCounterparty?._new_company;
  const legacyTargetId = targetCounterparty?.new_company_counterparty;

  if (legacyTarget?.name && legacyTargetId) {
    return [
      {
        id: legacyTargetId,
        name: String(legacyTarget.name),
        href: `/company/${legacyTargetId}`,
        hqIso2:
          hqIso2From(legacyTarget) ??
          hqIso2From(targetCounterparty?._new_company) ??
          hqIso2From(targetCounterparty?.new_company),
      },
    ];
  }

  const targetCompany = e.target_company as
    | { id?: number; name?: string; page_type?: string }
    | undefined;
  if (targetCompany?.name && targetCompany.id) {
    return [
      {
        id: targetCompany.id,
        name: targetCompany.name,
        href: `/${pageTypeToSegment(targetCompany.page_type)}/${targetCompany.id}`,
        hqIso2: hqIso2From(targetCompany),
      },
    ];
  }

  if (legacyTarget?.name) {
    const id = (legacyTarget as { id?: number }).id;
    return [
      {
        id,
        name: String(legacyTarget.name),
        href: typeof id === "number" ? `/company/${id}` : null,
        hqIso2: hqIso2From(legacyTarget),
      },
    ];
  }

  return [];
}

function pushUniqueParty(
  list: EntityLink[],
  seen: Set<string>,
  party: EntityLink
) {
  const key = `${party.href ?? "na"}::${party.name}`;
  if (seen.has(key)) return;
  seen.add(key);
  list.push(party);
}

export function extractBuyerLinks(event: CorporateEvent): EntityLink[] {
  if (isPartnershipDeal(event)) return [];

  const e = event as LooseEvent;
  const buyers: EntityLink[] = [];
  const seen = new Set<string>();

  if (Array.isArray(e.other_counterparties)) {
    for (const cp of e.other_counterparties as unknown as Array<
      Record<string, unknown>
    >) {
      const status = String(
        cp.counterparty_status ||
          (cp._counterparty_type as { counterparty_status?: string } | undefined)
            ?.counterparty_status ||
          ""
      ).toLowerCase();

      if (!status.includes("acquirer") && !status.includes("buyer")) continue;

      if (typeof cp.id === "number" && typeof cp.name === "string" && cp.name) {
        const pageType = cp.page_type === "investor" ? "investors" : "company";
        pushUniqueParty(buyers, seen, {
          id: cp.id,
          name: cp.name,
          href: `/${pageType}/${cp.id}`,
          hqIso2: hqIso2From(cp),
        });
        continue;
      }

      const nc = cp._new_company as
        | { id?: number; name?: string; _is_that_investor?: boolean }
        | undefined;
      if (nc?.name && !nc._is_that_investor) {
        pushUniqueParty(buyers, seen, {
          id: nc.id,
          name: nc.name,
          href: typeof nc.id === "number" ? `/company/${nc.id}` : null,
          hqIso2: hqIso2From(nc) ?? hqIso2From(cp),
        });
      }
    }
  }

  if (buyers.length === 0 && Array.isArray(e.buyers)) {
    for (const buyer of e.buyers as Array<{
      id?: number;
      name?: string;
      page_type?: string;
    }>) {
      if (typeof buyer.id !== "number" || !buyer.name) continue;
      pushUniqueParty(buyers, seen, {
        id: buyer.id,
        name: buyer.name,
        href:
          buyer.page_type === "investor"
            ? `/investors/${buyer.id}`
            : `/company/${buyer.id}`,
        hqIso2: hqIso2From(buyer),
      });
    }
  }

  if (
    !isInvestmentDeal(event) &&
    buyers.length === 0 &&
    Array.isArray(e.buyers_investors)
  ) {
    for (const buyer of e.buyers_investors as Array<{
      id?: number;
      name?: string;
      page_type?: string;
    }>) {
      if (
        typeof buyer.id !== "number" ||
        !buyer.name ||
        buyer.page_type === "investor"
      ) {
        continue;
      }
      pushUniqueParty(buyers, seen, {
        id: buyer.id,
        name: buyer.name,
        href: `/company/${buyer.id}`,
        hqIso2: hqIso2From(buyer),
      });
    }
  }

  if (buyers.length === 0) {
    const legacyList = (e["0"] as Array<{ _new_company?: { id?: number; name?: string; _is_that_investor?: boolean } }> | undefined) ?? [];
    for (const item of legacyList) {
      const nc = item._new_company;
      if (!nc?.name || nc._is_that_investor) continue;
      pushUniqueParty(buyers, seen, {
        id: nc.id,
        name: nc.name,
        href: typeof nc.id === "number" ? `/company/${nc.id}` : null,
        hqIso2: hqIso2From(nc) ?? hqIso2From(item),
      });
    }
  }

  return buyers;
}

export function extractInvestorLinks(event: CorporateEvent): EntityLink[] {
  if (isPartnershipDeal(event)) return [];

  const e = event as LooseEvent;
  const investors: EntityLink[] = [];
  const seen = new Set<string>();
  const investmentDeal = isInvestmentDeal(event);

  if (Array.isArray(e.other_counterparties)) {
    for (const cp of e.other_counterparties as unknown as Array<
      Record<string, unknown>
    >) {
      const status = String(
        cp.counterparty_status ||
          (cp._counterparty_type as { counterparty_status?: string } | undefined)
            ?.counterparty_status ||
          ""
      ).toLowerCase();

      if (!status.includes("investor")) continue;

      if (typeof cp.id === "number" && typeof cp.name === "string" && cp.name) {
        pushUniqueParty(investors, seen, {
          id: cp.id,
          name: cp.name,
          href: `/investors/${cp.id}`,
          hqIso2: hqIso2From(cp),
        });
        continue;
      }

      const nc = cp._new_company as
        | { id?: number; name?: string; _is_that_investor?: boolean; _url?: string }
        | undefined;
      if (nc?.name) {
        let href: string | null = null;
        const cpId =
          (cp.new_company_counterparty as number | undefined) ?? nc.id;
        if (nc._is_that_investor && typeof cpId === "number") {
          href = `/investors/${cpId}`;
        } else if (typeof nc._url === "string" && nc._url) {
          href = nc._url.replace(/\/(?:investor)\//, "/investors/");
        }
        pushUniqueParty(investors, seen, {
          id: nc.id,
          name: nc.name,
          href,
          hqIso2: hqIso2From(nc) ?? hqIso2From(cp),
        });
      }
    }
  }

  if (investors.length === 0 && Array.isArray(e.investors)) {
    for (const investor of e.investors as Array<{ id?: number; name?: string }>) {
      if (typeof investor.id !== "number" || !investor.name) continue;
      pushUniqueParty(investors, seen, {
        id: investor.id,
        name: investor.name,
        href: `/investors/${investor.id}`,
        hqIso2: hqIso2From(investor),
      });
    }
  }

  if (investors.length === 0 && Array.isArray(e.buyers_investors)) {
    for (const investor of e.buyers_investors as Array<{
      id?: number;
      name?: string;
      page_type?: string;
    }>) {
      if (
        typeof investor.id !== "number" ||
        !investor.name ||
        !(investmentDeal || investor.page_type === "investor")
      ) {
        continue;
      }
      pushUniqueParty(investors, seen, {
        id: investor.id,
        name: investor.name,
        href: `/investors/${investor.id}`,
        hqIso2: hqIso2From(investor),
      });
    }
  }

  if (investors.length === 0) {
    const legacyList = (e["0"] as Array<{ _new_company?: { id?: number; name?: string; _is_that_investor?: boolean } }> | undefined) ?? [];
    for (const item of legacyList) {
      const nc = item._new_company;
      if (!nc?.name || !nc._is_that_investor) continue;
      pushUniqueParty(investors, seen, {
        id: nc.id,
        name: nc.name,
        href: typeof nc.id === "number" ? `/investors/${nc.id}` : null,
        hqIso2: hqIso2From(nc) ?? hqIso2From(item),
      });
    }
  }

  return investors;
}

export function extractSellerLinks(event: CorporateEvent): EntityLink[] {
  if (isPartnershipDeal(event)) return [];

  const e = event as LooseEvent;
  const sellers: EntityLink[] = [];
  const seen = new Set<string>();

  const sellerSources = [
    ...(Array.isArray(e.sellers) ? e.sellers : []),
    ...(Array.isArray(e.sales) ? e.sales : []),
  ] as Array<{ id?: number; name?: string; page_type?: string }>;

  for (const seller of sellerSources) {
    if (typeof seller.id !== "number" || !seller.name) continue;
    pushUniqueParty(sellers, seen, {
      id: seller.id,
      name: seller.name,
      href:
        seller.page_type === "investor"
          ? `/investors/${seller.id}`
          : `/company/${seller.id}`,
      hqIso2: hqIso2From(seller),
    });
  }

  if (sellers.length === 0 && Array.isArray(e.other_counterparties)) {
    for (const cp of e.other_counterparties as unknown as Array<
      Record<string, unknown>
    >) {
      const status = String(
        cp.counterparty_status ||
          (cp._counterparty_type as { counterparty_status?: string } | undefined)
            ?.counterparty_status ||
          ""
      ).toLowerCase();

      if (
        !status.includes("divestor") &&
        !status.includes("seller") &&
        !status.includes("vendor")
      ) {
        continue;
      }

      if (typeof cp.id === "number" && typeof cp.name === "string" && cp.name) {
        const pageType = cp.page_type === "investor" ? "investors" : "company";
        pushUniqueParty(sellers, seen, {
          id: cp.id,
          name: cp.name,
          href: `/${pageType}/${cp.id}`,
          hqIso2: hqIso2From(cp),
        });
        continue;
      }

      const nc = cp._new_company as
        | {
            id?: number;
            name?: string;
            _is_that_investor?: boolean;
            _investor_profile_id?: number;
            _url?: string;
          }
        | undefined;
      if (!nc?.name) continue;

      let href: string | null = null;
      const cpId =
        (cp.new_company_counterparty as number | undefined) ?? nc.id;
      if (nc._is_that_investor) {
        const profileId = nc._investor_profile_id;
        href =
          typeof profileId === "number" && profileId > 0
            ? `/investors/${profileId}`
            : typeof cpId === "number"
              ? `/investors/${cpId}`
              : null;
      } else if (typeof cpId === "number") {
        href = `/company/${cpId}`;
      } else if (typeof nc._url === "string" && nc._url) {
        href = nc._url.replace(/\/(?:investor)\//, "/investors/");
      }

      pushUniqueParty(sellers, seen, {
        id: nc.id,
        name: nc.name,
        href,
        hqIso2: hqIso2From(nc) ?? hqIso2From(cp),
      });
    }
  }

  return sellers;
}

type AdvisorLinkSource = {
  id?: number;
  new_company_advised?: number;
  advisor_company?: { id?: number; name?: string };
  advisor_company_id?: number;
  _new_company?: { id?: number; name?: string };
};

/** Route id for /advisor/[id] — `new_comp_id` (new_company_advised), not advisor role record id. */
export function resolveAdvisorRouteId(advisor: AdvisorLinkSource): number | undefined {
  const roleRecordId =
    typeof advisor.id === "number" && Number.isFinite(advisor.id) && advisor.id > 0
      ? advisor.id
      : undefined;

  const candidates = [
    advisor.new_company_advised,
    advisor._new_company?.id,
    advisor.advisor_company?.id,
    advisor.advisor_company_id,
  ];

  for (const value of candidates) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      continue;
    }
    // API often duplicates the role-record id on advisor_company — skip that id.
    if (roleRecordId != null && value === roleRecordId) continue;
    return value;
  }

  return undefined;
}

export function resolveAdvisorDisplayName(advisor: AdvisorLinkSource): string {
  return (
    advisor.advisor_company?.name ||
    advisor._new_company?.name ||
    ""
  ).trim();
}

export function extractAdvisorLinks(event: CorporateEvent): EntityLink[] {
  const e = event as LooseEvent;
  const advisors: EntityLink[] = [];
  const seen = new Set<string>();

  if (Array.isArray(event.advisors)) {
    for (const advisor of event.advisors as AdvisorLinkSource[]) {
      const id = resolveAdvisorRouteId(advisor);
      const name = resolveAdvisorDisplayName(advisor);
      if (!name) continue;
      pushUniqueParty(advisors, seen, {
        id,
        name,
        href: id != null ? `/advisor/${id}` : null,
      });
    }
  }

  const legacyAdvisors =
    (e["1"] as Array<{ _new_company?: { id?: number; name?: string } }> | undefined) ??
    [];
  for (const advisor of legacyAdvisors) {
    const id = advisor._new_company?.id;
    const name = (advisor._new_company?.name || "").trim();
    if (!name) continue;
    pushUniqueParty(advisors, seen, {
      id,
      name,
      href: typeof id === "number" ? `/advisor/${id}` : null,
    });
  }

  const advisorNames = Array.isArray(e.advisors_names)
    ? e.advisors_names
    : typeof e.advisors_names === "string"
      ? [e.advisors_names]
      : [];
  for (const nameValue of advisorNames) {
    const name = typeof nameValue === "string" ? nameValue.trim() : "";
    if (!name) continue;
    pushUniqueParty(advisors, seen, { name, href: null });
  }

  return advisors;
}
