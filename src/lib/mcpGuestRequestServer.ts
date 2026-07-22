export const MCP_GUEST_REQUEST_API_BASE =
  process.env.MCP_GUEST_REQUEST_API_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:UXwnqlMz:develop/mcp_guest_request";

export const MCP_GUEST_REQUEST_STATUS_URL = `${MCP_GUEST_REQUEST_API_BASE}/status`;

export const MCP_GUEST_REQUEST_GENERIC_ERROR =
  "Unable to check your request status. Please try again.";

export function normalizeMcpGuestRequestEmail(email: string): string {
  return email.trim().toLowerCase();
}
