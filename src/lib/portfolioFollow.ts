export type PortfolioFollowKey =
  | "followed_companies"
  | "followed_advisors"
  | "followed_investors"
  | "followed_sectors"
  | "followed_individuals";

type FollowArgs = {
  followKey: PortfolioFollowKey;
  entityId: number;
};

type UnfollowArgs = {
  followKey: PortfolioFollowKey;
};

export async function followPortfolioEntity({ followKey, entityId }: FollowArgs) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("asymmetrix_auth_token")
      : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) headers["x-asym-token"] = token;

  const res = await fetch("/api/portfolio", {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ [followKey]: entityId }),
  });

  const text = await res.text().catch(() => "");
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const err = new Error(`Follow failed: ${res.status} ${res.statusText}`);
    (err as Error & { status?: number; data?: unknown }).status = res.status;
    (err as Error & { status?: number; data?: unknown }).data = data;
    throw err;
  }

  return data;
}

export async function unfollowPortfolioEntity({ followKey }: UnfollowArgs) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("asymmetrix_auth_token")
      : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) headers["x-asym-token"] = token;

  const res = await fetch("/api/portfolio", {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ [followKey]: null }),
  });

  const text = await res.text().catch(() => "");
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const err = new Error(`Unfollow failed: ${res.status} ${res.statusText}`);
    (err as Error & { status?: number; data?: unknown }).status = res.status;
    (err as Error & { status?: number; data?: unknown }).data = data;
    throw err;
  }

  return data;
}

