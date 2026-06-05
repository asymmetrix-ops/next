const XANO_BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:xbsQ0H4R:develop";

export type PortfolioFollowKey =
  | "followed_companies"
  | "followed_advisors"
  | "followed_investors"
  | "followed_sectors"
  | "followed_individuals";

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

  const res = await fetch(`${XANO_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

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

export async function followPortfolioEntity({
  followKey,
  entityId,
}: {
  followKey: PortfolioFollowKey;
  entityId: number;
}) {
  const entity_type = FOLLOW_KEY_TO_ENTITY_TYPE[followKey];
  return xanoRequest("/portfolio/entities", "POST", {
    entity_type,
    entity_id: entityId,
  });
}

export async function unfollowPortfolioEntity({
  followKey,
  entityId,
}: {
  followKey: PortfolioFollowKey;
  entityId: number;
}) {
  const entity_type = FOLLOW_KEY_TO_ENTITY_TYPE[followKey];
  return xanoRequest("/portfolio/entities/remove", "PATCH", {
    entity_type,
    entity_id: entityId,
  });
}
