const MCP_GUEST_REQUEST_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:UXwnqlMz:develop/mcp_guest_request/submit";

export interface McpGuestRequestPayload {
  first_name: string;
  last_name: string;
  company: string;
  work_email: string;
}

export async function submitMcpGuestRequest(
  payload: McpGuestRequestPayload
): Promise<void> {
  const response = await fetch(MCP_GUEST_REQUEST_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to submit MCP guest request");
  }
}
