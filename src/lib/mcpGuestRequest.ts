import { assertWorkEmail } from "@/lib/workEmail";

const MCP_GUEST_REQUEST_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:UXwnqlMz:develop/mcp_guest_request";

export type McpGuestRequestStatus =
  | "not_submitted"
  | "pending"
  | "rejected"
  | "approved";

export interface McpGuestRequestStatusResult {
  status: McpGuestRequestStatus;
  company: string | null;
}

export interface McpGuestRequestPayload {
  first_name: string;
  last_name: string;
  company: string;
  work_email: string;
  new_company_id: number;
}

export interface McpGuestCompanyOption {
  id: number;
  name: string;
}

const MCP_GUEST_COMPANIES_SEARCH_API =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/companies/search";

export async function searchMcpGuestCompanies(
  query: string
): Promise<McpGuestCompanyOption[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    search_term: trimmed,
    page: "1",
    page_size: "15",
  });

  const response = await fetch(
    `${MCP_GUEST_COMPANIES_SEARCH_API}?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) return [];

  const data = await response.json().catch(() => null);
  const items = Array.isArray(data?.companies)
    ? (data.companies as Array<{ id: number; name: string }>)
    : [];

  return items
    .map((company) => ({
      id: Number(company.id),
      name: String(company.name || "").trim(),
    }))
    .filter((company) => company.id > 0 && company.name);
}

export type McpGuestActionOutcome =
  | "accepted"
  | "rejected"
  | "already_actioned";

export interface McpGuestActionResult {
  outcome: McpGuestActionOutcome;
  company?: string | null;
  email?: string | null;
}

function readStringField(data: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function parseMcpGuestActionResult(
  data: unknown,
  fallbackAction: "accept" | "reject"
): McpGuestActionResult {
  const record =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};

  const rawOutcome = readStringField(record, "$outcome", "outcome");
  let outcome: McpGuestActionOutcome;

  if (rawOutcome === "already_actioned") {
    outcome = "already_actioned";
  } else if (rawOutcome === "accepted" || rawOutcome === "accept") {
    outcome = "accepted";
  } else if (rawOutcome === "rejected" || rawOutcome === "reject") {
    outcome = "rejected";
  } else {
    outcome = fallbackAction === "accept" ? "accepted" : "rejected";
  }

  return {
    outcome,
    company: readStringField(record, "company"),
    email: readStringField(record, "email", "work_email"),
  };
}

async function callMcpGuestAction(
  action: "accept" | "reject",
  token: string
): Promise<McpGuestActionResult> {
  const params = new URLSearchParams({ token });

  const response = await fetch(
    `${MCP_GUEST_REQUEST_BASE}/${action}?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      readStringField(
        data && typeof data === "object" ? (data as Record<string, unknown>) : {},
        "message",
        "error"
      ) ?? `Failed to ${action} MCP guest request`
    );
  }

  return parseMcpGuestActionResult(data, action);
}

function parseMcpGuestRequestStatus(data: unknown): McpGuestRequestStatusResult {
  const record =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};

  const rawStatus = readStringField(record, "status") ?? "not_submitted";
  const status = (
    ["not_submitted", "pending", "rejected", "approved"] as const
  ).includes(rawStatus as McpGuestRequestStatus)
    ? (rawStatus as McpGuestRequestStatus)
    : "not_submitted";

  const company = readStringField(record, "company");

  return {
    status,
    company,
  };
}

export async function fetchMcpGuestRequestStatus(
  workEmail: string
): Promise<McpGuestRequestStatusResult> {
  assertWorkEmail(workEmail);

  const response = await fetch("/api/mcp-guest/request/status", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ work_email: workEmail.trim().toLowerCase() }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      readStringField(
        data && typeof data === "object" ? (data as Record<string, unknown>) : {},
        "error",
        "message"
      ) ?? "Unable to check your request status. Please try again."
    );
  }

  return parseMcpGuestRequestStatus(data);
}

export async function submitMcpGuestRequest(
  payload: McpGuestRequestPayload
): Promise<void> {
  assertWorkEmail(payload.work_email);

  const response = await fetch(`${MCP_GUEST_REQUEST_BASE}/submit`, {
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

export function acceptMcpGuestRequest(
  token: string
): Promise<McpGuestActionResult> {
  return callMcpGuestAction("accept", token);
}

export function rejectMcpGuestRequest(
  token: string
): Promise<McpGuestActionResult> {
  return callMcpGuestAction("reject", token);
}
