import { isContributorCrmPath } from "@/lib/userStatus";

const PROXY_PATH = "/contributor-crm/api/xano-proxy";
const XANO_ORIGIN = "https://xdil-abvj-o7rq.e2.xano.io";

function assertContributorPageContext(): void {
  if (typeof window === "undefined") return;
  if (!isContributorCrmPath(window.location.pathname)) {
    throw new Error(
      "Contributor service auth is only available on contributor CRM pages."
    );
  }
}

function isXanoUrl(url: string): boolean {
  try {
    return new URL(url).origin === XANO_ORIGIN;
  } catch {
    return url.startsWith(XANO_ORIGIN);
  }
}

/**
 * Fetch Xano data for public contributor CRM pages via server-side cron auth.
 * Never calls Xano directly from the browser, so 401s cannot log the main app out.
 */
export async function contributorFetch(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  assertContributorPageContext();

  if (!isXanoUrl(url)) {
    return fetch(url, init);
  }

  const method = String(init.method || "GET").toUpperCase();
  let body: string | undefined;
  if (init.body != null) {
    if (typeof init.body === "string") {
      body = init.body;
    } else if (init.body instanceof URLSearchParams) {
      body = init.body.toString();
    } else {
      throw new Error("Unsupported request body for contributor service fetch");
    }
  }

  const headers = new Headers(init.headers);

  return fetch(PROXY_PATH, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      method,
      body,
      contentType: headers.get("Content-Type"),
    }),
  });
}

export async function contributorFetchJson<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await contributorFetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}
