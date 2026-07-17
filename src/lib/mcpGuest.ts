import { decodeJwt, type JWTPayload } from "jose";

export const MCP_GUEST_ROLE = "MCP Guest";

export const CONTRIBUTOR_ROLE = "Contributor";

export const ACCESS_DENIED_PATH = "/access-denied";

export const MCP_GUEST_ALLOWED_PATH = "/companies";

export const MCP_GUEST_LOGIN_PATH = "/mcp-guest/login";

export const MCP_GUEST_REQUEST_PATH = "/mcp-guest/request";

export const MCP_GUEST_CONVERSION_PATH = "/mcp-guest/upgrade";

export const MCP_GUEST_PUBLIC_PATHS = [
  MCP_GUEST_LOGIN_PATH,
  MCP_GUEST_REQUEST_PATH,
] as const;

export const MCP_GUEST_SESSION_PATHS = [
  MCP_GUEST_ALLOWED_PATH,
  MCP_GUEST_CONVERSION_PATH,
] as const;

export const MCP_GUEST_LOCKED_FILTER = {
  id: "has_mcp",
  value: { yes: true, no: false },
} as const;

function normalizeStatus(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
}

export function isMcpGuestStatus(value: unknown): boolean {
  return normalizeStatus(value) === "mcp guest";
}

export function isContributorStatus(value: unknown): boolean {
  return normalizeStatus(value) === "contributor";
}

export function isContributorUser(user: unknown): boolean {
  return isContributorStatus(getUserStatus(user));
}

export function isContributorSession(
  token: string | null,
  user: unknown
): boolean {
  if (token) {
    try {
      const claims = decodeJwt(token) as JWTPayload & Record<string, unknown>;
      const raw = claims.status ?? claims.Status ?? claims.role;
      if (isContributorStatus(raw)) return true;
    } catch {
      // ignore decode errors
    }
  }

  return isContributorUser(user);
}

export function getUserStatus(user: unknown): string {
  const record = user as Record<string, unknown> | null | undefined;
  return String(record?.Status ?? record?.status ?? record?.role ?? "");
}

export function isMcpGuestUser(user: unknown): boolean {
  return isMcpGuestStatus(getUserStatus(user));
}

export function isMcpGuestSession(
  token: string | null,
  user: unknown
): boolean {
  if (token) {
    try {
      const claims = decodeJwt(token) as JWTPayload & Record<string, unknown>;
      const raw = claims.status ?? claims.Status ?? claims.role;
      if (isMcpGuestStatus(raw)) return true;
    } catch {
      // ignore decode errors
    }
  }

  return isMcpGuestUser(user);
}
