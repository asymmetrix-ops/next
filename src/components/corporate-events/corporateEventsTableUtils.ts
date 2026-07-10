import type { CorporateEvent } from "@/types/corporateEvents";

export const normalizeSectorName = (name: string | undefined | null): string =>
  (name || "").trim().toLowerCase();

const FALLBACK_SECONDARY_TO_PRIMARY: Record<string, string> = {
  [normalizeSectorName("Crypto")]: "Web 3",
  [normalizeSectorName("Blockchain")]: "Web 3",
  [normalizeSectorName("DeFi")]: "Web 3",
  [normalizeSectorName("NFT")]: "Web 3",
  [normalizeSectorName("Web3")]: "Web 3",
  [normalizeSectorName("PropTech")]: "Real Estate",
};

export function formatCorporateEventDate(dateString: string | undefined): string {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Invalid date";
  }
}

export function getTargetCompany(event: CorporateEvent): Record<string, unknown> | null {
  const targetCounterparty = event.target_counterparty as unknown as {
    new_company?: Record<string, unknown>;
    _new_company?: Record<string, unknown>;
  };
  return (
    targetCounterparty?.new_company ||
    targetCounterparty?._new_company ||
    null
  );
}

export function getTargetCounterpartyId(event: CorporateEvent): number | null {
  const id = (
    event.target_counterparty as unknown as { new_company_counterparty?: number }
  )?.new_company_counterparty;
  return typeof id === "number" ? id : null;
}

export function getTargetName(event: CorporateEvent): string {
  const target = getTargetCompany(event);
  return (target?.name as string | undefined) || "-";
}

export function getTargetHref(event: CorporateEvent): string {
  const id = getTargetCounterpartyId(event);
  return id ? `/company/${id}` : "";
}

export function getTargetCountry(event: CorporateEvent): string {
  const target = getTargetCompany(event);
  if (!target) return "-";
  return (
    (target.country as string | undefined) ||
    ((target._location as { Country?: string } | undefined)?.Country ?? "-")
  );
}

export function getFundingStage(event: CorporateEvent): string {
  const investment = event.investment_data as
    | { Funding_stage?: string; funding_stage?: string }
    | undefined;
  return (investment?.Funding_stage || investment?.funding_stage || "").trim();
}

export function computeRelatedPrimary(
  secondarySectors: Array<string | { sector_name: string }> | undefined,
  secondaryToPrimaryMap: Record<string, string>
): string {
  if (!secondarySectors || secondarySectors.length === 0) return "-";
  const names = secondarySectors
    .map((sector) => (typeof sector === "string" ? sector : sector.sector_name))
    .filter(Boolean) as string[];
  const related = names
    .map(
      (name) =>
        secondaryToPrimaryMap[normalizeSectorName(name)] ||
        FALLBACK_SECONDARY_TO_PRIMARY[normalizeSectorName(name)] ||
        name
    )
    .filter((value, index, array) => array.indexOf(value) === index);
  return related.length > 0 ? related.join(", ") : "-";
}

export function derivePrimaryFromCompany(
  company: Record<string, unknown> | null | undefined,
  secondaryToPrimaryMap: Record<string, string>
): string {
  if (!company) return "-";

  const primaryNew = company.primary_sectors as
    | Array<string | { sector_name: string }>
    | undefined;
  if (Array.isArray(primaryNew) && primaryNew.length > 0) {
    const names = primaryNew
      .map((sector) =>
        typeof sector === "string" ? sector : sector.sector_name
      )
      .filter(Boolean) as string[];
    if (names.length > 0) return names.join(", ");
  }

  const primaryLegacy = company._sectors_primary as
    | { sector_name: string }[]
    | undefined;
  if (Array.isArray(primaryLegacy) && primaryLegacy.length > 0) {
    return primaryLegacy.map((sector) => sector.sector_name).join(", ");
  }

  const derivedParentPrimaries = company.derived_parent_primaries as
    | Array<string | { sector_name: string }>
    | undefined;
  if (Array.isArray(derivedParentPrimaries) && derivedParentPrimaries.length > 0) {
    const names = derivedParentPrimaries
      .map((sector) =>
        typeof sector === "string" ? sector : sector.sector_name
      )
      .filter(Boolean) as string[];
    if (names.length > 0) return names.join(", ");
  }

  const secondaryNew = company.secondary_sectors as
    | Array<string | { sector_name: string }>
    | undefined;
  if (Array.isArray(secondaryNew) && secondaryNew.length > 0) {
    return computeRelatedPrimary(secondaryNew, secondaryToPrimaryMap);
  }

  return computeRelatedPrimary(
    company._sectors_secondary as Array<string | { sector_name: string }> | undefined,
    secondaryToPrimaryMap
  );
}

