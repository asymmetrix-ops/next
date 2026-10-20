import { XANO_HOST } from "@/lib/apiBase";
export const MCP_GUEST_REQUEST_API_BASE =
  process.env.MCP_GUEST_REQUEST_API_URL ||
  `${XANO_HOST}/api:UXwnqlMz/mcp_guest_request`;

export const MCP_GUEST_REQUEST_STATUS_URL = `${MCP_GUEST_REQUEST_API_BASE}/status`;

export const MCP_GUEST_REQUEST_GENERIC_ERROR =
  "Unable to check your request status. Please try again.";

export function normalizeMcpGuestRequestEmail(email: string): string {
  return email.trim().toLowerCase();
}
