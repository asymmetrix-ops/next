import { decodeJwt, type JWTPayload } from "jose";

export const MCP_GUEST_ROLE = "MCP Guest";

export const MCP_GUEST_TRACKER_TITLE = "Data & Analytics MCP Release Tracker";

export const MCP_GUEST_TRACKER_REQUEST_TITLE =
  "Request access to Asymmetrix's Data & Analytics MCP Tracker";

export const CONTRIBUTOR_ROLE = "Contributor";

export const ACCESS_DENIED_PATH = "/access-denied";

export const MCP_GUEST_ALLOWED_PATH = "/companies";

/** Primary public link to share — request access form */
export const MCP_GUEST_ENTRY_PATH = "/mcp-guest/request";

export const MCP_GUEST_REQUEST_PATH = MCP_GUEST_ENTRY_PATH;

/** Email + status check + OTP sign-in for approved guests */
export const MCP_GUEST_SIGN_IN_PATH = "/mcp-guest/sign-in";

/** OTP sign-in entry (e.g. links from approval emails) */
export const MCP_GUEST_OTP_LOGIN_PATH = "/mcp-guest/login?otp=true";

/** Legacy URL — redirects to the request entry page unless ?otp=true */
export const MCP_GUEST_LOGIN_PATH = "/mcp-guest/login";

export const MCP_GUEST_CONVERSION_PATH = "/mcp-guest/upgrade";

/** Calendly booking page for MCP Guest sales conversion */
export const MCP_GUEST_CALENDLY_URL =
  process.env.NEXT_PUBLIC_MCP_GUEST_CALENDLY_URL ||
  "https://calendly.com/d/cvxj-zdj-nss/intro-call-with-asymmetrix";

const MCP_GUEST_SUPPORT_EMAIL = "asymmetrix@asymmetrixintelligence.com";

export const MCP_GUEST_CONTRIBUTE_MAILTO = `mailto:${MCP_GUEST_SUPPORT_EMAIL}?subject=${encodeURIComponent(
  "Contribute Company Data"
)}&body=${encodeURIComponent(
  "Please describe the data you would like to contribute for your company."
)}`;

export const MCP_GUEST_SUBSCRIPTION_MAILTO = `mailto:${MCP_GUEST_SUPPORT_EMAIL}?subject=${encodeURIComponent(
  "Asymmetrix subscription inquiry"
)}&body=${encodeURIComponent(
  "Please share how we can help with an Asymmetrix subscription."
)}`;

export const MCP_GUEST_PUBLIC_PATHS = [
  MCP_GUEST_ENTRY_PATH,
  MCP_GUEST_SIGN_IN_PATH,
  MCP_GUEST_LOGIN_PATH,
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
