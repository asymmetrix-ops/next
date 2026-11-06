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

// ── AsymmIQ chat with session memory (Xano: asymmiq_chat / asymmiq_session_close) ──────────────

const ASYMIQ_API_BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:SR8tuqs-";

export type AsymIQEntity = {
  raw: string;
  type: string;
  id: number;
  name: string;
  url: string;
  logo?: string | null;
};

export type AsymIQChoice = AsymIQEntity;

export type AsymIQListLink = {
  url: string;
  label: string;
  summary: string;
  applied: string[];
  rejected: { filter?: string; value?: string; reason: string }[];
  note?: string;
};

export type AsymIQCard = {
  id: number;
  title: string;
  type: string;
  kind: "News" | "Insights & Analysis";
  date: string | null;
  url: string;
};

export type AsymIQChatReply = {
  session_uid: string;
  message_id: number;
  seq: number;
  reply: string;
  entities: AsymIQEntity[];
  choices: AsymIQChoice[];
  list_links: AsymIQListLink[];
  suggestions: string[];
  cards: AsymIQCard[];
  actions: string[];
};

async function asymiqPost<T>(path: string, body: unknown): Promise<T> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Please log in to use AsymIQ.");
  }
  const res = await fetch(`${ASYMIQ_API_BASE}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    throw new Error(
      (typeof data.message === "string" && data.message) ||
        raw ||
        "Unable to reach AsymIQ. Please try again."
    );
  }
  return data as T;
}

export async function sendAsymIQMessage(
  message: string,
  sessionUid: string | null
): Promise<AsymIQChatReply> {
  const trimmed = message.trim();
  if (!trimmed) throw new Error("Please enter a question.");
  const data = await asymiqPost<Partial<AsymIQChatReply>>("asymmiq_chat", {
    message: trimmed,
    ...(sessionUid ? { session_uid: sessionUid } : {}),
  });
  return {
    session_uid: data.session_uid ?? "",
    message_id: data.message_id ?? 0,
    seq: data.seq ?? 0,
    reply: data.reply ?? "",
    entities: data.entities ?? [],
    choices: data.choices ?? [],
    list_links: data.list_links ?? [],
    suggestions: data.suggestions ?? [],
    cards: data.cards ?? [],
    actions: data.actions ?? [],
  };
}

/** Ends a conversation (new chat / widget closed): memory is not reused afterwards. */
export async function closeAsymIQSession(sessionUid: string): Promise<void> {
  try {
    await asymiqPost("asymmiq_session_close", { session_uid: sessionUid });
  } catch {
    /* best effort */
  }
}
