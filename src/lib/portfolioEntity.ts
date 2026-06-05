import type { XanoPortfolio } from "@/store/portfolioStore";
import {
  ENTITY_TYPE_TO_FOLLOW_KEY,
  followPortfolioEntity,
} from "@/lib/portfolioFollow";

export type PortfolioEntityType =
  | "company"
  | "advisor"
  | "investor"
  | "sector"
  | "individual";

export type PortfolioEntityRef = {
  id: number;
  name: string;
};

/** Parse followed_* from Xano — supports number[], object[], or JSON string. */
export function parseFollowedEntities(raw: unknown): PortfolioEntityRef[] {
  if (raw == null) return [];

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "[]") return [];
    try {
      return parseFollowedEntities(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }

  if (!Array.isArray(raw)) return [];

  const out: PortfolioEntityRef[] = [];
  for (const item of raw) {
    if (typeof item === "number" && Number.isFinite(item) && item > 0) {
      out.push({ id: item, name: "" });
      continue;
    }
    if (item && typeof item === "object") {
      const obj = item as { id?: unknown; name?: unknown };
      const id =
        typeof obj.id === "number"
          ? obj.id
          : typeof obj.id === "string"
          ? Number.parseInt(obj.id, 10)
          : NaN;
      if (Number.isFinite(id) && id > 0) {
        out.push({
          id,
          name: typeof obj.name === "string" ? obj.name.trim() : "",
        });
      }
    }
  }
  return out;
}

type FollowedFieldsInput = {
  followed_companies: unknown;
  followed_advisors: unknown;
  followed_investors: unknown;
  followed_sectors: unknown;
  followed_individuals: unknown;
};

function getFollowedRefs(
  portfolio: FollowedFieldsInput,
  entityType: PortfolioEntityType
): PortfolioEntityRef[] {
  switch (entityType) {
    case "company":
      return parseFollowedEntities(portfolio.followed_companies);
    case "advisor":
      return parseFollowedEntities(portfolio.followed_advisors);
    case "investor":
      return parseFollowedEntities(portfolio.followed_investors);
    case "sector":
      return parseFollowedEntities(portfolio.followed_sectors);
    case "individual":
      return parseFollowedEntities(portfolio.followed_individuals);
    default:
      return [];
  }
}

function getFollowedIds(
  portfolio: XanoPortfolio,
  entityType: PortfolioEntityType
): number[] {
  return getFollowedRefs(portfolio, entityType).map((e) => e.id);
}

export function countPortfolioEntities(portfolio: FollowedFieldsInput): number {
  return (
    parseFollowedEntities(portfolio.followed_companies).length +
    parseFollowedEntities(portfolio.followed_sectors).length +
    parseFollowedEntities(portfolio.followed_individuals).length +
    parseFollowedEntities(portfolio.followed_investors).length +
    parseFollowedEntities(portfolio.followed_advisors).length
  );
}

export type PortfolioEntityRow = {
  entity: PortfolioEntityType;
  id: number;
  name: string;
};

/** Flatten a single-portfolio GET response into table rows. */
export function portfolioDetailToRows(
  detail: Record<string, unknown>
): PortfolioEntityRow[] {
  const rows: PortfolioEntityRow[] = [];
  const append = (entity: PortfolioEntityType, refs: PortfolioEntityRef[]) => {
    for (const ref of refs) {
      rows.push({
        entity,
        id: ref.id,
        name: ref.name || `${entity} #${ref.id}`,
      });
    }
  };

  append("company", parseFollowedEntities(detail.followed_companies));
  append("sector", parseFollowedEntities(detail.followed_sectors));
  append("individual", parseFollowedEntities(detail.followed_individuals));
  append("investor", parseFollowedEntities(detail.followed_investors));
  append("advisor", parseFollowedEntities(detail.followed_advisors));

  return rows;
}

export async function fetchUserPortfolioDetail(
  portfolioId: number,
  init?: { signal?: AbortSignal }
): Promise<Record<string, unknown>> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("asymmetrix_auth_token")
      : null;

  if (!token) {
    throw new Error("Please sign in to view this portfolio.");
  }

  const res = await fetch(`/api/portfolio/lists/${portfolioId}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "x-asym-token": token,
    },
    credentials: "include",
    signal: init?.signal,
  });

  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;

  if (!res.ok) {
    const msg =
      typeof json?.error === "string" ? json.error : `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return json && typeof json === "object" ? json : {};
}

export function isEntityInPortfolio(
  portfolio: XanoPortfolio,
  entityType: PortfolioEntityType,
  entityId: number
): boolean {
  return getFollowedIds(portfolio, entityType).includes(entityId);
}

/** Check membership from a single-portfolio GET response (JSON-string followed_* fields). */
export function detailContainsEntity(
  detail: Record<string, unknown>,
  entityType: PortfolioEntityType,
  entityId: number
): boolean {
  return getFollowedRefs(
    {
      followed_companies: detail.followed_companies,
      followed_advisors: detail.followed_advisors,
      followed_investors: detail.followed_investors,
      followed_sectors: detail.followed_sectors,
      followed_individuals: detail.followed_individuals,
    },
    entityType
  ).some((ref) => ref.id === entityId);
}