export function deriveSecondaryFromCompany(
  company: Record<string, unknown> | null | undefined
): string {
  if (!company) return "-";

  const secondaryNew = company.secondary_sectors as
    | Array<string | { sector_name: string }>
    | undefined;
  if (Array.isArray(secondaryNew) && secondaryNew.length > 0) {
    const names = secondaryNew
      .map((sector) =>
        typeof sector === "string" ? sector : sector.sector_name
      )
      .filter(Boolean) as string[];
    if (names.length > 0) return names.join(", ");
  }

  const secondaryLegacy = company._sectors_secondary as
    | { sector_name: string }[]
    | undefined;
  if (Array.isArray(secondaryLegacy) && secondaryLegacy.length > 0) {
    return secondaryLegacy.map((sector) => sector.sector_name).join(", ");
  }

  return "-";
}

type CounterpartyCompany = {
  id?: number;
  name: string;
  _is_that_investor?: boolean;
  _is_that_data_analytic_company?: boolean;
  _url?: string;
  _investor_profile_id?: number;
};

export function getCounterpartyHref(
  counterparty: CorporateEvent["other_counterparties"][number]
): string {
  const nc = counterparty._new_company as CounterpartyCompany | undefined;
  if (!nc) return "";

  const cpId =
    (counterparty as { new_company_counterparty?: number }).new_company_counterparty ||
    nc.id;

  if (nc._is_that_investor) {
    if (typeof cpId === "number") return `/investors/${cpId}`;
    if (typeof nc._url === "string" && nc._url) {
      return nc._url.replace(/\/(?:investor)\//, "/investors/");
    }
    return "";
  }

  if (nc._is_that_data_analytic_company) {
    return typeof cpId === "number" ? `/company/${cpId}` : "";
  }

  if (typeof nc._url === "string" && nc._url) {
    return nc._url.replace(/\/(?:investor)\//, "/investors/");
  }

  return "";
}

export function getSellerHref(
  counterparty: CorporateEvent["other_counterparties"][number]
): string {
  const nc = counterparty._new_company as CounterpartyCompany | undefined;
  if (!nc) return "";

  const investorProfileId = nc._investor_profile_id;
  const cpId =
    (counterparty as { new_company_counterparty?: number }).new_company_counterparty ||
    nc.id;

  if (nc._is_that_investor) {
    if (typeof investorProfileId === "number" && investorProfileId > 0) {
      return `/investors/${investorProfileId}`;
    }
    return typeof cpId === "number" ? `/investors/${cpId}` : "";
  }

  if (nc._is_that_data_analytic_company) {
    return typeof cpId === "number" ? `/company/${cpId}` : "";
  }

  if (typeof nc._url === "string" && nc._url) {
    return nc._url.replace(/\/(?:investor)\//, "/investors/");
  }

  return "";
}

export function renderSectorLinks(
  text: string,
  nameToId: Record<string, number>
): Array<{ name: string; id?: number }> {
  if (!text || /not available/i.test(text)) return [];
  return text
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((name) => ({
      name,
      id: nameToId[normalizeSectorName(name)],
    }));
}
