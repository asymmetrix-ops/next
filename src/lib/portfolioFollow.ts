import {
  fetchUserPortfolioData,
  portfolioDataToUserPortfolioRecord,
} from "@/lib/portfolioData";
import { XANO_USER_PORTFOLIO_BASE } from "@/lib/portfolioApi";

export { XANO_USER_PORTFOLIO_BASE } from "@/lib/portfolioApi";

export type PortfolioFollowKey =
  | "followed_companies"
  | "followed_advisors"
  | "followed_investors"
  | "followed_sectors"
  | "followed_individuals";

export type UserPortfolioField =
  | "companies"
  | "advisors"
  | "investors"
  | "sectors"
  | "individuals";

export const FOLLOW_KEY_TO_ENTITY_TYPE: Record<PortfolioFollowKey, string> = {
  followed_companies: "company",
  followed_advisors: "advisor",
  followed_investors: "investor",
  followed_sectors: "sector",
  followed_individuals: "individual",
};

export const ENTITY_TYPE_TO_FOLLOW_KEY: Record<
  (typeof FOLLOW_KEY_TO_ENTITY_TYPE)[PortfolioFollowKey],
  PortfolioFollowKey
> = {
  company: "followed_companies",
  advisor: "followed_advisors",
  investor: "followed_investors",
  sector: "followed_sectors",
  individual: "followed_individuals",
};

export const FOLLOW_KEY_TO_PORTFOLIO_FIELD: Record<
  PortfolioFollowKey,
  UserPortfolioField
> = {
  followed_companies: "companies",
  followed_advisors: "advisors",
  followed_investors: "investors",
  followed_sectors: "sectors",
  followed_individuals: "individuals",
};

export type UserPortfolioRecord = {
  user_portfolio_id: number;
  user_id: number;
  companies: number[];
  sectors: number[];
  individuals: number[];
  investors: number[];
  advisors: number[];
};

let cachedRecord: UserPortfolioRecord | null = null;

export function invalidateUserPortfolioRecordCache(): void {
  cachedRecord = null;
}

function getToken(): string | null {
  return typeof window !== "undefined"
    ? localStorage.getItem("asymmetrix_auth_token")
    : null;
}

async function xanoRequest(
  path: string,
  method: string,
  body?: Record<string, unknown>
): Promise<unknown> {
  const token = getToken();
  if (!token) {
    throw Object.assign(new Error("Please sign in to follow."), { status: 401 });
  }

  const res = await fetch(`${XANO_USER_PORTFOLIO_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 401) {
    const retry = await fetch(`${XANO_USER_PORTFOLIO_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: token,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const retryText = await retry.text().catch(() => "");
    let retryData: unknown = null;
    try {
      retryData = retryText ? JSON.parse(retryText) : null;
    } catch {
      retryData = retryText;
    }

    if (!retry.ok) {
      throw Object.assign(
        new Error(`Request failed: ${retry.status} ${retry.statusText}`),
        { status: retry.status, data: retryData }
      );
    }
    return retryData;
  }

  const text = await res.text().catch(() => "");
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw Object.assign(
      new Error(`Request failed: ${res.status} ${res.statusText}`),
      { status: res.status, data }
    );
  }
  return data;
}

export async function fetchUserPortfolioRecord(options?: {
  force?: boolean;
}): Promise<UserPortfolioRecord> {
  if (!options?.force && cachedRecord) {
    return cachedRecord;
  }

  const data = await fetchUserPortfolioData();
  const record = portfolioDataToUserPortfolioRecord(data);
  cachedRecord = record;
  return record;
}

export async function followPortfolioEntities({
  followKey,
  entityIds,
}: {
  followKey: PortfolioFollowKey;
  entityIds: number[];
}): Promise<void> {
  const ids = entityIds.filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length === 0) return;

  const entityType = FOLLOW_KEY_TO_ENTITY_TYPE[followKey];
  invalidateUserPortfolioRecordCache();

  for (const entityId of ids) {
    await xanoRequest("/portfolio/entities", "POST", {
      entity_type: entityType,
      entity_id: entityId,
    });
  }
}

export async function unfollowPortfolioEntities({
  followKey,
  entityIds,
}: {
  followKey: PortfolioFollowKey;
  entityIds: number[];
}): Promise<void> {
  const ids = entityIds.filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length === 0) return;

  const entityType = FOLLOW_KEY_TO_ENTITY_TYPE[followKey];
  invalidateUserPortfolioRecordCache();

  for (const entityId of ids) {
    await xanoRequest("/portfolio/entities/remove", "PATCH", {
      entity_type: entityType,
      entity_id: entityId,
    });
  }
}

export async function followPortfolioEntity({
  followKey,
  entityId,
}: {
  followKey: PortfolioFollowKey;
  entityId: number;
}) {
  return followPortfolioEntities({ followKey, entityIds: [entityId] });
}

export async function unfollowPortfolioEntity({
  followKey,
  entityId,
}: {
  followKey: PortfolioFollowKey;
  entityId: number;
}) {
  return unfollowPortfolioEntities({ followKey, entityIds: [entityId] });
}
