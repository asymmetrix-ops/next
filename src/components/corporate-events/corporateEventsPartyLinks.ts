import type { CSSProperties } from "react";
import type { CorporateEvent } from "@/types/corporateEvents";

export type EntityLink = {
  id?: number;
  name: string;
  href: string | null;
};

export const SEARCH_ENTITY_LINK_STYLE: CSSProperties = {
  color: "#0075df",
  textDecoration: "underline",
  fontWeight: 500,
  cursor: "pointer",
};

type LooseEvent = CorporateEvent & Record<string, unknown>;

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
      }>
    | undefined;

  if (Array.isArray(targets) && targets.length > 0) {
    const displayTargets = partnership ? targets : targets.slice(0, 1);
    return displayTargets.map((target) => ({
      id: target.id,
      name: target.name,
      href: `/${pageTypeToSegment(target.page_type, target.route)}/${target.id}`,
    }));
  }

  const legacyTarget =
    (e.target_counterparty as { new_company?: { name?: string; id?: number }; _new_company?: { name?: string; id?: number } })
      ?.new_company ||
    (e.target_counterparty as { _new_company?: { name?: string; id?: number } })
      ?._new_company;
  const legacyTargetId = (
    e.target_counterparty as { new_company_counterparty?: number } | undefined
  )?.new_company_counterparty;

  if (legacyTarget?.name && legacyTargetId) {
    return [
      {
        id: legacyTargetId,
        name: String(legacyTarget.name),
        href: `/company/${legacyTargetId}`,
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
      });
    }
  }

  return sellers;
}

function resolveAdvisorProfileId(
  advisor: Record<string, unknown>
): number | undefined {
  const advisorCompany = advisor.advisor_company as
    | { id?: number }
    | undefined;
  const newCompany = advisor._new_company as { id?: number } | undefined;
  const candidates = [
    advisor.id,
    advisorCompany?.id,
    advisor.advisor_company_id,
    advisor.new_company_advised,
    newCompany?.id,
    advisor.counterparty_advised,
  ];

  for (const value of candidates) {
    const id = Number(value);
    if (Number.isInteger(id) && id > 0) return id;
  }

  return undefined;
}

function resolveAdvisorName(advisor: Record<string, unknown>): string {
  const advisorCompany = advisor.advisor_company as
    | { name?: string }
    | undefined;
  const newCompany = advisor._new_company as { name?: string } | undefined;

  return String(
    advisorCompany?.name ||
      advisor.advisor_company_name ||
      newCompany?.name ||
      advisor.name ||
      ""
  ).trim();
}

function resolveAdvisorHref(
  advisor: Record<string, unknown>,
  id?: number
): string | null {
  if (typeof id === "number" && id > 0) {
    return `/advisor/${id}`;
  }

  const url = advisor._url;
  if (typeof url === "string" && url.trim()) {
    return url.replace(/\/(?:advisor)\//, "/advisor/");
  }

  return null;
}

function pushAdvisorLink(
  advisors: EntityLink[],
  seen: Set<string>,
  advisor: Record<string, unknown>
) {
  const name = resolveAdvisorName(advisor);
  if (!name) return;

  const id = resolveAdvisorProfileId(advisor);
  pushUniqueParty(advisors, seen, {
    id,
    name,
    href: resolveAdvisorHref(advisor, id),
  });
}

export function extractAdvisorLinks(event: CorporateEvent): EntityLink[] {
  const e = event as LooseEvent;
  const advisors: EntityLink[] = [];
  const seen = new Set<string>();

  if (Array.isArray(e.advisors)) {
    for (const advisor of e.advisors as unknown as Array<Record<string, unknown>>) {
      pushAdvisorLink(advisors, seen, advisor);
    }
  }

  const legacyAdvisors =
    (e["1"] as Array<Record<string, unknown>> | undefined) ?? [];
  for (const advisor of legacyAdvisors) {
    pushAdvisorLink(advisors, seen, advisor);
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
