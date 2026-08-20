import { NextResponse } from "next/server";
import {
  clearContributorServiceToken,
  getContributorServiceToken,
} from "@/lib/contributorCrm/server/serviceAuth";

const XANO_ORIGIN = "https://xdil-abvj-o7rq.e2.xano.io";

const GET_API_GROUPS = new Set([
  "GYQcK4au",
  "bSPJOS6A",
  "8KyIulob",
  "8Bv5PK4I",
  "617tZc8l",
  "5YnK3rYr",
  "tDNMS_i0",
]);

const POST_PATH_ALLOW = [
  /^\/api:GYQcK4au\/get_company_transaction_status$/,
  /^\/api:GYQcK4au\/company_financial_metrics$/,
  /^\/api:GYQcK4au\/Get_new_company\/\d+$/,
];

const BLOCKED_PATH =
  /auth|otp|change_request|crm_email|email_content|apply_company|import_rows|new_file|accept_new_entity/i;

export type ContributorXanoProxyRequest = {
  url?: unknown;
  method?: unknown;
  body?: unknown;
  contentType?: unknown;
};

function isAllowedXanoRequest(url: URL, method: string): boolean {
  if (url.origin !== XANO_ORIGIN) return false;

  const match = url.pathname.match(/^\/api:([^/]+)(\/.*)$/);
  if (!match) return false;

  const [, group, rest] = match;
  if (BLOCKED_PATH.test(url.pathname)) return false;

  if (method === "GET") {
    if (group === "tDNMS_i0") {
      return rest === "/users/submissions";
    }
    if (group === "GYQcK4au" && rest === "/Get_new_companies") {
      const query = url.searchParams.get("query")?.trim() ?? "";
      return query.length >= 2;
    }
    return GET_API_GROUPS.has(group);
  }

  if (method === "POST") {
    return POST_PATH_ALLOW.some((re) => re.test(url.pathname));
  }

  return false;
}

async function authorizedXanoFetch(
  url: string,
  init: RequestInit,
  forceRefresh = false
): Promise<Response> {
  const token = await getContributorServiceToken(forceRefresh);
  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
}

export async function proxyContributorXanoRequest(
  payload: ContributorXanoProxyRequest
): Promise<NextResponse> {
  const rawUrl = typeof payload.url === "string" ? payload.url.trim() : "";
  const method = String(payload.method || "GET").toUpperCase();
  const contentType =
    typeof payload.contentType === "string" && payload.contentType.trim()
      ? payload.contentType.trim()
      : "application/json";
  const body =
    typeof payload.body === "string"
      ? payload.body
      : payload.body == null
        ? undefined
        : JSON.stringify(payload.body);

  if (!rawUrl) {
    return NextResponse.json({ error: "url is required." }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Invalid url." }, { status: 400 });
  }

  if (!isAllowedXanoRequest(url, method)) {
    return NextResponse.json(
      { error: "This contributor API is not allowed through service auth." },
      { status: 403 }
    );
  }

  if (method === "GET" && body) {
    return NextResponse.json(
      { error: "GET requests cannot include a body." },
      { status: 400 }
    );
  }

  const init: RequestInit = {
    method,
    headers: {
      Accept: "application/json",
      ...(method === "GET" ? {} : { "Content-Type": contentType }),
    },
    ...(body && method !== "GET" ? { body } : {}),
  };

  let upstream = await authorizedXanoFetch(url.toString(), init);
  if (upstream.status === 401) {
    clearContributorServiceToken();
    upstream = await authorizedXanoFetch(url.toString(), init, true);
  }

  const text = await upstream.text().catch(() => "");
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") || "application/json",
    },
  });
}
