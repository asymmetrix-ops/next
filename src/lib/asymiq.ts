const ASYMIQ_AGENT_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:SR8tuqs-/call_Company_Profile_Agent";

export type AsymIQAgentResponse = {
  result?: string;
  finishReason?: string;
  steps?: unknown[];
  message?: string;
  error?: string;
};

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("asymmetrix_auth_token");
  } catch {
    return null;
  }
}

export async function askCompanyProfileAgent(
  userQuery: string
): Promise<string> {
  const trimmed = userQuery.trim();
  if (!trimmed) {
    throw new Error("Please enter a question.");
  }

  const token = getAuthToken();
  const res = await fetch(ASYMIQ_AGENT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      args: { user_query: trimmed },
    }),
  });

  const raw = await res.text();
  let data: AsymIQAgentResponse = {};
  try {
    data = raw ? (JSON.parse(raw) as AsymIQAgentResponse) : {};
  } catch {
    if (!res.ok) {
      throw new Error(raw || "Unable to reach AsymIQ. Please try again.");
    }
  }

  if (!res.ok) {
    throw new Error(
      data.message ||
        data.error ||
        raw ||
        "Unable to reach AsymIQ. Please try again."
    );
  }

  const result = typeof data.result === "string" ? data.result.trim() : "";
  if (!result) {
    throw new Error("AsymIQ returned an empty response. Please try again.");
  }

  return result;
}
