export type NewCompanyCounterparty = {
  id?: number;
  name?: string;
  _is_that_investor?: boolean;
  _is_that_data_analytic_company?: boolean;
  _url?: string | null;
  _investor_profile_id?: number | null;
  _preferred_page?: string | null;
};

export type CounterpartyLike = {
  id?: number;
  name?: string;
  route?: string;
  page_type?: string;
  path?: string;
  entity_type?: string;
  is_investor?: boolean;
  new_company_counterparty?: number;
  _new_company?: NewCompanyCounterparty;
};

function rewriteLegacyUrl(url: string): string {
  try {
    const parsed = new URL(url, "https://www.asymmetrixintelligence.com");
    const pathname = parsed.pathname;
    if (pathname.startsWith("/investor/")) {
      return pathname.replace(/^\/investor\//, "/investors/");
    }
    if (
      pathname.startsWith("/company/") ||
      pathname.startsWith("/investors/")
    ) {
      return pathname;
    }
  } catch {
    // fall through to regex rewrite
  }
  return url.replace(/\/(?:investor)\//, "/investors/");
}

/** Build profile links for corporate-event counterparties (flat or legacy shape). */
export function getCounterpartyHref(
  counterparty: CounterpartyLike,
  options?: { isInvestorHint?: boolean }
): string | null {
  if (typeof counterparty.id === "number" && counterparty.name) {
    return normalizeEntityHref({
      id: counterparty.id,
      route: counterparty.route,
      page_type: counterparty.page_type,
      path: counterparty.path,
      entity_type: counterparty.entity_type,
      is_investor: counterparty.is_investor,
      isInvestorHint: options?.isInvestorHint,
    });
  }

  const nc = counterparty._new_company;
  if (!nc?.name) return null;

  const entityId =
    typeof counterparty.new_company_counterparty === "number"
      ? counterparty.new_company_counterparty
      : typeof nc.id === "number"
        ? nc.id
        : undefined;

  if (typeof entityId !== "number") {
    if (typeof nc._url === "string" && nc._url.trim()) {
      return rewriteLegacyUrl(nc._url.trim());
    }
    return null;
  }

  if (nc._is_that_investor) {
    const investorId =
      typeof nc._investor_profile_id === "number" &&
      nc._investor_profile_id > 0
        ? nc._investor_profile_id
        : entityId;
    return `/investors/${investorId}`;
  }

  const href = normalizeEntityHref({
    id: entityId,
    route: nc._preferred_page ?? undefined,
    page_type: nc._preferred_page ?? undefined,
    is_investor: nc._is_that_investor,
    isInvestorHint: options?.isInvestorHint,
  });
  if (href) return href;

  if (typeof nc._url === "string" && nc._url.trim()) {
    return rewriteLegacyUrl(nc._url.trim());
  }

  return `/company/${entityId}`;
}

export function getTargetHref(target: {
  id?: number;
  name?: string;
  route?: string;
  page_type?: string;
  path?: string;
  entity_type?: string;
  is_investor?: boolean;
}): string | null {
  if (typeof target.id !== "number") return null;
  return (
    normalizeEntityHref({
      id: target.id,
      route: target.route,
      page_type: target.page_type,
      path: target.path,
      entity_type: target.entity_type,
      is_investor: target.is_investor,
    }) ?? `/company/${target.id}`
  );
}

/** Build profile / list links for corporate-event counterparties. */
export function normalizeEntityHref(args: {
  id?: number;
  route?: string;
  page_type?: string;
  path?: string;
  entity_type?: string;
  is_investor?: boolean;
  /** Used when backend gives no page_type/route but we know it's an investor. */
  isInvestorHint?: boolean;
}): string | null {
  const { id, route, page_type, path, entity_type, is_investor, isInvestorHint } =
    args;
  if (typeof id !== "number") return null;

  const buildEntityHref = (kind: "investor" | "company"): string =>
    kind === "investor" ? `/investors/${id}` : `/company/${id}`;

  const getEntityKind = (
    value?: string | null
  ): "investor" | "company" | null => {
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase();
    if (!normalized) return null;
    if (normalized.includes("investor")) return "investor";
    if (normalized.includes("company")) return "company";
    return null;
  };

  const pathValue = String(path ?? "").trim();
  if (pathValue.startsWith("/")) {
    const pathKind = getEntityKind(pathValue);
    if (pathKind) return buildEntityHref(pathKind);
    return pathValue.includes(":id")
      ? pathValue.replace(":id", String(id))
      : pathValue;
  }

  const routeKind = getEntityKind(route);
  if (routeKind) return buildEntityHref(routeKind);

  const pageTypeKind = getEntityKind(page_type);
  if (pageTypeKind) return buildEntityHref(pageTypeKind);

  const entityTypeKind = getEntityKind(entity_type);
  if (entityTypeKind) return buildEntityHref(entityTypeKind);

  if (is_investor === true) return buildEntityHref("investor");
  if (is_investor === false) return buildEntityHref("company");

  if (isInvestorHint) return buildEntityHref("investor");
  return buildEntityHref("company");
}

export function formatCorporateEventDate(
  dateString: string | null | undefined
): string {
  if (!dateString) return "Not available";
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Not available";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Not available";
  }
}
