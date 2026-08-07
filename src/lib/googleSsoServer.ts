import { extractAuthToken } from "@/lib/mcpGuestAuthServer";
import { AUTH_TOKEN_COOKIE, isProduction } from "@/lib/azureSsoServer";

export { AUTH_TOKEN_COOKIE, isProduction };

export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";

export const GOOGLE_SCOPES = "openid email profile";

export const DEFAULT_XANO_GOOGLE_SSO_CALLBACK_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6/auth/sso/callback";

type GoogleTokenResponse = {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleProfile = {
  sub?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  hd?: string;
};

export function getGoogleSsoConfigStatus(): {
  configured: boolean;
  missing: string[];
  present: string[];
  debug: Record<string, { defined: boolean; length: number }>;
} {
  const required = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] as const;

  const debug = Object.fromEntries(
    [...required, "GOOGLE_REDIRECT_URI" as const].map((key) => [
      key,
      {
        defined: process.env[key] !== undefined,
        length: process.env[key]?.length ?? 0,
      },
    ])
  );

  const missing = required.filter((key) => !process.env[key]?.trim());
  const present: string[] = required.filter((key) =>
    Boolean(process.env[key]?.trim())
  );

  if (process.env.GOOGLE_REDIRECT_URI?.trim()) {
    present.push("GOOGLE_REDIRECT_URI");
  }

  return {
    configured: missing.length === 0,
    missing: [...missing],
    present: [...present],
    debug,
  };
}

export function getGoogleRedirectUri(requestUrl?: string): string {
  if (requestUrl) {
    return `${new URL(requestUrl).origin}/api/auth/callback/google`;
  }

  const configured = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (configured) {
    return configured;
  }

  throw new Error("GOOGLE_REDIRECT_URI is not configured");
}

export function getGoogleSsoCallbackUrl(): string {
  const configured = process.env.XANO_GOOGLE_SSO_CALLBACK_URL?.trim();
  if (configured) return configured;

  const xanoBaseUrl = process.env.XANO_BASE_URL?.trim();
  if (xanoBaseUrl) {
    return `${xanoBaseUrl.replace(/\/$/, "")}/auth/sso/callback`;
  }

  return DEFAULT_XANO_GOOGLE_SSO_CALLBACK_URL;
}

export function buildGoogleAuthorizeUrl(state: string, requestUrl?: string): string {
  const status = getGoogleSsoConfigStatus();
  if (!status.configured) {
    throw new Error(
      `Google SSO is not configured. Missing: ${status.missing.join(", ")}`
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!.trim();
  const redirectUri = getGoogleRedirectUri(requestUrl);

  const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", GOOGLE_SCOPES);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("access_type", "online");
  authorizeUrl.searchParams.set("prompt", "select_account");

  return authorizeUrl.toString();
}

export async function exchangeGoogleAuthorizationCode(
  code: string,
  requestUrl?: string
): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = getGoogleRedirectUri(requestUrl);

  if (!clientId || !clientSecret) {
    throw new Error("Google SSO is not configured");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as GoogleTokenResponse | null;
  if (!response.ok || !data) {
    console.error("Google token exchange failed:", data);
    throw new Error("token_exchange");
  }

  return data;
}

export async function fetchGoogleProfile(
  accessToken: string
): Promise<GoogleProfile> {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("google_profile");
  }

  return response.json();
}

export async function syncGoogleSsoWithXano(input: {
  email: string;
  name?: string;
  providerUid?: string;
  hostedDomain?: string | null;
}): Promise<string> {
  const response = await fetch(getGoogleSsoCallbackUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: "google",
      email: input.email || "",
      name: input.name || "",
      provider_uid: input.providerUid || "",
      hosted_domain: input.hostedDomain || "",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    console.error("Xano Google SSO sync failed:", errText);
    throw new Error("sso_sync");
  }

  const data = await response.json().catch(() => null);
  const authToken = extractAuthToken(data);

  if (!authToken) {
    throw new Error("sso_sync");
  }

  return authToken;
}

export const GOOGLE_SSO_ERROR_MESSAGES: Record<string, string> = {
  google_config: "Google sign-in is not configured.",
  google_denied: "Google sign-in was cancelled or denied.",
  state_mismatch: "Sign-in session expired. Please try again.",
  token_exchange: "Google sign-in failed during token exchange.",
  google_profile: "Unable to load your Google profile.",
  sso_sync: "Unable to complete sign-in with Asymmetrix.",
};
