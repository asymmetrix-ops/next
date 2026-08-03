import { cookies } from "next/headers";
import { extractAuthToken } from "@/lib/mcpGuestAuthServer";

export const AUTH_TOKEN_COOKIE = "asymmetrix_auth_token";
export const AZURE_SSO_STATE_COOKIE = "azure_sso_state";
export const AZURE_SSO_NEXT_COOKIE = "azure_sso_next";

const AZURE_SCOPES = ["openid", "profile", "email", "User.Read", "offline_access"];

type AzureSsoConfig = {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
  xanoCallbackUrl: string;
};

type AzureTokenResponse = {
  access_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

type AzureProfile = {
  id?: string;
  displayName?: string;
  givenName?: string;
  surname?: string;
  mail?: string;
  userPrincipalName?: string;
};

export function getAppBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (configured) return configured.replace(/\/$/, "");
  return "http://localhost:3001";
}

export function getAzureRedirectUri(): string {
  const configured = process.env.AZURE_AD_REDIRECT_URI?.trim();
  if (configured) return configured;
  return `${getAppBaseUrl()}/api/auth/callback/azure-ad`;
}

export function getAzureSsoConfig(): AzureSsoConfig | null {
  const clientId = process.env.AZURE_AD_CLIENT_ID?.trim();
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET?.trim();
  const tenantId = process.env.AZURE_AD_TENANT_ID?.trim() || "common";

  if (!clientId || !clientSecret) return null;

  const apiUrl =
    process.env.NEXT_PUBLIC_XANO_API_URL ||
    "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6:develop";

  const xanoCallbackUrl =
    process.env.XANO_AZURE_SSO_CALLBACK_URL?.trim() ||
    `${apiUrl.replace(/\/$/, "")}/auth/azure/callback`;

  return {
    clientId,
    clientSecret,
    tenantId,
    redirectUri: getAzureRedirectUri(),
    xanoCallbackUrl,
  };
}

export function buildAzureAuthorizeUrl(state: string): string {
  const config = getAzureSsoConfig();
  if (!config) {
    throw new Error("Azure SSO is not configured");
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    response_mode: "query",
    scope: AZURE_SCOPES.join(" "),
    state,
  });

  return `https://login.microsoftonline.com/${encodeURIComponent(
    config.tenantId
  )}/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function exchangeAzureAuthorizationCode(
  code: string
): Promise<AzureTokenResponse> {
  const config = getAzureSsoConfig();
  if (!config) {
    throw new Error("Azure SSO is not configured");
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    scope: AZURE_SCOPES.join(" "),
  });

  const response = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(
      config.tenantId
    )}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      cache: "no-store",
    }
  );

  const data = (await response.json().catch(() => null)) as AzureTokenResponse | null;
  if (!response.ok || !data) {
    const message =
      data?.error_description ||
      data?.error ||
      `Azure token exchange failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

export async function fetchAzureProfile(
  accessToken: string
): Promise<AzureProfile> {
  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as AzureProfile | null;
  if (!response.ok || !data) {
    throw new Error("Unable to load Microsoft profile");
  }

  return data;
}

export async function exchangeAzureSsoWithXano(input: {
  code: string;
  accessToken?: string;
  idToken?: string;
  profile?: AzureProfile;
}): Promise<{ token: string; user: Record<string, unknown> | null }> {
  const config = getAzureSsoConfig();
  if (!config) {
    throw new Error("Azure SSO is not configured");
  }

  const profile = input.profile;
  const email =
    profile?.mail?.trim().toLowerCase() ||
    profile?.userPrincipalName?.trim().toLowerCase() ||
    "";

  const response = await fetch(config.xanoCallbackUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code: input.code,
      redirect_uri: config.redirectUri,
      access_token: input.accessToken,
      id_token: input.idToken,
      email,
      name:
        profile?.displayName?.trim() ||
        [profile?.givenName, profile?.surname].filter(Boolean).join(" ").trim(),
      microsoft_id: profile?.id,
    }),
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : "Azure SSO login failed";
    throw new Error(message);
  }

  const token = extractAuthToken(data);
  if (!token) {
    throw new Error("Azure SSO login did not return an auth token");
  }

  const user =
    data && typeof data === "object" && "user" in data
      ? ((data as { user?: unknown }).user as Record<string, unknown> | null)
      : null;

  return { token, user };
}

export function createSsoState(): string {
  return crypto.randomUUID();
}

export function setAzureSsoCookies(state: string, nextPath?: string): void {
  const cookieStore = cookies();
  const secure = process.env.NODE_ENV === "production";

  cookieStore.set(AZURE_SSO_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 10 * 60,
  });

  if (nextPath) {
    cookieStore.set(AZURE_SSO_NEXT_COOKIE, nextPath, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 10 * 60,
    });
  }
}

export function readAzureSsoState(): string | null {
  return cookies().get(AZURE_SSO_STATE_COOKIE)?.value ?? null;
}

export function readAzureSsoNextPath(): string {
  const nextPath = cookies().get(AZURE_SSO_NEXT_COOKIE)?.value;
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/home-user";
  }
  return nextPath;
}

export function clearAzureSsoCookies(): void {
  const cookieStore = cookies();
  cookieStore.delete(AZURE_SSO_STATE_COOKIE);
  cookieStore.delete(AZURE_SSO_NEXT_COOKIE);
}

export function buildAuthCookieHeader(token: string): string {
  const maxAge = 7 * 24 * 60 * 60;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${AUTH_TOKEN_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}
