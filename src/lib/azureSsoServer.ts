import { extractAuthToken } from "@/lib/mcpGuestAuthServer";

export const AUTH_TOKEN_COOKIE = "asymmetrix_auth_token";
export const AZURE_OAUTH_STATE_COOKIE = "azure_oauth_state";

export const AZURE_SCOPES = "openid profile email User.Read";

export const DEFAULT_XANO_AZURE_SSO_CALLBACK_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6/auth/azure/callback";

type AzureTokenResponse = {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type AzureProfile = {
  id?: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
};

export function getAzureSsoConfigStatus(): {
  configured: boolean;
  missing: string[];
  present: string[];
} {
  const required = [
    "AZURE_AD_CLIENT_ID",
    "AZURE_AD_CLIENT_SECRET",
    "AZURE_AD_TENANT_ID",
    "AZURE_AD_REDIRECT_URI",
  ] as const;

  const missing = required.filter((key) => !process.env[key]?.trim());
  const present = required.filter((key) => Boolean(process.env[key]?.trim()));

  return {
    configured: missing.length === 0,
    missing: [...missing],
    present: [...present],
  };
}

export function getAzureRedirectUri(): string {
  const configured = process.env.AZURE_AD_REDIRECT_URI?.trim();
  if (!configured) {
    throw new Error("AZURE_AD_REDIRECT_URI is not configured");
  }
  return configured;
}

export function getAzureSsoCallbackUrl(): string {
  const configured = process.env.XANO_AZURE_SSO_CALLBACK_URL?.trim();
  if (configured) return configured;

  const xanoBaseUrl = process.env.XANO_BASE_URL?.trim();
  if (xanoBaseUrl) {
    return `${xanoBaseUrl.replace(/\/$/, "")}/auth/azure/callback`;
  }

  return DEFAULT_XANO_AZURE_SSO_CALLBACK_URL;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function buildAzureAuthorizeUrl(state: string): string {
  const status = getAzureSsoConfigStatus();
  if (!status.configured) {
    throw new Error(
      `Azure SSO is not configured. Missing: ${status.missing.join(", ")}`
    );
  }

  const tenantId = process.env.AZURE_AD_TENANT_ID!.trim();
  const clientId = process.env.AZURE_AD_CLIENT_ID!.trim();

  const authorizeUrl = new URL(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`
  );

  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("redirect_uri", getAzureRedirectUri());
  authorizeUrl.searchParams.set("response_mode", "query");
  authorizeUrl.searchParams.set("scope", AZURE_SCOPES);
  authorizeUrl.searchParams.set("state", state);

  return authorizeUrl.toString();
}

export async function exchangeAzureAuthorizationCode(
  code: string
): Promise<AzureTokenResponse> {
  const tenantId = process.env.AZURE_AD_TENANT_ID?.trim();
  const clientId = process.env.AZURE_AD_CLIENT_ID?.trim();
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET?.trim();

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Azure SSO is not configured");
  }

  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: getAzureRedirectUri(),
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    }
  );

  const data = (await response.json().catch(() => null)) as AzureTokenResponse | null;
  if (!response.ok || !data) {
    console.error("Azure token exchange failed:", data);
    throw new Error("token_exchange");
  }

  return data;
}

export async function fetchAzureProfile(
  accessToken: string
): Promise<AzureProfile> {
  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("graph_profile");
  }

  return response.json();
}

export function decodeAzureTenantIdFromIdToken(
  idToken?: string
): string | null {
  if (!idToken) return null;

  try {
    const payload = idToken.split(".")[1];
    if (!payload) return null;

    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as { tid?: string };

    return decoded.tid ?? null;
  } catch {
    return null;
  }
}

export async function syncAzureSsoWithXano(input: {
  email: string;
  name?: string;
  azureOid?: string;
  azureTenantId?: string | null;
}): Promise<string> {
  const response = await fetch(getAzureSsoCallbackUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email || "",
      name: input.name || "",
      azure_oid: input.azureOid || "",
      azure_tenant_id: input.azureTenantId || "",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    console.error("Xano SSO sync failed:", errText);
    throw new Error("sso_sync");
  }

  const data = await response.json().catch(() => null);
  const authToken = extractAuthToken(data);

  if (!authToken) {
    throw new Error("sso_sync");
  }

  return authToken;
}

export const AZURE_SSO_ERROR_MESSAGES: Record<string, string> = {
  azure_config: "Microsoft sign-in is not configured.",
  azure_denied: "Microsoft sign-in was cancelled or denied.",
  state_mismatch: "Sign-in session expired. Please try again.",
  token_exchange: "Microsoft sign-in failed during token exchange.",
  graph_profile: "Unable to load your Microsoft profile.",
  sso_sync: "Unable to complete sign-in with Asymmetrix.",
};
