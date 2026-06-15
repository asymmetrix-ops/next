import { decodeJwt, type JWTPayload } from "jose";

export const CONTRIBUTOR_CRM_PATH = "/contributor-crm";

export const CONTRIBUTOR_ACCESS_MESSAGE =
  "Contributor accounts cannot access this platform. Please use the Contributor CRM.";

export function getUserStatus(user: unknown): string {
  const u = user as Record<string, unknown> | null | undefined;
  return String(u?.Status ?? u?.status ?? u?.role ?? "").toLowerCase();
}

export function getTokenUserStatus(token: string | null): string {
  if (!token) return "";
  try {
    const claims = decodeJwt(token) as JWTPayload & Record<string, unknown>;
    const raw = claims.status ?? claims.Status ?? claims.role;
    return typeof raw === "string" ? raw.toLowerCase() : "";
  } catch {
    return "";
  }
}

export function isContributorUser(user: unknown): boolean {
  return getUserStatus(user) === "contributor";
}

/** Matches JWT claims and/or AuthProvider user status fields. */
export function isContributorSession(
  token: string | null,
  user: unknown
): boolean {
  if (getTokenUserStatus(token) === "contributor") return true;
  return isContributorUser(user);
}
