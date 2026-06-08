import { resolveAuthUserId } from "@/lib/userLists";

const XANO_USER_PORTFOLIO_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:jlAOWruI";

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
let cachedRecordUserId: number | null = null;

export function invalidateUserPortfolioRecordCache(): void {
  cachedRecord = null;
  cachedRecordUserId = null;
}

function getToken(): string | null {
  return typeof window !== "undefined"
    ? localStorage.getItem("asymmetrix_auth_token")
    : null;
}

function parseFiniteId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parsePortfolioIdArray(raw: unknown): number[] {
  if (raw == null) return [];

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "[]") return [];
    try {
      return parsePortfolioIdArray(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }

  if (!Array.isArray(raw)) return [];

  const out: number[] = [];
  for (const item of raw) {
    if (typeof item === "number" && Number.isFinite(item) && item > 0) {
      out.push(item);
      continue;
    }
    if (item && typeof item === "object") {
      const id = parseFiniteId((item as { id?: unknown }).id);
      if (id != null && id > 0) out.push(id);
    }
  }
  return out;
}

function normalizeUserPortfolioRecord(
  raw: Record<string, unknown>,
  expectedUserId?: number
): UserPortfolioRecord | null {
  const user_portfolio_id =
    parseFiniteId(raw.user_portfolio_id) ?? parseFiniteId(raw.id);
  const user_id = parseFiniteId(raw.user_id);

  if (user_portfolio_id == null || user_portfolio_id <= 0) return null;
  if (user_id == null || user_id <= 0) return null;
  if (expectedUserId != null && user_id !== expectedUserId) return null;

  return {
    user_portfolio_id,
    user_id,
    companies: parsePortfolioIdArray(raw.companies),
    sectors: parsePortfolioIdArray(raw.sectors),
    individuals: parsePortfolioIdArray(raw.individuals),
    investors: parsePortfolioIdArray(raw.investors),
    advisors: parsePortfolioIdArray(raw.advisors),
  };
}

function parseUserPortfolioResponse(
  data: unknown,
  userId: number
): UserPortfolioRecord | null {
  if (Array.isArray(data)) {
    for (const item of data) {
      if (!item || typeof item !== "object") continue;
      const record = normalizeUserPortfolioRecord(
        item as Record<string, unknown>,
        userId
      );
      if (record) return record;
    }
    return null;
  }

  if (data && typeof data === "object") {
    return normalizeUserPortfolioRecord(data as Record<string, unknown>, userId);
  }

  return null;
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
  const userId = await resolveAuthUserId();
  if (userId == null) {
    throw Object.assign(new Error("Could not resolve user id"), { status: 401 });
  }

  if (
    !options?.force &&
    cachedRecord &&
    cachedRecordUserId === userId
  ) {
    return cachedRecord;
  }

  const data = await xanoRequest(
    `/user_portfolio?user_id=${encodeURIComponent(String(userId))}`,
    "GET"
  );

  const record = parseUserPortfolioResponse(data, userId);
  if (!record) {
    throw new Error("Could not load your portfolio record.");
  }

  cachedRecord = record;
  cachedRecordUserId = userId;
  return record;
}

function mergeUniqueIds(existing: number[], additions: number[]): number[] {
  const merged = new Set(existing);
  for (const id of additions) {
    if (Number.isFinite(id) && id > 0) merged.add(id);
  }
  return Array.from(merged);
}

function removeIds(existing: number[], removals: number[]): number[] {
  const removeSet = new Set(
    removals.filter((id) => Number.isFinite(id) && id > 0)
  );
  return existing.filter((id) => !removeSet.has(id));
}

function buildPatchPayload(record: UserPortfolioRecord): Record<string, unknown> {
  return {
    user_portfolio_id: record.user_portfolio_id,
    user_id: record.user_id,
    companies: record.companies,
    sectors: record.sectors,
    individuals: record.individuals,
    investors: record.investors,
    advisors: record.advisors,
  };
}

async function patchUserPortfolioRecord(
  record: UserPortfolioRecord
): Promise<UserPortfolioRecord> {
  const data = await xanoRequest(
    `/user_portfolio/${record.user_portfolio_id}`,
    "PATCH",
    buildPatchPayload(record)
  );

  const patched = parseUserPortfolioResponse(data, record.user_id) ?? record;
  cachedRecord = patched;
  cachedRecordUserId = patched.user_id;
  return patched;
}

export async function followPortfolioEntities({
  followKey,
  entityIds,
}: {
  followKey: PortfolioFollowKey;
  entityIds: number[];
}): Promise<UserPortfolioRecord> {
  const ids = entityIds.filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length === 0) {
    return fetchUserPortfolioRecord();
  }

  const field = FOLLOW_KEY_TO_PORTFOLIO_FIELD[followKey];
  const record = await fetchUserPortfolioRecord({ force: true });
  const nextRecord: UserPortfolioRecord = {
    ...record,
    [field]: mergeUniqueIds(record[field], ids),
  };

  return patchUserPortfolioRecord(nextRecord);
}

export async function unfollowPortfolioEntities({
  followKey,
  entityIds,
}: {
  followKey: PortfolioFollowKey;
  entityIds: number[];
}): Promise<UserPortfolioRecord> {
  const ids = entityIds.filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length === 0) {
    return fetchUserPortfolioRecord();
  }

  const field = FOLLOW_KEY_TO_PORTFOLIO_FIELD[followKey];
  const record = await fetchUserPortfolioRecord({ force: true });
  const nextRecord: UserPortfolioRecord = {
    ...record,
    [field]: removeIds(record[field], ids),
  };

  return patchUserPortfolioRecord(nextRecord);
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
