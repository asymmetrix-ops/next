import { decodeJwt, type JWTPayload } from "jose";

export const CONTRIBUTOR_CRM_PATH = "/contributor-crm";
export const INTERNAL_CRM_ADMIN_PATH = "/admin/internal-crm";

export const CONTRIBUTOR_ACCESS_MESSAGE =
  "Contributor accounts cannot access this platform. Please use the Contributor CRM.";

export function isContributorCrmPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname === CONTRIBUTOR_CRM_PATH ||
    pathname.startsWith(`${CONTRIBUTOR_CRM_PATH}/`)
  );
}

/** Admin internal CRM uses contributor CRM APIs but lives under /admin. */
export function isInternalCrmAdminPath(
  pathname: string | null | undefined
): boolean {
  if (!pathname) return false;
  return (
    pathname === INTERNAL_CRM_ADMIN_PATH ||
    pathname.startsWith(`${INTERNAL_CRM_ADMIN_PATH}/`)
  );
}

/** Paths where contributor CRM API 401s must not log the user out of the main app. */
export function usesContributorCrmAuthContext(
  pathname: string | null | undefined
): boolean {
  return isContributorCrmPath(pathname) || isInternalCrmAdminPath(pathname);
}

export function isAdminUser(user: unknown): boolean {
  return getUserStatus(user) === "admin";
}

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
