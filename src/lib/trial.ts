import { decodeJwt, type JWTPayload } from "jose";

export interface TrialInfo {
  isTrial: boolean;
  isTrialExpired: boolean;
  isTrialActive: boolean;
  trialExpiresAt?: Date;
  daysLeft?: number;
  status?: string;
}

function coerceDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  try {
    if (typeof value === "number") {
      // seconds or ms
      const ms = value > 1e12 ? value : value * 1000;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? undefined : d;
    }
    if (typeof value === "string") {
      const d = new Date(value);
      return isNaN(d.getTime()) ? undefined : d;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

interface UserLike {
  status?: unknown;
  Status?: unknown;
  role?: unknown;
  created_at?: unknown;
  createdAt?: unknown;
}

export function getTrialInfo(
  token: string | null,
  user: UserLike | null | undefined
): TrialInfo {
  let status: string | undefined;
  let createdAt: Date | undefined;

  // Prefer token claims if available
  if (token) {
    try {
      const claims: JWTPayload = decodeJwt(token);
      const rawStatus =
        (claims as Record<string, unknown>).status ??
        (claims as Record<string, unknown>).Status ??
        (claims as Record<string, unknown>).role;
      status = typeof rawStatus === "string" ? rawStatus : undefined;

      const rawCreated =
        (claims as Record<string, unknown>).created_at ??
        (claims as Record<string, unknown>).createdAt ??
        (claims as Record<string, unknown>).user_created_at;
      createdAt = coerceDate(rawCreated);
    } catch {
      // ignore decode errors
    }
  }

  // Fallbacks from stored user object
  if (!status && user) {
    const rawStatus = user.status ?? user.Status ?? user.role;
    status = typeof rawStatus === "string" ? rawStatus : undefined;
  }
  if (!createdAt && user) {
    createdAt = coerceDate(user.created_at ?? user.createdAt);
  }

  const isTrial = (status || "").toLowerCase() === "trial";
  let trialExpiresAt: Date | undefined;
  if (createdAt) {
    trialExpiresAt = new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000);
  }

  const now = new Date();
  const isTrialExpired = isTrial && !!trialExpiresAt && now > trialExpiresAt;
  const isTrialActive = isTrial && !isTrialExpired;

  let daysLeft: number | undefined;
  if (isTrialActive && trialExpiresAt) {
    const diffMs = trialExpiresAt.getTime() - now.getTime();
    daysLeft = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  }

  return {
    isTrial,
    isTrialExpired,
    isTrialActive,
    trialExpiresAt,
    daysLeft,
    status,
  };
}
