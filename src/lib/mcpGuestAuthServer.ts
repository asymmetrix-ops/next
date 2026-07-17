export const MCP_GUEST_AUTH_API_BASE =
  process.env.MCP_GUEST_AUTH_API_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6";

export const MCP_GUEST_AUTH_GENERIC_ERROR =
  "Unable to sign in. If your email is eligible for MCP Guest access, check your inbox for a one-time password.";

export function normalizeMcpGuestEmail(email: string): string {
  return email.trim().toLowerCase();
}
