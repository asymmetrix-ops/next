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
