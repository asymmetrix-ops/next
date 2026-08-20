import { authService, isTokenExpired } from "@/lib/contributorCrm/auth";

const PROXY_PATH = "/contributor-crm/api/xano-proxy";

export function getValidContributorAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = authService.getAuthToken();
  if (!token || isTokenExpired(token)) return null;
  return token;
}

export async function contributorFetch(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = getValidContributorAuthToken();
  const headers = new Headers(init.headers);
  headers.delete("Authorization");
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(url, { ...init, headers });
    if (response.status !== 401) {
      return response;
    }
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