export type EntityListCheckResult = {
  in_portfolio: boolean;
  lists: Array<{ id: number; portfolio_label: string }>;
};

function parseEntityListCheck(raw: unknown): EntityListCheckResult {
  const empty: EntityListCheckResult = { in_portfolio: false, lists: [] };
  if (!raw || typeof raw !== "object") return empty;

  const obj = raw as Record<string, unknown>;
  const in_portfolio = obj.in_portfolio === true;

  const lists: EntityListCheckResult["lists"] = [];
  if (Array.isArray(obj.lists)) {
    for (const item of obj.lists) {
      if (!item || typeof item !== "object") continue;
      const row = item as { id?: unknown; portfolio_label?: unknown };
      const id =
        typeof row.id === "number"
          ? row.id
          : typeof row.id === "string"
          ? Number.parseInt(row.id, 10)
          : NaN;
      if (!Number.isFinite(id) || id <= 0) continue;
      lists.push({
        id,
        portfolio_label:
          typeof row.portfolio_label === "string" ? row.portfolio_label : "",
      });
    }
  }

  return { in_portfolio, lists };
}

/**
 * Which named lists contain this entity (single Xano lists/entity/check call).
 */
export async function fetchEntityListMembership(args: {
  entityType: PortfolioEntityType;
  entityId: number;
  /** Known list ids — used to build a full checkbox map. */
  portfolioIds?: number[];
  signal?: AbortSignal;
}): Promise<{
  membershipMap: Record<number, boolean>;
  inPortfolio: boolean;
  containingLists: EntityListCheckResult["lists"];
}> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("asymmetrix_auth_token")
      : null;

  if (!token) {
    throw new Error("Please sign in to check list membership.");
  }

  const qs = new URLSearchParams({
    entity_type: args.entityType,
    entity_id: String(args.entityId),
  });

  const res = await fetch(`/api/portfolio/lists/entity/check?${qs.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "x-asym-token": token,
    },
    credentials: "include",
    signal: args.signal,
  });

  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    const msg =
      json && typeof json === "object" && "error" in json
        ? String((json as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }

  const parsed = parseEntityListCheck(json);
  const containingIds = new Set(parsed.lists.map((l) => l.id));

  const membershipMap: Record<number, boolean> = {};
  for (const id of args.portfolioIds ?? []) {
    membershipMap[id] = containingIds.has(id);
  }
  for (const list of parsed.lists) {
    membershipMap[list.id] = true;
  }

  return {
    membershipMap,
    inPortfolio: parsed.in_portfolio,
    containingLists: parsed.lists,
  };
}

export function getPortfoliosContainingEntity(
  portfolios: XanoPortfolio[],
  entityType: PortfolioEntityType,
  entityId: number
): XanoPortfolio[] {
  return portfolios.filter((p) => isEntityInPortfolio(p, entityType, entityId));
}

export async function addEntityToPortfolioApi(args: {
  portfolioId: number;
  entityType: PortfolioEntityType;
  entityId: number;
}): Promise<void> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("asymmetrix_auth_token")
      : null;

  if (!token) {
    throw new Error("Please sign in to add to a portfolio.");
  }

  const res = await fetch(`/api/portfolio/lists/${args.portfolioId}/entities`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-asym-token": token,
    },
    credentials: "include",
    body: JSON.stringify({
      id: args.portfolioId,
      entity_type: args.entityType,
      entity_id: args.entityId,
    }),
  });

  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;

  if (!res.ok) {
    const msg =
      typeof json?.error === "string" ? json.error : `Request failed (${res.status})`;
    throw new Error(msg);
  }

  // Adding to any list also follows globally in the user's portfolio.
  const followKey = ENTITY_TYPE_TO_FOLLOW_KEY[args.entityType];
  try {
    await followPortfolioEntity({ followKey, entityId: args.entityId });
  } catch {
    // List add succeeded; entity may already be followed globally.
  }
}

export async function removeEntityFromPortfolioApi(args: {
  portfolioId: number;
  entityType: PortfolioEntityType;
  entityId: number;
}): Promise<void> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("asymmetrix_auth_token")
      : null;

  if (!token) {
    throw new Error("Please sign in to update a portfolio.");
  }

  const res = await fetch(
    `/api/portfolio/lists/${args.portfolioId}/entities/remove`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-asym-token": token,
      },
      credentials: "include",
      body: JSON.stringify({
        id: args.portfolioId,
        entity_type: args.entityType,
        entity_id: args.entityId,
      }),
    }
  );

  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;

  if (!res.ok) {
    const msg =
      typeof json?.error === "string" ? json.error : `Request failed (${res.status})`;
    throw new Error(msg);
  }
}
